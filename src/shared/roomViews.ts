import type {
  HostView,
  LeaderboardEntry,
  PlayerRevealResult,
  PlayerView,
  RoomModel,
  RoundScoreEntry,
  RoundSummary
} from "./types.js";

function calculateLiveSummary(room: RoomModel): RoundSummary {
  if (room.phase === "lobby") {
    return {
      submittedCount: 0,
      totalPlayers: room.players.filter((player) => player.connected).length
    };
  }

  if (room.roundSummary) {
    return room.roundSummary;
  }

  const submittedCount = room.roundParticipantIds.filter(
    (playerId) => room.answersByPlayerId[playerId]
  ).length;
  const totalPlayers = room.roundParticipantIds.filter((playerId) => {
    const player = room.players.find((entry) => entry.id === playerId);
    return Boolean(room.answersByPlayerId[playerId]) || Boolean(player?.connected);
  }).length;

  return {
    submittedCount,
    totalPlayers
  };
}

function createPlayerRevealResult(
  room: RoomModel,
  playerId: string
): PlayerRevealResult | undefined {
  if (room.phase !== "revealing") {
    return undefined;
  }

  const submittedAnswer = room.answersByPlayerId[playerId];
  const revealGroup = room.revealGroups?.find((group) =>
    group.players.some((player) => player.playerId === playerId)
  );

  return {
    groupDisplayAnswer: revealGroup?.displayAnswer,
    submittedAnswer,
    groupSize: revealGroup?.answerCount ?? 0,
    matchedPlayerNames:
      revealGroup?.players
        .filter((player) => player.playerId !== playerId)
        .map((player) => player.playerName) ?? [],
    wasMatched: (revealGroup?.answerCount ?? 0) > 1
  };
}

function createPlayerRoundScoreResult(
  room: RoomModel,
  playerId: string
): RoundScoreEntry | undefined {
  if (
    room.phase !== "scoring" &&
    room.phase !== "leaderboard" &&
    room.phase !== "final_results"
  ) {
    return undefined;
  }

  return room.roundScores?.find((roundScore) => roundScore.playerId === playerId);
}

function createPlayerLeaderboardEntry(
  room: RoomModel,
  playerId: string
): LeaderboardEntry | undefined {
  if (
    room.phase !== "leaderboard" &&
    room.phase !== "final_results"
  ) {
    return undefined;
  }

  return room.leaderboardEntries?.find(
    (leaderboardEntry) => leaderboardEntry.playerId === playerId
  );
}

export function createHostView(room: RoomModel): HostView {
  const summary = calculateLiveSummary(room);

  return {
    kind: "host",
    code: room.code,
    phase: room.phase,
    players: room.players.map((player) => ({
      ...player,
      connected: player.id === room.hostPlayerId ? true : player.connected
    })),
    roundNumber: room.roundNumber,
    totalRounds: room.totalRounds,
    currentPrompt: room.currentPrompt,
    roundIntroEndsAt: room.roundIntroEndsAt,
    answerDeadlineAt: room.answerDeadlineAt,
    submittedCount: summary.submittedCount,
    totalPlayers: summary.totalPlayers,
    roundSummary: room.phase === "revealing" ? summary : undefined,
    revealGroups: room.phase === "revealing" ? room.revealGroups : undefined,
    roundScores:
      room.phase === "scoring" ||
      room.phase === "leaderboard" ||
      room.phase === "final_results"
        ? room.roundScores
        : undefined,
    leaderboardEntries:
      room.phase === "scoring" ||
      room.phase === "leaderboard" ||
      room.phase === "final_results"
        ? room.leaderboardEntries
        : undefined
  };
}

export function createPlayerView(
  room: RoomModel,
  playerId: string
): PlayerView | undefined {
  const self = room.players.find((player) => player.id === playerId);
  if (!self) {
    return undefined;
  }

  const summary = calculateLiveSummary(room);

  return {
    kind: "player",
    code: room.code,
    phase: room.phase,
    roundNumber: room.roundNumber,
    totalRounds: room.totalRounds,
    players: room.players.map(({ id, name, connected }) => ({
      id,
      name,
      connected
    })),
    self: {
      id: self.id,
      name: self.name,
      connected: self.connected,
      hasSubmitted: self.hasSubmitted,
      submittedAnswer: room.answersByPlayerId[playerId]
    },
    currentPrompt: room.currentPrompt,
    roundIntroEndsAt: room.roundIntroEndsAt,
    answerDeadlineAt: room.answerDeadlineAt,
    submittedCount: summary.submittedCount,
    totalPlayers: summary.totalPlayers,
    roundSummary: room.phase === "revealing" ? summary : undefined,
    revealResult: createPlayerRevealResult(room, playerId),
    roundScoreResult: createPlayerRoundScoreResult(room, playerId),
    leaderboardEntry: createPlayerLeaderboardEntry(room, playerId)
  };
}
