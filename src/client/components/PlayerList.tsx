interface PlayerListPlayer {
  id: string;
  name: string;
  connected: boolean;
  hasSubmitted?: boolean;
}

export function PlayerList({
  players,
  showSubmissionState = false
}: {
  players: PlayerListPlayer[];
  showSubmissionState?: boolean;
}) {
  return (
    <ul className="roster">
      {players.map((player) => (
        <li className="roster__item" key={player.id}>
          <div>
            <span className="roster__name">{player.name}</span>
            <span className="roster__status">
              {player.connected ? "Connected" : "Offline"}
            </span>
          </div>
          {showSubmissionState ? (
            <div className="roster__actions">
              <span
                className={`roster__pill ${
                  player.hasSubmitted ? "roster__pill--ready" : ""
                }`}
              >
                {player.hasSubmitted ? "Locked" : "Typing"}
              </span>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
