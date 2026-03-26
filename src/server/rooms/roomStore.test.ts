import { describe, expect, it } from "vitest";

import { createHostView, createPlayerView } from "../../shared/roomViews.js";
import { RoomStore } from "./roomStore.js";

function createDeterministicStore(
  overrides: ConstructorParameters<typeof RoomStore>[0] = {}
) {
  return new RoomStore({
    now: () => 1_000,
    promptPool: ["Test prompt"],
    idFactory: (() => {
      let index = 0;
      return () => `player-${(index += 1).toString()}`;
    })(),
    ...overrides
  });
}

function expectJoinedPlayer(result: ReturnType<RoomStore["joinRoom"]>) {
  if (!result.ok) {
    throw new Error(`Expected join to succeed, received ${result.error.code}.`);
  }

  return result.player;
}

function joinPlayer(store: RoomStore, roomCode: string, name: string) {
  return expectJoinedPlayer(store.joinRoom(roomCode, name));
}

describe("RoomStore", () => {
  it("creates a room with a participating host player", () => {
    const store = createDeterministicStore({
      codeFactory: () => "HOST"
    });

    const createResult = store.createRoomWithHost("Alex");
    expect(createResult).toMatchObject({
      ok: true,
      room: {
        code: "HOST",
        players: [
          {
            name: "Alex",
            connected: true,
            hasSubmitted: false,
            totalScore: 0
          }
        ]
      },
      player: {
        name: "Alex",
        connected: true
      }
    });

    expect(store.createRoomWithHost("   ")).toMatchObject({
      ok: false,
      error: { code: "INVALID_NAME" }
    });
  });

  it("retries room code generation until it finds an unused code", () => {
    const codes = ["ABCD", "ABCD", "WXYZ"];
    const store = createDeterministicStore({
      codeFactory: () => codes.shift() ?? "LAST"
    });

    expect(store.createRoom().code).toBe("ABCD");
    expect(store.createRoom().code).toBe("WXYZ");
  });

  it("rejects missing rooms, blank names, and duplicate names", () => {
    const store = createDeterministicStore({
      codeFactory: () => "ROOM"
    });
    store.createRoom();

    expect(store.joinRoom("MISS", "Alex")).toMatchObject({
      ok: false,
      error: { code: "INVALID_ROOM" }
    });
    expect(store.joinRoom("ROOM", "   ")).toMatchObject({
      ok: false,
      error: { code: "INVALID_NAME" }
    });

    expect(store.joinRoom("ROOM", "Alex")).toMatchObject({
      ok: true,
      player: { name: "Alex" }
    });
    expect(store.joinRoom("ROOM", "alex")).toMatchObject({
      ok: false,
      error: { code: "DUPLICATE_NAME" }
    });
  });

  it("only starts rounds from the lobby with at least two connected players", () => {
    const store = createDeterministicStore({
      codeFactory: () => "PLAY"
    });
    const room = store.createRoom();

    expect(store.startRound(room.code)).toMatchObject({
      ok: false,
      error: { code: "ROUND_NOT_STARTABLE" }
    });

    joinPlayer(store, room.code, "Alex");
    joinPlayer(store, room.code, "Blair");

    const startResponse = store.startRound(room.code);
    expect(startResponse).toEqual({ ok: true });
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "round_intro",
      currentPrompt: "Test prompt",
      roundIntroEndsAt: 5_000
    });

    expect(store.startRound(room.code)).toMatchObject({
      ok: false,
      error: { code: "ROUND_NOT_STARTABLE" }
    });
  });

  it("advances from round intro into answering when the intro timer expires", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "INTR"
    });
    const room = store.createRoom();
    joinPlayer(store, room.code, "Alex");
    joinPlayer(store, room.code, "Blair");

    store.startRound(room.code);
    now = 5_001;

    expect(store.advanceExpiredRounds()).toEqual([room.code]);
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "answering",
      currentPrompt: "Test prompt",
      roundIntroEndsAt: undefined,
      answerDeadlineAt: 50_001
    });
  });

  it("rejects answer submission during round intro", () => {
    const store = createDeterministicStore({
      codeFactory: () => "WAIT"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    joinPlayer(store, room.code, "Blair");

    store.startRound(room.code);

    expect(store.submitAnswer(room.code, firstPlayer.id, "goose")).toMatchObject({
      ok: false,
      error: { code: "SUBMISSION_CLOSED" }
    });
  });

  it("accepts one non-blank answer per player", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "LOCK"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    joinPlayer(store, room.code, "Blair");

    store.startRound(room.code);
    now = 5_001;
    store.advanceExpiredRounds();

    expect(store.submitAnswer(room.code, firstPlayer.id, "   ")).toMatchObject({
      ok: false,
      error: { code: "INVALID_ANSWER" }
    });
    expect(store.submitAnswer(room.code, firstPlayer.id, " goose ")).toEqual({
      ok: true
    });
    expect(store.submitAnswer(room.code, firstPlayer.id, "owl")).toMatchObject({
      ok: false,
      error: { code: "ALREADY_SUBMITTED" }
    });
  });

  it("closes the round as soon as all connected players submit", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "FAST"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    const secondPlayer = joinPlayer(store, room.code, "Blair");

    store.startRound(room.code);
    now = 5_001;
    store.advanceExpiredRounds();
    store.submitAnswer(room.code, firstPlayer.id, "goose");
    expect(store.getRoom(room.code)?.phase).toBe("answering");

    store.submitAnswer(room.code, secondPlayer.id, "duck");
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "revealing",
      roundNumber: 1,
      roundSummary: {
        submittedCount: 2,
        totalPlayers: 2
      },
      revealGroups: [
        {
          displayAnswer: "duck",
          answerCount: 1
        },
        {
          displayAnswer: "goose",
          answerCount: 1
        }
      ]
    });
  });

  it("advances from revealing into scoring and updates cumulative totals", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "SCOR"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    const secondPlayer = joinPlayer(store, room.code, "Blair");
    const thirdPlayer = joinPlayer(store, room.code, "Casey");

    store.startRound(room.code);
    now = 5_001;
    store.advanceExpiredRounds();
    store.submitAnswer(room.code, firstPlayer.id, "goose");
    store.submitAnswer(room.code, secondPlayer.id, "goose");
    store.submitAnswer(room.code, thirdPlayer.id, "duck");

    expect(store.advancePhase(room.code)).toEqual({ ok: true });
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "scoring",
      roundScores: [
        {
          playerId: firstPlayer.id,
          pointsEarned: 2,
          totalScore: 2
        },
        {
          playerId: secondPlayer.id,
          pointsEarned: 2,
          totalScore: 2
        },
        {
          playerId: thirdPlayer.id,
          pointsEarned: 0,
          totalScore: 0
        }
      ],
      leaderboardEntries: [
        {
          playerId: firstPlayer.id,
          rank: 1,
          totalScore: 2
        },
        {
          playerId: secondPlayer.id,
          rank: 1,
          totalScore: 2
        },
        {
          playerId: thirdPlayer.id,
          rank: 3,
          totalScore: 0
        }
      ]
    });
  });

  it("moves through leaderboard and starts the next round with totals preserved", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "LEAD"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    const secondPlayer = joinPlayer(store, room.code, "Blair");

    store.startRound(room.code);
    now = 5_001;
    store.advanceExpiredRounds();
    store.submitAnswer(room.code, firstPlayer.id, "goose");
    store.submitAnswer(room.code, secondPlayer.id, "goose");
    store.advancePhase(room.code);

    expect(store.advancePhase(room.code)).toEqual({ ok: true });
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "leaderboard",
      roundNumber: 1,
      leaderboardEntries: [
        {
          playerId: firstPlayer.id,
          totalScore: 2
        },
        {
          playerId: secondPlayer.id,
          totalScore: 2
        }
      ]
    });

    expect(store.advancePhase(room.code)).toEqual({ ok: true });
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "round_intro",
      roundNumber: 2
    });
    expect(store.getRoom(room.code)?.players).toMatchObject([
      {
        id: firstPlayer.id,
        totalScore: 2
      },
      {
        id: secondPlayer.id,
        totalScore: 2
      }
    ]);
  });

  it("goes to final results after scoring round eight", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "FINL"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    const secondPlayer = joinPlayer(store, room.code, "Blair");

    const activeRoom = store.getRoom(room.code);
    if (!activeRoom) {
      throw new Error("Expected room to exist.");
    }

    activeRoom.roundNumber = 7;

    store.startRound(room.code);
    now = 5_001;
    store.advanceExpiredRounds();
    store.submitAnswer(room.code, firstPlayer.id, "goose");
    store.submitAnswer(room.code, secondPlayer.id, "goose");
    store.advancePhase(room.code);

    expect(store.advancePhase(room.code)).toEqual({ ok: true });
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "final_results",
      roundNumber: 8,
      leaderboardEntries: [
        {
          playerId: firstPlayer.id,
          totalScore: 2
        },
        {
          playerId: secondPlayer.id,
          totalScore: 2
        }
      ]
    });
  });

  it("rejects invalid host phase advances and rematches", () => {
    const store = createDeterministicStore({
      codeFactory: () => "NOPE"
    });
    const room = store.createRoom();

    expect(store.advancePhase(room.code)).toMatchObject({
      ok: false,
      error: { code: "PHASE_ADVANCE_NOT_ALLOWED" }
    });
    expect(store.rematch(room.code)).toMatchObject({
      ok: false,
      error: { code: "PHASE_ADVANCE_NOT_ALLOWED" }
    });
  });

  it("closes the round when the deadline expires", () => {
    let now = 5_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "TIME"
    });
    const room = store.createRoom();

    joinPlayer(store, room.code, "Alex");
    joinPlayer(store, room.code, "Blair");

    store.startRound(room.code);
    now = 9_001;
    expect(store.advanceExpiredRounds()).toEqual([room.code]);

    now = 54_002;

    expect(store.advanceExpiredRounds()).toEqual([room.code]);
    expect(store.getRoom(room.code)).toMatchObject({
      phase: "revealing",
      roundSummary: {
        submittedCount: 0,
        totalPlayers: 2
      }
    });
  });

  it("keeps reveal data scoped to the host board and personal player result", () => {
    let now = 1_000;
    const store = createDeterministicStore({
      now: () => now,
      codeFactory: () => "VIEW"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    const secondPlayer = joinPlayer(store, room.code, "Blair");
    const thirdPlayer = joinPlayer(store, room.code, "Casey");

    store.startRound(room.code);
    now = 5_001;
    store.advanceExpiredRounds();
    store.submitAnswer(room.code, firstPlayer.id, "goose");
    store.submitAnswer(room.code, secondPlayer.id, "goose");

    const activeRoom = store.getRoom(room.code);
    if (!activeRoom) {
      throw new Error("Expected room to exist.");
    }

    const hostView = createHostView(activeRoom);
    const answeringPlayerView = createPlayerView(activeRoom, secondPlayer.id);

    expect(JSON.stringify(hostView)).not.toContain("goose");
    expect(answeringPlayerView?.players[0]).not.toHaveProperty("hasSubmitted");
    expect(answeringPlayerView?.self.submittedAnswer).toBe("goose");

    store.submitAnswer(room.code, thirdPlayer.id, "duck");
    const revealedRoom = store.getRoom(room.code);
    if (!revealedRoom) {
      throw new Error("Expected revealed room to exist.");
    }

    const revealedHostView = createHostView(revealedRoom);
    const revealedPlayerView = createPlayerView(revealedRoom, secondPlayer.id);

    expect(revealedHostView.revealGroups).toMatchObject([
      {
        displayAnswer: "goose",
        answerCount: 2,
        isMatch: true,
        players: [{ playerName: "Alex" }, { playerName: "Blair" }]
      },
      {
        displayAnswer: "duck",
        answerCount: 1,
        isMatch: false,
        players: [{ playerName: "Casey" }]
      }
    ]);
    expect(revealedPlayerView).not.toHaveProperty("revealGroups");
    expect(revealedPlayerView?.revealResult).toMatchObject({
      submittedAnswer: "goose",
      groupDisplayAnswer: "goose",
      groupSize: 2,
      matchedPlayerNames: ["Alex"],
      wasMatched: true
    });

    expect(store.advancePhase(room.code)).toEqual({ ok: true });

    const scoringRoom = store.getRoom(room.code);
    if (!scoringRoom) {
      throw new Error("Expected scoring room to exist.");
    }

    const scoringHostView = createHostView(scoringRoom);
    const scoringPlayerView = createPlayerView(scoringRoom, secondPlayer.id);

    expect(scoringHostView.roundScores).toMatchObject([
      {
        playerId: firstPlayer.id,
        pointsEarned: 2
      },
      {
        playerId: secondPlayer.id,
        pointsEarned: 2
      },
      {
        playerId: thirdPlayer.id,
        pointsEarned: 0
      }
    ]);
    expect(scoringPlayerView?.roundScoreResult).toMatchObject({
      submittedAnswer: "goose",
      pointsEarned: 2,
      totalScore: 2
    });
  });

  it("resets to a fresh lobby on rematch while preserving the roster", () => {
    const store = createDeterministicStore({
      codeFactory: () => "AGAI"
    });
    const room = store.createRoom();
    const firstPlayer = joinPlayer(store, room.code, "Alex");
    const secondPlayer = joinPlayer(store, room.code, "Blair");

    const activeRoom = store.getRoom(room.code);
    if (!activeRoom) {
      throw new Error("Expected room to exist.");
    }

    activeRoom.phase = "final_results";
    activeRoom.roundNumber = 8;
    activeRoom.currentPrompt = "Test prompt";
    activeRoom.answersByPlayerId = {
      [firstPlayer.id]: "goose",
      [secondPlayer.id]: "duck"
    };
    activeRoom.roundParticipantIds = [firstPlayer.id, secondPlayer.id];
    activeRoom.roundSummary = {
      submittedCount: 2,
      totalPlayers: 2
    };
    activeRoom.roundScores = [
      {
        playerId: firstPlayer.id,
        playerName: "Alex",
        submittedAnswer: "goose",
        groupDisplayAnswer: "goose",
        groupSize: 1,
        matchedPlayerNames: [],
        pointsEarned: 0,
        totalScore: 7,
        wasMatched: false
      }
    ];
    activeRoom.leaderboardEntries = [
      {
        playerId: firstPlayer.id,
        playerName: "Alex",
        rank: 1,
        totalScore: 7,
        lastRoundPoints: 0
      }
    ];
    activeRoom.players = activeRoom.players.map((player) => ({
      ...player,
      hasSubmitted: true,
      totalScore: player.id === firstPlayer.id ? 7 : 4
    }));

    expect(store.rematch(room.code)).toEqual({ ok: true });

    const resetRoom = store.getRoom(room.code);
    if (!resetRoom) {
      throw new Error("Expected reset room to exist.");
    }

    expect(resetRoom).toMatchObject({
      phase: "lobby",
      roundNumber: 0,
      currentPrompt: undefined,
      roundIntroEndsAt: undefined,
      answerDeadlineAt: undefined,
      answersByPlayerId: {},
      roundParticipantIds: [],
      roundSummary: undefined,
      revealGroups: undefined,
      roundScores: undefined,
      leaderboardEntries: undefined,
      players: [
        {
          id: firstPlayer.id,
          totalScore: 0,
          hasSubmitted: false
        },
        {
          id: secondPlayer.id,
          totalScore: 0,
          hasSubmitted: false
        }
      ]
    });
  });
});
