import { describe, expect, it } from "vitest";

import { buildRevealGroups, normalizeAnswerForGrouping } from "./grouping.js";

describe("normalizeAnswerForGrouping", () => {
  it("normalizes case, punctuation, whitespace, articles, and trivial plurals", () => {
    expect(normalizeAnswerForGrouping(" Spider ")).toBe("spider");
    expect(normalizeAnswerForGrouping("a spider")).toBe("spider");
    expect(normalizeAnswerForGrouping("spiders!!!")).toBe("spider");
    expect(normalizeAnswerForGrouping(" tacos ")).toBe("taco");
    expect(normalizeAnswerForGrouping("The dishes")).toBe("dish");
  });

  it("keeps unlike meanings separate", () => {
    expect(normalizeAnswerForGrouping("snake")).not.toBe(
      normalizeAnswerForGrouping("python")
    );
    expect(normalizeAnswerForGrouping("money")).not.toBe(
      normalizeAnswerForGrouping("cash")
    );
  });
});

describe("buildRevealGroups", () => {
  it("groups only safe normalized matches and sorts larger groups first", () => {
    const groups = buildRevealGroups([
      {
        playerId: "1",
        playerName: "Alex",
        submittedAnswer: "Spider"
      },
      {
        playerId: "2",
        playerName: "Blair",
        submittedAnswer: "a spider"
      },
      {
        playerId: "3",
        playerName: "Casey",
        submittedAnswer: "spiders"
      },
      {
        playerId: "4",
        playerName: "Drew",
        submittedAnswer: "python"
      }
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      displayAnswer: "spider",
      answerCount: 3,
      isMatch: true
    });
    expect(groups[0].players.map((player) => player.playerName)).toEqual([
      "Alex",
      "Blair",
      "Casey"
    ]);
    expect(groups[1]).toMatchObject({
      displayAnswer: "python",
      answerCount: 1,
      isMatch: false
    });
  });

  it("does not group semantic cousins that should stay separate", () => {
    const groups = buildRevealGroups([
      {
        playerId: "1",
        playerName: "Alex",
        submittedAnswer: "snake"
      },
      {
        playerId: "2",
        playerName: "Blair",
        submittedAnswer: "python"
      },
      {
        playerId: "3",
        playerName: "Casey",
        submittedAnswer: "cash"
      },
      {
        playerId: "4",
        playerName: "Drew",
        submittedAnswer: "money"
      }
    ]);

    expect(groups).toHaveLength(4);
    expect(groups.every((group) => group.answerCount === 1)).toBe(true);
  });
});
