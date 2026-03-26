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
  ResumeHostResponse,
  RoomError,
  RoomView
} from "../../shared/types.js";
import { socket } from "./socket.js";

const HOST_SESSION_STORAGE_KEY = "same-brain-host-session";

interface StoredHostSession {
  roomCode: string;
  playerId: string;
  hostToken: string;
}

type Session =
  | {
      role: "host";
      roomCode: string;
      playerId: string;
      hostToken: string;
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
  isRestoringHostSession: boolean;
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

function readStoredHostSession(): StoredHostSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(HOST_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<StoredHostSession>;
    if (
      typeof parsedValue.roomCode === "string" &&
      typeof parsedValue.playerId === "string" &&
      typeof parsedValue.hostToken === "string"
    ) {
      return {
        roomCode: parsedValue.roomCode.toUpperCase(),
        playerId: parsedValue.playerId,
        hostToken: parsedValue.hostToken
      };
    }
  } catch {
    // Ignore malformed stored state and replace it on the next write.
  }

  window.localStorage.removeItem(HOST_SESSION_STORAGE_KEY);
  return null;
}

function writeStoredHostSession(session: StoredHostSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    HOST_SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );
}

function clearStoredHostSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(HOST_SESSION_STORAGE_KEY);
}

function getHostRouteRoomCode() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const match = window.location.pathname.match(/^\/host\/([^/]+)$/);
  return match?.[1]?.trim().toUpperCase();
}

export function GameClientProvider({ children }: { children: ReactNode }) {
  const [roomView, setRoomView] = useState<RoomView | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [latestError, setLatestError] = useState<RoomError | null>(null);
  const [isRestoringHostSession, setIsRestoringHostSession] = useState(false);

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

  useEffect(() => {
    function attemptHostResume() {
      const hostRouteRoomCode = getHostRouteRoomCode();
      const storedHostSession = readStoredHostSession();

      if (
        !hostRouteRoomCode ||
        !storedHostSession ||
        storedHostSession.roomCode !== hostRouteRoomCode
      ) {
        setIsRestoringHostSession(false);
        return;
      }

      setIsRestoringHostSession(true);
      socket.emit(
        "room:resumeHost",
        {
          roomCode: storedHostSession.roomCode,
          hostToken: storedHostSession.hostToken
        },
        (response: ResumeHostResponse) => {
          if (response.ok) {
            writeStoredHostSession(storedHostSession);
            setLatestError(null);
            setSession({
              role: "host",
              roomCode: response.roomCode,
              playerId: response.playerId,
              hostToken: storedHostSession.hostToken
            });
          } else {
            clearStoredHostSession();
            setSession((currentSession) =>
              currentSession?.role === "host" &&
              currentSession.roomCode === storedHostSession.roomCode
                ? null
                : currentSession
            );
          }

          setIsRestoringHostSession(false);
        }
      );
    }

    const handleConnect = () => {
      attemptHostResume();
    };

    socket.on("connect", handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, []);

  const value = useMemo<GameClientContextValue>(
    () => ({
      roomView,
      session,
      latestError,
      isRestoringHostSession,
      createRoom: (name) =>
        new Promise((resolve) => {
          setLatestError(null);
          setRoomView(null);
          socket.emit("room:create", { name }, (response) => {
            if (response.ok) {
              writeStoredHostSession({
                roomCode: response.roomCode,
                playerId: response.playerId,
                hostToken: response.hostToken
              });
              setSession({
                role: "host",
                roomCode: response.roomCode,
                playerId: response.playerId,
                hostToken: response.hostToken
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
    [isRestoringHostSession, latestError, roomView, session]
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
