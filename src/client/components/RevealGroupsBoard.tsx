import type { RevealGroup } from "../../shared/types.js";

export function RevealGroupsBoard({ groups }: { groups: RevealGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="reveal-board reveal-board--empty">
        <p className="locked-state__label">No answers reached the board</p>
        <p className="phone-panel__body">
          This round closed without any submitted answers to reveal.
        </p>
      </div>
    );
  }

  return (
    <div className="reveal-board">
      {groups.map((group, index) => (
        <section
          className={`reveal-group ${group.isMatch ? "reveal-group--match" : ""}`}
          key={group.id}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="reveal-group__header">
            <span className="reveal-group__count">
              {group.answerCount} {group.answerCount === 1 ? "mind" : "minds"}
            </span>
            <span className="reveal-group__tag">
              {group.isMatch ? "Match" : "Solo"}
            </span>
          </div>
          <p className="reveal-group__answer">{group.displayAnswer}</p>
          <div className="reveal-group__names">
            {group.players.map((player) => (
              <span className="reveal-group__name" key={player.playerId}>
                {player.playerName}
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

