export type RoomPhase =
  | "lobby"
  | "round_intro"
  | "answering"
  | "revealing"
  | "scoring"
  | "leaderboard"
  | "final_results";

export type RoomErrorCode =
  | "INVALID_ROOM"
  | "INVALID_HOST_SESSION"
  | "INVALID_NAME"
  | "INVALID_ANSWER"
  | "DUPLICATE_NAME"
  | "ROOM_NOT_JOINABLE"
  | "ROUND_NOT_STARTABLE"
  | "PHASE_ADVANCE_NOT_ALLOWED"
  | "CONTROL_NOT_ALLOWED"
  | "ALREADY_SUBMITTED"
  | "SUBMISSION_CLOSED";

export interface RoomError {
  code: RoomErrorCode;
  message: string;
}

export interface PlayerRecord {
  id: string;
  name: string;
  connected: boolean;
  hasSubmitted: boolean;
  totalScore: number;
}

export interface RoundSummary {
  submittedCount: number;
  totalPlayers: number;
}

export interface RevealPlayerEntry {
  playerId: string;
  playerName: string;
  submittedAnswer: string;
}

export interface RevealGroup {
  id: string;
  displayAnswer: string;
  normalizedAnswer: string;
  answerCount: number;
  isMatch: boolean;
  players: RevealPlayerEntry[];
}

export interface PlayerRevealResult {
  groupDisplayAnswer?: string;
  submittedAnswer?: string;
  groupSize: number;
  matchedPlayerNames: string[];
  wasMatched: boolean;
}

export interface RoundScoreEntry {
  playerId: string;
  playerName: string;
  submittedAnswer?: string;
  groupDisplayAnswer?: string;
  groupSize: number;
  matchedPlayerNames: string[];
  pointsEarned: number;
  totalScore: number;
  wasMatched: boolean;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  rank: number;
  totalScore: number;
  lastRoundPoints: number;
}

export interface RoomModel {
  code: string;
  phase: RoomPhase;
  players: PlayerRecord[];
  hostPlayerId: string;
  hostSessionToken: string;
  roundNumber: number;
  totalRounds: number;
  currentPrompt?: string;
  roundIntroEndsAt?: number;
  answerDeadlineAt?: number;
  answersByPlayerId: Record<string, string>;
  roundParticipantIds: string[];
  roundSummary?: RoundSummary;
  revealGroups?: RevealGroup[];
  roundScores?: RoundScoreEntry[];
  leaderboardEntries?: LeaderboardEntry[];
}

export interface HostView {
  kind: "host";
  code: string;
  shareOrigin?: string;
  phase: RoomPhase;
  players: PlayerRecord[];
  roundNumber: number;
  totalRounds: number;
  currentPrompt?: string;
  roundIntroEndsAt?: number;
  answerDeadlineAt?: number;
  submittedCount: number;
  totalPlayers: number;
  roundSummary?: RoundSummary;
  revealGroups?: RevealGroup[];
  roundScores?: RoundScoreEntry[];
  leaderboardEntries?: LeaderboardEntry[];
}

export interface PlayerListItem {
  id: string;
  name: string;
  connected: boolean;
}

export interface PlayerView {
  kind: "player";
  code: string;
  phase: RoomPhase;
  roundNumber: number;
  totalRounds: number;
  players: PlayerListItem[];
  self: {
    id: string;
    name: string;
    connected: boolean;
    hasSubmitted: boolean;
    submittedAnswer?: string;
  };
  currentPrompt?: string;
  roundIntroEndsAt?: number;
  answerDeadlineAt?: number;
  submittedCount: number;
  totalPlayers: number;
  roundSummary?: RoundSummary;
  revealResult?: PlayerRevealResult;
  roundScoreResult?: RoundScoreEntry;
  leaderboardEntry?: LeaderboardEntry;
}

export type RoomView = HostView | PlayerView;

export interface SuccessResponse {
  ok: true;
}

export interface ErrorResponse {
  ok: false;
  error: RoomError;
}

export type ActionResponse = SuccessResponse | ErrorResponse;

export type CreateRoomResponse =
  | {
      ok: true;
      roomCode: string;
      playerId: string;
      hostToken: string;
    }
  | ErrorResponse;

export interface CreateRoomPayload {
  name: string;
}

export interface ResumeHostPayload {
  roomCode: string;
  hostToken: string;
}

export type ResumeHostResponse =
  | {
      ok: true;
      roomCode: string;
      playerId: string;
    }
  | ErrorResponse;

export type JoinRoomResponse =
  | {
      ok: true;
      roomCode: string;
      playerId: string;
    }
  | ErrorResponse;

export interface JoinRoomPayload {
  roomCode: string;
  name: string;
}

export interface SubmitAnswerPayload {
  answer: string;
}

export interface ServerToClientEvents {
  "room:state": (view: RoomView) => void;
  "room:error": (error: RoomError) => void;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomPayload,
    ack: (response: CreateRoomResponse) => void
  ) => void;
  "room:resumeHost": (
    payload: ResumeHostPayload,
    ack: (response: ResumeHostResponse) => void
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    ack: (response: JoinRoomResponse) => void
  ) => void;
  "room:startRound": (ack: (response: ActionResponse) => void) => void;
  "room:advancePhase": (ack: (response: ActionResponse) => void) => void;
  "room:rematch": (ack: (response: ActionResponse) => void) => void;
  "room:submitAnswer": (
    payload: SubmitAnswerPayload,
    ack: (response: ActionResponse) => void
  ) => void;
}
