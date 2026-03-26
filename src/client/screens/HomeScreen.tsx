import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useGameClient } from "../lib/gameClient.js";

export function HomeScreen() {
  const navigate = useNavigate();
  const { createRoom, latestError, clearError } = useGameClient();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateRoom() {
    setIsCreating(true);
    const response = await createRoom(name);
    setIsCreating(false);

    if (response.ok) {
      navigate(`/host/${response.roomCode}`);
    }
  }

  return (
    <main className="screen screen--landing">
      <div className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Browser-first party game</p>
          <h1>Same Brain</h1>
          <p className="hero__lede">
            Think like the room. Join in seconds. Reveal who matched when the
            answers lock in.
          </p>
          <label className="field">
            <span>Your name</span>
            <input
              autoComplete="nickname"
              maxLength={20}
              onChange={(event) => setName(event.target.value)}
              placeholder="What should the room call you?"
              value={name}
            />
          </label>
          <div className="hero__actions">
            <button className="button button--primary" onClick={handleCreateRoom}>
              {isCreating ? "Creating room..." : "Create room"}
            </button>
            <button
              className="button button--ghost"
              onClick={() => {
                clearError();
                navigate("/join");
              }}
            >
              Join a room
            </button>
          </div>
          {latestError ? <p className="inline-error">{latestError.message}</p> : null}
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="hero__visual-ring" />
          <div className="hero__visual-panel">
            <span>ROOM</span>
            <strong>THINK</strong>
            <span>REVEAL</span>
          </div>
        </div>
      </div>
    </main>
  );
}
