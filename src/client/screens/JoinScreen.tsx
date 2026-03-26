import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useGameClient } from "../lib/gameClient.js";

const ROOM_CODE_PATTERN = /^[A-Z]{4}$/;

export function JoinScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { joinRoom, latestError, clearError } = useGameClient();
  const lockedRoomCode = useMemo(() => {
    const room = searchParams.get("room")?.trim().toUpperCase();
    return room && ROOM_CODE_PATTERN.test(room) ? room : "";
  }, [searchParams]);

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(lockedRoomCode);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    setRoomCode(lockedRoomCode);
  }, [lockedRoomCode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsJoining(true);
    const response = await joinRoom(name, roomCode);
    setIsJoining(false);

    if (response.ok) {
      navigate(`/play/${response.roomCode}`);
    }
  }

  return (
    <main className="screen screen--phone">
      <section className="phone-panel">
        <p className="eyebrow">Phone join</p>
        <h1 className="phone-panel__title">Jump into the room</h1>
        <p className="phone-panel__body">
          Enter your name once, then answer on this phone while the shared
          screen handles the reveal and room flow.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              autoComplete="nickname"
              maxLength={20}
              onChange={(event) => setName(event.target.value)}
              placeholder="What should the room call you?"
              value={name}
            />
          </label>

          <label className="field">
            <span>Room code</span>
            <input
              disabled={Boolean(lockedRoomCode)}
              inputMode="text"
              maxLength={4}
              onChange={(event) =>
                setRoomCode(event.target.value.toUpperCase().slice(0, 4))
              }
              placeholder="ABCD"
              value={roomCode}
            />
          </label>

          <button className="button button--primary button--block" type="submit">
            {isJoining ? "Joining..." : "Join room"}
          </button>
        </form>

        {latestError ? <p className="inline-error">{latestError.message}</p> : null}

        <p className="phone-panel__footer">
          Hosting the shared screen instead?{" "}
          <Link
            className="text-link"
            onClick={() => clearError()}
            to="/"
          >
            Go back
          </Link>
        </p>
      </section>
    </main>
  );
}
