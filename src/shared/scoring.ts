import type {
  LeaderboardEntry,
  PlayerRecord,
  RevealGroup,
  RoundScoreEntry
} from "./types.js";

interface ComputeRoundScoresInput {
  answersByPlayerId: Record<string, string>;
  players: PlayerRecord[];
  revealGroups: RevealGroup[];
  roundParticipantIds: string[];
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right);
}

export function computeRoundScores({
  answersByPlayerId,
  players,
  revealGroups,
  roundParticipantIds
}: ComputeRoundScoresInput): RoundScoreEntry[] {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const groupsByPlayerId = new Map<string, RevealGroup>();

  for (const group of revealGroups) {
    for (const player of group.players) {
      groupsByPlayerId.set(player.playerId, group);
    }
  }

  const roundScores = roundParticipantIds.reduce<RoundScoreEntry[]>(
    (scores, playerId) => {
      const player = playersById.get(playerId);
      if (!player) {
        return scores;
      }

      const revealGroup = groupsByPlayerId.get(playerId);
      const pointsEarned =
        revealGroup && revealGroup.answerCount > 1 ? revealGroup.answerCount : 0;

      scores.push({
        playerId,
        playerName: player.name,
        submittedAnswer: answersByPlayerId[playerId],
        groupDisplayAnswer: revealGroup?.displayAnswer,
        groupSize: revealGroup?.answerCount ?? 0,
        matchedPlayerNames:
          revealGroup?.players
            .filter((entry) => entry.playerId !== playerId)
            .map((entry) => entry.playerName) ?? [],
        pointsEarned,
        totalScore: player.totalScore + pointsEarned,
        wasMatched: pointsEarned > 0
      });

      return scores;
    },
    []
  );

  return roundScores.sort((left, right) => {
    if (right.pointsEarned !== left.pointsEarned) {
      return right.pointsEarned - left.pointsEarned;
    }

    return compareNames(left.playerName, right.playerName);
  });
}

export function buildLeaderboard(
  players: PlayerRecord[],
  roundScores: RoundScoreEntry[]
): LeaderboardEntry[] {
  const lastRoundPointsByPlayerId = new Map(
    roundScores.map((roundScore) => [roundScore.playerId, roundScore.pointsEarned])
  );

  const sortedPlayers = [...players].sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    return compareNames(left.name, right.name);
  });

  let currentRank = 0;
  let previousScore: number | undefined;

  return sortedPlayers.map((player, index) => {
    if (previousScore === undefined || player.totalScore < previousScore) {
      currentRank = index + 1;
      previousScore = player.totalScore;
    }

    return {
      playerId: player.id,
      playerName: player.name,
      rank: currentRank,
      totalScore: player.totalScore,
      lastRoundPoints: lastRoundPointsByPlayerId.get(player.id) ?? 0
    };
  });
}
