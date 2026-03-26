import type { LeaderboardEntry } from "../../shared/types.js";

export function LeaderboardBoard({
  entries,
  showRoundDelta = true
}: {
  entries: LeaderboardEntry[];
  showRoundDelta?: boolean;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="leaderboard-board">
      {entries.map((entry, index) => (
        <div
          className={`leaderboard-row ${index === 0 ? "leaderboard-row--leader" : ""}`}
          key={entry.playerId}
        >
          <span className="leaderboard-row__rank">#{entry.rank}</span>
          <div className="leaderboard-row__copy">
            <strong>{entry.playerName}</strong>
            {showRoundDelta ? (
              <span>
                {entry.lastRoundPoints > 0
                  ? `+${entry.lastRoundPoints} this round`
                  : "No points this round"}
              </span>
            ) : null}
          </div>
          <span className="leaderboard-row__score">{entry.totalScore}</span>
        </div>
      ))}
    </div>
  );
}

