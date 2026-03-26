import type { RoundScoreEntry } from "../../shared/types.js";

function describeRoundScore(score: RoundScoreEntry) {
  if (!score.submittedAnswer) {
    return "No answer submitted before the round closed.";
  }

  if (score.wasMatched) {
    return `Matched with ${score.matchedPlayerNames.join(", ")}.`;
  }

  return "Solo answer this round.";
}

export function RoundScoresBoard({ scores }: { scores: RoundScoreEntry[] }) {
  if (scores.length === 0) {
    return (
      <div className="score-board score-board--empty">
        <p className="locked-state__label">No points awarded</p>
        <p className="phone-panel__body">
          Nobody got an answer onto the board, so this round scored zero across
          the room.
        </p>
      </div>
    );
  }

  return (
    <div className="score-board">
      {scores.map((score, index) => (
        <section
          className={`score-card ${score.pointsEarned > 0 ? "score-card--earned" : ""}`}
          key={score.playerId}
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div className="score-card__header">
            <span className="score-card__points">
              {score.pointsEarned > 0 ? `+${score.pointsEarned}` : "0"}
            </span>
            <span className="score-card__total">{score.totalScore} total</span>
          </div>
          <div className="score-card__body">
            <strong>{score.playerName}</strong>
            <p>{score.submittedAnswer ?? "No answer submitted"}</p>
            <span>{describeRoundScore(score)}</span>
          </div>
        </section>
      ))}
    </div>
  );
}

