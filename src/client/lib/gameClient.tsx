import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import type {
  ActionResponse,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomError,
  RoomView
} from "../../shared/types.js";
import { socket } from "./socket.js";

type Session =
  | {
      role: "host";
      roomCode: string;
      playerId: string;
    }
  | {
      role: "player";
      roomCode: string;
      playerId: string;
    }
  | null;

interface GameClientContextValue {
  roomView: RoomView | null;
  session: Session;
  latestError: RoomError | null;
  createRoom: (name: string) => Promise<CreateRoomResponse>;
  joinRoom: (name: string, roomCode: string) => Promise<JoinRoomResponse>;
  startRound: () => Promise<ActionResponse>;
  advancePhase: () => Promise<ActionResponse>;
  rematch: () => Promise<ActionResponse>;
  submitAnswer: (answer: string) => Promise<ActionResponse>;
  clearError: () => void;
}

const GameClientContext = createContext<GameClientContextValue | undefined>(
  undefined
);

export function GameClientProvider({ children }: { children: ReactNode }) {
  const [roomView, setRoomView] = useState<RoomView | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [latestError, setLatestError] = useState<RoomError | null>(null);

  useEffect(() => {
    const handleRoomState = (nextRoomView: RoomView) => {
      setRoomView(nextRoomView);
    };

    const handleRoomError = (error: RoomError) => {
      setLatestError(error);
    };

    socket.on("room:state", handleRoomState);
    socket.on("room:error", handleRoomError);

    return () => {
      socket.off("room:state", handleRoomState);
      socket.off("room:error", handleRoomError);
    };
  }, []);

  const value = useMemo<GameClientContextValue>(
    () => ({
      roomView,
      session,
      latestError,
      createRoom: (name) =>
        new Promise((resolve) => {
          setLatestError(null);
          setRoomView(null);
          socket.emit("room:create", { name }, (response) => {
            if (response.ok) {
              setSession({
                role: "host",
                roomCode: response.roomCode,
                playerId: response.playerId
              });
            } else {
              setLatestError(response.error);
            }

            resolve(response);
          });
        }),
      joinRoom: (name, roomCode) =>
        new Promise((resolve) => {
          const normalizedRoomCode = roomCode.trim().toUpperCase();
          setLatestError(null);
          socket.emit(
            "room:join",
            {
              name,
              roomCode: normalizedRoomCode
            },
            (response) => {
              if (response.ok) {
                setSession({
                  role: "player",
                  roomCode: response.roomCode,
                  playerId: response.playerId
                });
              } else {
                setLatestError(response.error);
              }

              resolve(response);
            }
          );
        }),
      startRound: () =>
        new Promise((resolve) => {
          setLatestError(null);
          socket.emit("room:startRound", (response) => {
            if (!response.ok) {
              setLatestError(response.error);
            }

            resolve(response);
          });
        }),
      advancePhase: () =>
        new Promise((resolve) => {
          setLatestError(null);
          socket.emit("room:advancePhase", (response) => {
            if (!response.ok) {
              setLatestError(response.error);
            }

            resolve(response);
          });
        }),
      rematch: () =>
        new Promise((resolve) => {
          setLatestError(null);
          socket.emit("room:rematch", (response) => {
            if (!response.ok) {
              setLatestError(response.error);
            }

            resolve(response);
          });
        }),
      submitAnswer: (answer) =>
        new Promise((resolve) => {
          setLatestError(null);
          socket.emit(
            "room:submitAnswer",
            {
              answer
            },
            (response) => {
              if (!response.ok) {
                setLatestError(response.error);
              }

              resolve(response);
            }
          );
        }),
      clearError: () => setLatestError(null)
    }),
    [latestError, roomView, session]
  );

  return (
    <GameClientContext.Provider value={value}>
      {children}
    </GameClientContext.Provider>
  );
}

export function useGameClient() {
  const context = useContext(GameClientContext);
  if (!context) {
    throw new Error("useGameClient must be used inside GameClientProvider.");
  }

  return context;
}
