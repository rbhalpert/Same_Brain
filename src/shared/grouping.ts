import type { RevealGroup, RevealPlayerEntry } from "./types.js";

interface SubmittedAnswerEntry {
  playerId: string;
  playerName: string;
  submittedAnswer: string;
}

function singularizeToken(token: string): string {
  if (token.length <= 4 || token.endsWith("ss") || token.endsWith("us") || token.endsWith("is")) {
    return token;
  }

  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (/(s|sh|ch|x|z)es$/u.test(token)) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

export function normalizeAnswerForGrouping(answer: string): string {
  const sanitized = answer
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/^(a|an|the)\s+/u, "");

  if (!sanitized) {
    return "";
  }

  return sanitized
    .split(" ")
    .filter(Boolean)
    .map(singularizeToken)
    .join(" ");
}

function createGroupId(normalizedAnswer: string, fallbackIndex: number): string {
  const slug = normalizedAnswer.replace(/\s+/gu, "-");
  return `group-${slug || `answer-${fallbackIndex + 1}`}`;
}

export function buildRevealGroups(entries: SubmittedAnswerEntry[]): RevealGroup[] {
  const groupsByAnswer = new Map<string, RevealGroup>();

  entries.forEach((entry, index) => {
    const normalizedAnswer = normalizeAnswerForGrouping(entry.submittedAnswer);
    const trimmedAnswer = entry.submittedAnswer.trim();
    const key = normalizedAnswer || trimmedAnswer.toLowerCase();
    const playerEntry: RevealPlayerEntry = {
      playerId: entry.playerId,
      playerName: entry.playerName,
      submittedAnswer: trimmedAnswer
    };

    const existingGroup = groupsByAnswer.get(key);
    if (existingGroup) {
      existingGroup.players.push(playerEntry);
      existingGroup.answerCount = existingGroup.players.length;
      existingGroup.isMatch = existingGroup.players.length > 1;
      return;
    }

    groupsByAnswer.set(key, {
      id: createGroupId(key, index),
      displayAnswer: normalizedAnswer || trimmedAnswer.toLowerCase(),
      normalizedAnswer: key,
      answerCount: 1,
      isMatch: false,
      players: [playerEntry]
    });
  });

  return Array.from(groupsByAnswer.values()).sort((left, right) => {
    if (right.answerCount !== left.answerCount) {
      return right.answerCount - left.answerCount;
    }

    return left.displayAnswer.localeCompare(right.displayAnswer);
  });
}

