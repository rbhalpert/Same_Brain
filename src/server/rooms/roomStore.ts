import { buildRevealGroups } from "../../shared/grouping.js";
import { PROMPTS } from "../../shared/prompts.js";
import { createHostView, createPlayerView } from "../../shared/roomViews.js";
import { buildLeaderboard, computeRoundScores } from "../../shared/scoring.js";
import type {
  ActionResponse,
  HostView,
  PlayerRecord,
  PlayerView,
  RoomError,
  RoomModel
} from "../../shared/types.js";

const ROOM_CODE_LENGTH = 4;
const CLASSIC_TOTAL_ROUNDS = 8;
const ROUND_INTRO_DURATION_MS = 4_000;
const ROUND_DURATION_MS = 45_000;
const MAX_ROOM_CODE_ATTEMPTS = 128;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export interface RoomStoreOptions {
  now?: () => number;
  random?: () => number;
  promptPool?: readonly string[];
  codeFactory?: () => string;
  hostTokenFactory?: () => string;
  idFactory?: () => string;
}

export type JoinRoomResult =
  | {
      ok: true;
      player: PlayerRecord;
    }
  | {
      ok: false;
      error: RoomError;
    };

function createError(code: RoomError["code"], message: string): RoomError {
  return { code, message };
}

function success(): ActionResponse {
  return { ok: true };
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

export function randomRoomCode(random: () => number = Math.random): string {
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const letterIndex = Math.floor(random() * LETTERS.length);
    code += LETTERS[letterIndex];
  }

  return code;
}

function createIdFactory() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return () => crypto.randomUUID();
  }

  return () => `player-${Math.random().toString(36).slice(2, 10)}`;
}

function createHostTokenFactory() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return () => crypto.randomUUID();
  }

  return () => `host-${Math.random().toString(36).slice(2, 12)}`;
}

function sanitizeName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    return undefined;
  }

  return trimmed;
}

export class RoomStore {
  private readonly rooms = new Map<string, RoomModel>();

  private readonly now: () => number;

  private readonly promptPool: readonly string[];

  private readonly random: () => number;

  private readonly codeFactory: () => string;

  private readonly hostTokenFactory: () => string;

  private readonly idFactory: () => string;

  constructor(options: RoomStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.promptPool = options.promptPool ?? PROMPTS;
    this.random = options.random ?? (() => Math.random());
    this.codeFactory =
      options.codeFactory ?? (() => randomRoomCode(this.random));
    this.hostTokenFactory =
      options.hostTokenFactory ?? createHostTokenFactory();
    this.idFactory = options.idFactory ?? createIdFactory();
  }

  createRoom(): RoomModel {
    const code = this.generateUniqueRoomCode();
    const room: RoomModel = {
      code,
      phase: "lobby",
      players: [],
      hostPlayerId: "",
      hostSessionToken: this.hostTokenFactory(),
      roundNumber: 0,
      totalRounds: CLASSIC_TOTAL_ROUNDS,
      answersByPlayerId: {},
      roundParticipantIds: []
    };

    this.rooms.set(code, room);
    return room;
  }

  createRoomWithHost(name: string):
    | {
        ok: true;
        room: RoomModel;
        player: PlayerRecord;
      }
    | {
        ok: false;
        error: RoomError;
      } {
    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      return {
        ok: false,
        error: createError(
          "INVALID_NAME",
          "Names must be between 1 and 20 characters."
        )
      };
    }

    const room = this.createRoom();
    const player: PlayerRecord = {
      id: this.idFactory(),
      name: sanitizedName,
      connected: true,
      hasSubmitted: false,
      totalScore: 0
    };

    room.players.push(player);
    room.hostPlayerId = player.id;

