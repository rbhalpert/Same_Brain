import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link, useParams } from "react-router-dom";

import { LeaderboardBoard } from "../components/LeaderboardBoard.js";
import { PhaseBadge } from "../components/PhaseBadge.js";
import { PlayerList } from "../components/PlayerList.js";
import { RevealGroupsBoard } from "../components/RevealGroupsBoard.js";
import { RoundScoresBoard } from "../components/RoundScoresBoard.js";
import { useCountdown } from "../hooks/useCountdown.js";
import { useGameClient } from "../lib/gameClient.js";

function formatCountdown(secondsRemaining?: number) {
  if (secondsRemaining === undefined) {
    return "No timer";
  }

  return `${secondsRemaining}s`;
}

function buildJoinUrl(roomCode: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}/join?room=${roomCode}`;
}

export function HostRoomScreen() {
  const { roomCode = "" } = useParams();
  const {
    session,
    roomView,
    latestError,
    startRound,
    advancePhase,
    rematch,
    submitAnswer
  } = useGameClient();
  const [isCopying, setIsCopying] = useState(false);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeDeadline =
    roomView?.kind === "host"
      ? roomView.phase === "round_intro"
        ? roomView.roundIntroEndsAt
        : roomView.answerDeadlineAt
      : undefined;
  const { secondsRemaining } = useCountdown(activeDeadline);

  const normalizedRoomCode = roomCode.toUpperCase();
  const inviteUrl = useMemo(
    () => buildJoinUrl(normalizedRoomCode),
    [normalizedRoomCode]
  );

  if (
    session?.role !== "host" ||
    session.roomCode !== normalizedRoomCode ||
    roomView?.kind !== "host" ||
    roomView.code !== normalizedRoomCode
  ) {
    return (
      <main className="screen screen--host">
        <section className="stage stage--empty">
          <p className="eyebrow">Shared screen</p>
          <h1>This room needs the host session that created it.</h1>
          <p>
            Full page reloads and new host tabs are out of scope for this MVP
            slice, so create a fresh room from the home screen to continue.
          </p>
          <Link className="button button--primary" to="/">
            Create room
          </Link>
        </section>
      </main>
    );
  }

  const connectedPlayers = roomView.players.filter((player) => player.connected).length;
  const canStartRound = roomView.phase === "lobby" && connectedPlayers >= 2;
  const canAdvancePhase =
    roomView.phase === "revealing" ||
    roomView.phase === "scoring" ||
    roomView.phase === "leaderboard";
  const canRematch = roomView.phase === "final_results";
  const primaryActionLabel = canStartRound
    ? "Start round"
    : roomView.phase === "lobby"
      ? "Need 2 players to start"
      : roomView.phase === "round_intro"
        ? "Round intro live"
        : roomView.phase === "answering"
          ? "Round in progress"
          : roomView.phase === "revealing"
            ? "Show scores"
            : roomView.phase === "scoring"
              ? roomView.roundNumber >= roomView.totalRounds
                ? "Show final results"
                : "Show leaderboard"
              : roomView.phase === "leaderboard"
                ? `Start round ${roomView.roundNumber + 1}`
                : "Play again";
  const isPrimaryActionEnabled = canStartRound || canAdvancePhase || canRematch;
  const headerEyebrow =
    roomView.phase === "lobby"
      ? "Same Brain room"
      : roomView.phase === "final_results"
        ? "Classic mode complete"
        : `Round ${roomView.roundNumber} of ${roomView.totalRounds}`;
  const hostPlayer = roomView.players.find((player) => player.id === session.playerId);

  useEffect(() => {
    if (roomView.phase !== "answering" || !hostPlayer?.hasSubmitted) {
      setSubmittedAnswer("");
    }

    if (roomView.phase !== "answering") {
      setDraftAnswer("");
    }
  }, [hostPlayer?.hasSubmitted, roomView.phase]);

  async function handleCopy() {
    if (!inviteUrl || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    setIsCopying(true);
    window.setTimeout(() => setIsCopying(false), 1_400);
  }

  async function handlePrimaryAction() {
    if (roomView.phase === "lobby") {
      await startRound();
      return;
    }

    if (canAdvancePhase) {
      await advancePhase();
      return;
    }

    if (canRematch) {
      await rematch();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const nextSubmittedAnswer = draftAnswer.trim();
    const response = await submitAnswer(draftAnswer);
    setIsSubmitting(false);

    if (response.ok) {
      setSubmittedAnswer(nextSubmittedAnswer);
      setDraftAnswer("");
    }
  }

  return (
    <main className="screen screen--host">
      <section className="stage">
        <div className="stage__headline">
          <div>
            <p className="eyebrow">{headerEyebrow}</p>
            <h1>Think alike, fast.</h1>
          </div>
          <PhaseBadge phase={roomView.phase} />
        </div>

        {roomView.phase === "lobby" ? (
          <div className="room-hero">
            <div>
              <p className="room-hero__label">Room code</p>
              <div className="room-hero__code">{roomView.code}</div>
              <p className="room-hero__meta">
                {connectedPlayers} connected {connectedPlayers === 1 ? "player" : "players"}
              </p>
            </div>
            <div className="invite-stack">
              <button className="button button--secondary" onClick={() => void handleCopy()}>
                {isCopying ? "Link copied" : "Copy invite link"}
              </button>
              <p className="invite-stack__url">{inviteUrl}</p>
              <div className="invite-stack__qr">
                <QRCodeSVG
                  bgColor="transparent"
                  fgColor="#f4f0de"
                  size={152}
                  value={inviteUrl}
                />
              </div>
            </div>
          </div>
        ) : null}

        {roomView.phase === "answering" ? (
          <div className="round-panel">
            <p className="round-panel__prompt">{roomView.currentPrompt}</p>
            <div className="round-panel__meta">
              <span>{formatCountdown(secondsRemaining)}</span>
              <span>
                {roomView.submittedCount}/{roomView.totalPlayers} locked in
              </span>
            </div>
          </div>
        ) : null}

        {roomView.phase === "round_intro" ? (
          <div className="round-panel">
            <p className="round-panel__prompt">{roomView.currentPrompt}</p>
            <div className="round-panel__meta">
              <span>Answering opens in {formatCountdown(secondsRemaining)}</span>
              <span>{roomView.totalPlayers} players getting ready</span>
            </div>
          </div>
        ) : null}

        {roomView.phase === "revealing" ? (
          <div className="reveal-shell">
            <div className="round-panel reveal-shell__summary">
              <p className="round-panel__prompt">{roomView.currentPrompt}</p>
              <div className="round-panel__meta">
                <span>Round complete</span>
                <span>
                  {roomView.roundSummary?.submittedCount ?? 0}/
                  {roomView.roundSummary?.totalPlayers ?? 0} answers received
                </span>
              </div>
            </div>
            <RevealGroupsBoard groups={roomView.revealGroups ?? []} />
          </div>
        ) : null}

        {roomView.phase === "scoring" ? (
          <div className="reveal-shell">
            <div className="round-panel reveal-shell__summary">
              <p className="round-panel__prompt">{roomView.currentPrompt}</p>
              <div className="round-panel__meta">
                <span>Score by match size</span>
                <span>
                  Round {roomView.roundNumber} of {roomView.totalRounds}
                </span>
              </div>
            </div>
            <RoundScoresBoard scores={roomView.roundScores ?? []} />
          </div>
        ) : null}

        {roomView.phase === "leaderboard" ? (
          <div className="reveal-shell">
            <div className="round-panel reveal-shell__summary">
              <p className="round-panel__prompt">
                Standings after round {roomView.roundNumber}
              </p>
              <div className="round-panel__meta">
                <span>{roomView.totalRounds - roomView.roundNumber} rounds to go</span>
                <span>Totals are now locked in</span>
              </div>
            </div>
            <LeaderboardBoard entries={roomView.leaderboardEntries ?? []} />
          </div>
        ) : null}

        {roomView.phase === "final_results" ? (
          <div className="reveal-shell">
            <div className="winner-panel">
              <p className="locked-state__label">Final winner</p>
              <strong>
                {roomView.leaderboardEntries?.[0]?.playerName ?? "No winner yet"}
              </strong>
              <p>
                {roomView.leaderboardEntries?.[0]
                  ? `${roomView.leaderboardEntries[0].totalScore} total points across ${roomView.totalRounds} rounds.`
                  : "Final standings will appear here once the game ends."}
              </p>
            </div>
            <LeaderboardBoard
              entries={roomView.leaderboardEntries ?? []}
              showRoundDelta={false}
            />
          </div>
        ) : null}

        <div className="stage__footer">
          <button
            className="button button--primary"
            disabled={!isPrimaryActionEnabled}
            onClick={() => void handlePrimaryAction()}
          >
            {primaryActionLabel}
          </button>
          {latestError ? <p className="inline-error">{latestError.message}</p> : null}
        </div>
      </section>

      <aside className="sidebar">
        {roomView.phase === "answering" && hostPlayer ? (
          <div className="control-panel">
            <p className="control-panel__label">Your answer</p>
            {hostPlayer.hasSubmitted ? (
              <>
                <strong className="control-panel__title">Locked in</strong>
                <p className="control-panel__body">
                  {submittedAnswer || "Your answer is on the board."}
                </p>
              </>
            ) : (
              <form className="form" onSubmit={handleSubmit}>
                <label className="field">
                  <span>Host answer</span>
                  <textarea
                    maxLength={64}
                    onChange={(event) => setDraftAnswer(event.target.value)}
                    placeholder="Type your answer here."
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
          </div>
        ) : null}
        <p className="eyebrow">
          {roomView.phase === "scoring" ||
          roomView.phase === "leaderboard" ||
          roomView.phase === "final_results"
            ? "Standings"
            : "Lobby roster"}
        </p>
        {roomView.phase === "scoring" ||
        roomView.phase === "leaderboard" ||
        roomView.phase === "final_results" ? (
          <LeaderboardBoard entries={roomView.leaderboardEntries ?? []} />
        ) : (
          <PlayerList players={roomView.players} showSubmissionState />
        )}
      </aside>
    </main>
  );
}
