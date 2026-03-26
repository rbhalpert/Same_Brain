import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PhaseBadge } from "../components/PhaseBadge.js";
import { PlayerList } from "../components/PlayerList.js";
import { useCountdown } from "../hooks/useCountdown.js";
import { useGameClient } from "../lib/gameClient.js";

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function getWaitingCopy(phase: string, roundNumber: number, totalRounds: number) {
  if (phase === "lobby") {
    return "The host will start the round from the shared screen when everyone is ready.";
  }

  if (phase === "revealing") {
    return "The host is moving the room from reveal into scoring.";
  }

  if (phase === "scoring") {
    return roundNumber >= totalRounds
      ? "The host is about to show the final results on the shared screen."
      : "The host is about to show the leaderboard on the shared screen.";
  }

  if (phase === "leaderboard") {
    return `The host is getting ready to start round ${roundNumber + 1}.`;
  }

  if (phase === "final_results") {
    return "The host can start a fresh game from the shared screen.";
  }

  return "Keep an eye on the shared screen for the next step.";
}

export function PlayerRoomScreen() {
  const { roomCode = "" } = useParams();
  const { roomView, session, latestError, submitAnswer } = useGameClient();
  const [draftAnswer, setDraftAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedRoomCode = roomCode.toUpperCase();
  const playerView = useMemo(() => {
    if (
      session?.role === "player" &&
      session.roomCode === normalizedRoomCode &&
      roomView?.kind === "player" &&
      roomView.code === normalizedRoomCode
    ) {
      return roomView;
    }

    return null;
  }, [normalizedRoomCode, roomView, session]);
  const activeDeadline =
    playerView?.phase === "round_intro"
      ? playerView.roundIntroEndsAt
      : playerView?.answerDeadlineAt;
  const { secondsRemaining } = useCountdown(activeDeadline);

  if (!playerView) {
    return (
      <main className="screen screen--phone">
        <section className="phone-panel">
          <p className="eyebrow">Phone player</p>
          <h1 className="phone-panel__title">This phone is not joined right now.</h1>
          <p className="phone-panel__body">
            Reconnect support is intentionally out of scope for this MVP slice,
            so rejoin the room from scratch if this page was refreshed.
          </p>
          <Link className="button button--primary button--block" to="/join">
            Join a room
          </Link>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const response = await submitAnswer(draftAnswer);
    setIsSubmitting(false);

    if (response.ok) {
      setDraftAnswer("");
    }
  }

  return (
    <main className="screen screen--phone">
      <section className="phone-panel">
        <div className="phone-panel__header">
          <div>
            <p className="eyebrow">
              {playerView.phase === "lobby"
                ? `Room ${playerView.code}`
                : `Round ${playerView.roundNumber} of ${playerView.totalRounds}`}
            </p>
            <h1 className="phone-panel__title">Hey, {playerView.self.name}</h1>
          </div>
          <PhaseBadge phase={playerView.phase} />
        </div>

        {playerView.phase === "lobby" ? (
          <>
            <p className="phone-panel__body">
              You are in. Keep this phone handy for the prompt and answer input.
            </p>
            <PlayerList players={playerView.players} />
          </>
        ) : null}

        {playerView.phase === "answering" ? (
          <>
            <p className="prompt-block">{playerView.currentPrompt}</p>
            <p className="round-countdown">
              {secondsRemaining ? `${secondsRemaining}s left` : "Timer finishing..."}
            </p>

            {playerView.self.hasSubmitted ? (
              <div className="locked-state">
                <p className="locked-state__label">Locked in</p>
                <strong>{playerView.self.submittedAnswer}</strong>
                <p>
                  Waiting for the rest of the room.{" "}
                  {playerView.submittedCount}/{playerView.totalPlayers} answers in.
                </p>
              </div>
            ) : (
              <form className="form" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Your answer</span>
                  <textarea
                    maxLength={64}
                    onChange={(event) => setDraftAnswer(event.target.value)}
                    placeholder="Type the first answer that feels right."
                    rows={4}
                    value={draftAnswer}
                  />
                </label>
                <button
                  className="button button--primary button--block"
                  type="submit"
                >
                  {isSubmitting ? "Locking in..." : "Lock answer"}
                </button>
              </form>
            )}
          </>
        ) : null}

        {playerView.phase === "round_intro" ? (
          <div className="locked-state">
            <p className="locked-state__label">Get ready</p>
            <strong>{playerView.currentPrompt}</strong>
            <p>
              Answering opens in{" "}
              {secondsRemaining !== undefined ? `${secondsRemaining}s` : "a moment"}.
            </p>
          </div>
        ) : null}

        {playerView.phase === "revealing" ? (
          <div className="locked-state">
            <p className="locked-state__label">
              {playerView.revealResult?.wasMatched ? "Matched" : "Reveal result"}
            </p>
            <strong>
              {playerView.revealResult?.submittedAnswer ?? "No answer submitted"}
            </strong>
            <p>
              {playerView.revealResult?.submittedAnswer
                ? playerView.revealResult.wasMatched
                  ? `You matched with ${playerView.revealResult.matchedPlayerNames.join(", ")}.`
                  : "No one else landed on your answer this round."
                : "You did not get an answer onto the board before the round closed."}
            </p>
            <p>
              {playerView.roundSummary?.submittedCount ?? 0}/
              {playerView.roundSummary?.totalPlayers ?? 0} answers reached the
              board.
            </p>
          </div>
        ) : null}

        {playerView.phase === "scoring" ? (
          <div className="locked-state">
            <p className="locked-state__label">Round score</p>
            <strong>
              {playerView.roundScoreResult
                ? `${playerView.roundScoreResult.pointsEarned > 0 ? "+" : ""}${playerView.roundScoreResult.pointsEarned} points`
                : "0 points"}
            </strong>
            <p>
              {playerView.roundScoreResult?.submittedAnswer
                ? playerView.roundScoreResult.wasMatched
                  ? `Matched with ${playerView.roundScoreResult.matchedPlayerNames.join(", ")}.`
                  : "Solo answer this round."
                : "No answer submitted before the round closed."}
            </p>
            <p>{playerView.roundScoreResult?.totalScore ?? 0} total points so far.</p>
          </div>
        ) : null}

        {playerView.phase === "leaderboard" ? (
          <div className="locked-state">
            <p className="locked-state__label">Current standing</p>
            <strong>
              {playerView.leaderboardEntry
                ? `${ordinal(playerView.leaderboardEntry.rank)} place`
                : "Ranking pending"}
            </strong>
            <p>
              {playerView.leaderboardEntry?.totalScore ?? 0} total points
              {playerView.leaderboardEntry
                ? ` with ${
                    playerView.leaderboardEntry.lastRoundPoints > 0
                      ? `+${playerView.leaderboardEntry.lastRoundPoints}`
                      : "0"
                  } from this round.`
                : "."}
            </p>
          </div>
        ) : null}

        {playerView.phase === "final_results" ? (
          <div className="locked-state">
            <p className="locked-state__label">Final result</p>
            <strong>
              {playerView.leaderboardEntry
                ? `${ordinal(playerView.leaderboardEntry.rank)} place`
                : "Game complete"}
            </strong>
            <p>
              Finished with {playerView.leaderboardEntry?.totalScore ?? 0} total
              points after {playerView.totalRounds} rounds.
            </p>
          </div>
        ) : null}

        {playerView.phase !== "answering" ? (
          <div className="locked-state">
            <p className="locked-state__label">Shared screen control</p>
            <p>{getWaitingCopy(playerView.phase, playerView.roundNumber, playerView.totalRounds)}</p>
          </div>
        ) : null}

        {latestError ? <p className="inline-error">{latestError.message}</p> : null}
      </section>
    </main>
  );
}