    return {
      ok: true,
      room,
      player
    };
  }

  resumeHost(
    roomCode: string,
    hostToken: string
  ):
    | {
        ok: true;
        room: RoomModel;
        player: PlayerRecord;
      }
    | {
        ok: false;
        error: RoomError;
      } {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        ok: false,
        error: createError("INVALID_ROOM", "That room code does not exist.")
      };
    }

    if (!hostToken || room.hostSessionToken !== hostToken) {
      return {
        ok: false,
        error: createError(
          "INVALID_HOST_SESSION",
          "This host session can no longer be restored."
        )
      };
    }

    const player = room.players.find((entry) => entry.id === room.hostPlayerId);
    if (!player) {
      return {
        ok: false,
        error: createError(
          "INVALID_HOST_SESSION",
          "This host player is no longer available."
        )
      };
    }

    player.connected = true;

    return {
      ok: true,
      room,
      player
    };
  }

  getRoom(roomCode: string): RoomModel | undefined {
    return this.rooms.get(normalizeRoomCode(roomCode));
  }

  getHostView(roomCode: string): HostView | undefined {
    const room = this.getRoom(roomCode);
    return room ? createHostView(room) : undefined;
  }

  getPlayerView(roomCode: string, playerId: string): PlayerView | undefined {
    const room = this.getRoom(roomCode);
    return room ? createPlayerView(room, playerId) : undefined;
  }

  joinRoom(
    roomCode: string,
    name: string
  ): JoinRoomResult {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        ok: false,
        error: createError("INVALID_ROOM", "That room code does not exist.")
      };
    }

    if (room.phase !== "lobby") {
      return {
        ok: false,
        error: createError(
          "ROOM_NOT_JOINABLE",
          "This room has already started the round."
        )
      };
    }

    const sanitizedName = sanitizeName(name);
    if (!sanitizedName) {
      return {
        ok: false,
        error: createError(
          "INVALID_NAME",
          "Names must be between 1 and 20 characters."
        )
      };
    }

    const duplicatePlayer = room.players.find(
      (player) => player.name.toLowerCase() === sanitizedName.toLowerCase()
    );
    if (duplicatePlayer) {
      return {
        ok: false,
        error: createError(
          "DUPLICATE_NAME",
          "That name is already taken in this room."
        )
      };
    }

    const player: PlayerRecord = {
      id: this.idFactory(),
      name: sanitizedName,
      connected: true,
      hasSubmitted: false,
      totalScore: 0
    };

    room.players.push(player);
    return {
      ok: true,
      player
    };
  }

  startRound(roomCode: string): ActionResponse {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        ok: false,
        error: createError("INVALID_ROOM", "That room code does not exist.")
      };
    }

    const connectedPlayers = room.players.filter((player) => player.connected);
    if (room.phase !== "lobby" || connectedPlayers.length < 2) {
      return {
        ok: false,
        error: createError(
          "ROUND_NOT_STARTABLE",
          "At least two connected players are needed to start."
        )
      };
    }

    this.beginRound(room, connectedPlayers.map((player) => player.id));
    return success();
  }

  advancePhase(roomCode: string): ActionResponse {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        ok: false,
        error: createError("INVALID_ROOM", "That room code does not exist.")
      };
    }

    if (room.phase === "revealing") {
      this.openScoring(room);
      return success();
    }

    if (room.phase === "scoring") {
      if (room.roundNumber >= room.totalRounds) {
        this.openFinalResults(room);
      } else {
        this.openLeaderboard(room);
      }

      return success();
    }

    if (room.phase === "leaderboard") {
      const connectedPlayers = room.players.filter((player) => player.connected);
      if (connectedPlayers.length < 2) {
        return {
          ok: false,
          error: createError(
            "ROUND_NOT_STARTABLE",
            "At least two connected players are needed to start."
          )
        };
      }

      this.beginRound(room, connectedPlayers.map((player) => player.id));
      return success();
    }

    return {
      ok: false,
      error: createError(
        "PHASE_ADVANCE_NOT_ALLOWED",
        "This phase cannot be advanced from the host right now."
      )
    };
  }

  rematch(roomCode: string): ActionResponse {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        ok: false,
        error: createError("INVALID_ROOM", "That room code does not exist.")
      };
    }

    if (room.phase !== "final_results") {
      return {
        ok: false,
        error: createError(
          "PHASE_ADVANCE_NOT_ALLOWED",
          "A new game can only start after final results."
        )
      };
    }

    this.resetRoomForRematch(room);
    return success();
  }

  submitAnswer(roomCode: string, playerId: string, answer: string): ActionResponse {
    const room = this.getRoom(roomCode);
    if (!room) {
      return {
        ok: false,
        error: createError("INVALID_ROOM", "That room code does not exist.")
      };
    }

    if (room.phase !== "answering") {
      return {
        ok: false,
        error: createError(
          "SUBMISSION_CLOSED",
          "This round is not accepting answers right now."
        )
      };
    }

    const player = room.players.find((entry) => entry.id === playerId);
    if (!player || !room.roundParticipantIds.includes(playerId)) {
      return {
        ok: false,
        error: createError(
          "SUBMISSION_CLOSED",
          "This player is not active in the current round."
        )
      };
    }

    if (room.answerDeadlineAt && room.answerDeadlineAt <= this.now()) {
      this.closeRound(room);
      return {
        ok: false,
        error: createError(
          "SUBMISSION_CLOSED",
          "The answer timer has already expired."
        )
      };
    }

    if (player.hasSubmitted) {
      return {
        ok: false,
        error: createError(
          "ALREADY_SUBMITTED",
          "That answer is already locked in."
        )
      };
    }

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer) {
      return {
        ok: false,
        error: createError(
          "INVALID_ANSWER",
          "Answers must contain at least one visible character."
        )
      };
    }

    room.answersByPlayerId[playerId] = trimmedAnswer;
    player.hasSubmitted = true;
    this.maybeCloseRound(room);
    return success();
  }

  disconnectPlayer(roomCode: string, playerId: string): boolean {
    const room = this.getRoom(roomCode);
    if (!room) {
      return false;
    }

    const player = room.players.find((entry) => entry.id === playerId);
    if (!player) {
      return false;
    }

    player.connected = false;
    this.maybeCloseRound(room);
    return true;
  }

  advanceExpiredRounds(): string[] {
    const updatedRooms: string[] = [];

    for (const room of this.rooms.values()) {
      if (
        room.phase === "round_intro" &&
        room.roundIntroEndsAt !== undefined &&
        room.roundIntroEndsAt <= this.now()
      ) {
        this.openAnswering(room);
        updatedRooms.push(room.code);
        continue;
      }

      if (
        room.phase === "answering" &&
        room.answerDeadlineAt !== undefined &&
        room.answerDeadlineAt <= this.now()
      ) {
        this.closeRound(room);
        updatedRooms.push(room.code);
      }
    }

    return updatedRooms;
  }

  private beginRound(room: RoomModel, roundParticipantIds: string[]) {
    room.roundNumber += 1;
    room.phase = "round_intro";
    room.currentPrompt = this.pickPrompt();
    room.roundIntroEndsAt = this.now() + ROUND_INTRO_DURATION_MS;
    room.answerDeadlineAt = undefined;
    room.answersByPlayerId = {};
    room.roundParticipantIds = roundParticipantIds;
    room.roundSummary = undefined;
    room.revealGroups = undefined;
    room.roundScores = undefined;
    room.leaderboardEntries = undefined;

    for (const player of room.players) {
      player.hasSubmitted = false;
    }
  }

  private resetRoomForRematch(room: RoomModel) {
    room.phase = "lobby";
    room.roundNumber = 0;
    room.currentPrompt = undefined;
    room.roundIntroEndsAt = undefined;
    room.answerDeadlineAt = undefined;
    room.answersByPlayerId = {};
    room.roundParticipantIds = [];
    room.roundSummary = undefined;
    room.revealGroups = undefined;
    room.roundScores = undefined;
    room.leaderboardEntries = undefined;
    room.players = room.players.map((player) => ({
      ...player,
      hasSubmitted: false,
      totalScore: 0
    }));
  }

  private generateUniqueRoomCode(): string {
    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      const candidate = normalizeRoomCode(this.codeFactory());
      if (!candidate || candidate.length !== ROOM_CODE_LENGTH) {
        continue;
      }

      if (!this.rooms.has(candidate)) {
        return candidate;
      }
    }

    throw new Error("Unable to generate a unique room code.");
  }

  private pickPrompt(): string {
    const promptIndex = Math.floor(this.random() * this.promptPool.length);
    return this.promptPool[promptIndex] ?? this.promptPool[0];
  }

  private openAnswering(room: RoomModel) {
    room.phase = "answering";
    room.roundIntroEndsAt = undefined;
    room.answerDeadlineAt = this.now() + ROUND_DURATION_MS;
  }

  private openScoring(room: RoomModel) {
    room.phase = "scoring";
    const roundScores = computeRoundScores({
      answersByPlayerId: room.answersByPlayerId,
      players: room.players,
      revealGroups: room.revealGroups ?? [],
      roundParticipantIds: room.roundParticipantIds
    });

    const pointsByPlayerId = new Map(
      roundScores.map((roundScore) => [roundScore.playerId, roundScore.pointsEarned])
    );

    room.players = room.players.map((player) => ({
      ...player,
      totalScore: player.totalScore + (pointsByPlayerId.get(player.id) ?? 0)
    }));

    room.roundScores = roundScores.map((roundScore) => ({
      ...roundScore,
      totalScore:
        room.players.find((player) => player.id === roundScore.playerId)?.totalScore ??
        roundScore.totalScore
    }));
    room.leaderboardEntries = buildLeaderboard(room.players, room.roundScores);
  }

  private openLeaderboard(room: RoomModel) {
    room.phase = "leaderboard";
  }

  private openFinalResults(room: RoomModel) {
    room.phase = "final_results";
  }

  private maybeCloseRound(room: RoomModel): boolean {
    if (room.phase !== "answering") {
      return false;
    }

    const activeParticipantIds = room.roundParticipantIds.filter((playerId) => {
      const player = room.players.find((entry) => entry.id === playerId);
      return Boolean(room.answersByPlayerId[playerId]) || Boolean(player?.connected);
    });

    if (
      activeParticipantIds.length > 0 &&
      activeParticipantIds.every((playerId) => Boolean(room.answersByPlayerId[playerId]))
    ) {
      this.closeRound(room);
      return true;
    }

    return false;
  }

  private closeRound(room: RoomModel) {
    room.phase = "revealing";
    room.roundIntroEndsAt = undefined;
    room.answerDeadlineAt = undefined;
    room.revealGroups = buildRevealGroups(
      room.roundParticipantIds
        .map((playerId) => {
          const player = room.players.find((entry) => entry.id === playerId);
          const submittedAnswer = room.answersByPlayerId[playerId];

          if (!player || !submittedAnswer) {
            return undefined;
          }

          return {
            playerId,
            playerName: player.name,
            submittedAnswer
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    );

    const submittedCount = room.roundParticipantIds.filter(
      (playerId) => room.answersByPlayerId[playerId]
    ).length;
    const totalPlayers = room.roundParticipantIds.filter((playerId) => {
      const player = room.players.find((entry) => entry.id === playerId);
      return Boolean(room.answersByPlayerId[playerId]) || Boolean(player?.connected);
    }).length;

    room.roundSummary = {
      submittedCount,
      totalPlayers
    };
  }
}
