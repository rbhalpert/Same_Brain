import { describe, expect, it } from "vitest";

import { buildLeaderboard, computeRoundScores } from "./scoring.js";
import type { PlayerRecord, RevealGroup } from "./types.js";

const players: PlayerRecord[] = [
  {
    id: "1",
    name: "Alex",
    connected: true,
    hasSubmitted: true,
    totalScore: 4
  },
  {
    id: "2",
    name: "Blair",
    connected: true,
    hasSubmitted: true,
    totalScore: 1
  },
  {
    id: "3",
    name: "Casey",
    connected: true,
    hasSubmitted: false,
    totalScore: 2
  }
];

const revealGroups: RevealGroup[] = [
  {
    id: "group-goose",
    displayAnswer: "goose",
    normalizedAnswer: "goose",
    answerCount: 2,
    isMatch: true,
    players: [
      {
        playerId: "1",
        playerName: "Alex",
        submittedAnswer: "goose"
      },
      {
        playerId: "2",
        playerName: "Blair",
        submittedAnswer: "goose"
      }
    ]
  }
];

describe("computeRoundScores", () => {
  it("awards match-size points and leaves solos or no-submits at zero", () => {
    const roundScores = computeRoundScores({
      answersByPlayerId: {
        "1": "goose",
        "2": "goose"
      },
      players,
      revealGroups,
      roundParticipantIds: ["1", "2", "3"]
    });

    expect(roundScores).toMatchObject([
      {
        playerId: "1",
        pointsEarned: 2,
        totalScore: 6,
        wasMatched: true
      },
      {
        playerId: "2",
        pointsEarned: 2,
        totalScore: 3,
        wasMatched: true
      },
      {
        playerId: "3",
        pointsEarned: 0,
        totalScore: 2,
        wasMatched: false
      }
    ]);
  });
});

describe("buildLeaderboard", () => {
  it("sorts by total score and reuses the same rank number for ties", () => {
    const leaderboard = buildLeaderboard(
      [
        { ...players[0], totalScore: 6 },
        { ...players[1], totalScore: 3 },
        { ...players[2], totalScore: 3 }
      ],
      [
        {
          playerId: "1",
          playerName: "Alex",
          pointsEarned: 2,
          totalScore: 6,
          groupSize: 2,
          matchedPlayerNames: ["Blair"],
          submittedAnswer: "goose",
          groupDisplayAnswer: "goose",
          wasMatched: true
        },
        {
          playerId: "2",
          playerName: "Blair",
          pointsEarned: 2,
          totalScore: 3,
          groupSize: 2,
          matchedPlayerNames: ["Alex"],
          submittedAnswer: "goose",
          groupDisplayAnswer: "goose",
          wasMatched: true
        },
        {
          playerId: "3",
          playerName: "Casey",
          pointsEarned: 0,
          totalScore: 3,
          groupSize: 1,
          matchedPlayerNames: [],
          submittedAnswer: "duck",
          groupDisplayAnswer: "duck",
          wasMatched: false
        }
      ]
    );

    expect(leaderboard).toMatchObject([
      {
        playerId: "1",
        rank: 1,
        totalScore: 6,
        lastRoundPoints: 2
      },
      {
        playerId: "2",
        rank: 2,
        totalScore: 3
      },
      {
        playerId: "3",
        rank: 2,
        totalScore: 3
      }
    ]);
  });
});
