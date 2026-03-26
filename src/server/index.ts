import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

import type {
  ActionResponse,
  ClientToServerEvents,
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  ResumeHostPayload,
  ResumeHostResponse,
  RoomError,
  ServerToClientEvents,
  SubmitAnswerPayload
} from "../shared/types.js";
import { resolveShareOrigin } from "./network/shareOrigin.js";
import { RoomStore } from "./rooms/roomStore.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";
const PUBLIC_ORIGIN_OVERRIDE = process.env.SAME_BRAIN_PUBLIC_ORIGIN;
const roomStore = new RoomStore();
const app = express();
const httpServer = createServer(app);
const activeHostSocketIds = new Map<string, string>();
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true,
    credentials: true
  }
});

type SessionData =
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
  | {
      role?: undefined;
      roomCode?: undefined;
      playerId?: undefined;
    };

function roomChannel(roomCode: string) {
  return `room:${roomCode}`;
}

async function broadcastRoom(roomCode: string) {
  const sockets = await io.in(roomChannel(roomCode)).fetchSockets();

  for (const socket of sockets) {
    const session = socket.data as SessionData;
    if (
      session.role === "host" &&
      activeHostSocketIds.get(roomCode) === socket.id
    ) {
      const view = roomStore.getHostView(roomCode);
      if (view) {
        socket.emit("room:state", {
          ...view,
          shareOrigin: resolveShareOrigin({
            originHeader: socket.handshake.headers.origin,
            publicOriginOverride: PUBLIC_ORIGIN_OVERRIDE,
            fallbackPort: PORT
          })
        });
      }
      continue;
    }

    if (session.role === "player" && session.playerId) {
      const view = roomStore.getPlayerView(roomCode, session.playerId);
      if (view) {
        socket.emit("room:state", view);
      }
    }
  }
}

function emitError(
  socket: {
    emit: (event: "room:error", error: RoomError) => void;
  },
  response:
    | ActionResponse
    | CreateRoomResponse
    | JoinRoomResponse
    | ResumeHostResponse
) {
  if (!response.ok) {
    socket.emit("room:error", response.error);
  }
}

function setStaticClient(appInstance: express.Express) {
  const serverFile = fileURLToPath(import.meta.url);
  const serverDir = path.dirname(serverFile);
  const clientDist = path.resolve(serverDir, "../client");

  if (!existsSync(clientDist)) {
    return;
  }

  appInstance.use(express.static(clientDist));
  appInstance.get(/^(?!\/socket\.io).*/, (_request, response) => {
    response.sendFile(path.join(clientDist, "index.html"));
  });
}

setStaticClient(app);

io.on("connection", (socket) => {
  socket.on("room:create", async (payload: CreateRoomPayload, ack) => {
    const createResult = roomStore.createRoomWithHost(payload.name);
    if (!createResult.ok) {
      const response: CreateRoomResponse = {
        ok: false,
        error: createResult.error
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const { room, player } = createResult;
    const session: SessionData = {
      role: "host",
      roomCode: room.code,
      playerId: player.id
    };

    socket.data = session;
    activeHostSocketIds.set(room.code, socket.id);
    await socket.join(roomChannel(room.code));
    await broadcastRoom(room.code);

    const response: CreateRoomResponse = {
      ok: true,
      roomCode: room.code,
      playerId: player.id,
      hostToken: room.hostSessionToken
    };
    ack(response);
  });

  socket.on("room:resumeHost", async (payload: ResumeHostPayload, ack) => {
    const resumeResult = roomStore.resumeHost(payload.roomCode, payload.hostToken);
    if (!resumeResult.ok) {
      const response: ResumeHostResponse = {
        ok: false,
        error: resumeResult.error
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const roomCode = payload.roomCode.trim().toUpperCase();
    const session: SessionData = {
      role: "host",
      roomCode,
      playerId: resumeResult.player.id
    };

    socket.data = session;
    activeHostSocketIds.set(roomCode, socket.id);
    await socket.join(roomChannel(roomCode));
    await broadcastRoom(roomCode);

    const response: ResumeHostResponse = {
      ok: true,
      roomCode,
      playerId: resumeResult.player.id
    };
    ack(response);
  });

  socket.on("room:join", async (payload: JoinRoomPayload, ack) => {
    const joinResult = roomStore.joinRoom(payload.roomCode, payload.name);
    if (!joinResult.ok) {
      const response: JoinRoomResponse = {
        ok: false,
        error: joinResult.error
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const roomCode = payload.roomCode.trim().toUpperCase();
    const session: SessionData = {
      role: "player",
      roomCode,
      playerId: joinResult.player.id
    };

    socket.data = session;
    await socket.join(roomChannel(roomCode));
    await broadcastRoom(roomCode);

    const response: JoinRoomResponse = {
      ok: true,
      roomCode,
      playerId: joinResult.player.id
    };
    ack(response);
  });

  socket.on("room:startRound", async (ack) => {
    const session = socket.data as SessionData;
    if (
      session.role !== "host" ||
      !session.roomCode ||
      activeHostSocketIds.get(session.roomCode) !== socket.id
    ) {
      const response: ActionResponse = {
        ok: false,
        error: {
          code: "CONTROL_NOT_ALLOWED",
          message: "Only the active host session can start a round."
        }
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const response = roomStore.startRound(session.roomCode);
    if (!response.ok) {
      emitError(socket, response);
      ack(response);
      return;
    }

    await broadcastRoom(session.roomCode);
    ack(response);
  });

  socket.on("room:advancePhase", async (ack) => {
    const session = socket.data as SessionData;
    if (
      session.role !== "host" ||
      !session.roomCode ||
      activeHostSocketIds.get(session.roomCode) !== socket.id
    ) {
      const response: ActionResponse = {
        ok: false,
        error: {
          code: "CONTROL_NOT_ALLOWED",
          message: "Only the active host session can continue the game."
        }
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const response = roomStore.advancePhase(session.roomCode);
    if (!response.ok) {
      emitError(socket, response);
      ack(response);
      return;
    }

    await broadcastRoom(session.roomCode);
    ack(response);
  });

  socket.on("room:rematch", async (ack) => {
    const session = socket.data as SessionData;
    if (
      session.role !== "host" ||
      !session.roomCode ||
      activeHostSocketIds.get(session.roomCode) !== socket.id
    ) {
      const response: ActionResponse = {
        ok: false,
        error: {
          code: "CONTROL_NOT_ALLOWED",
          message: "Only the active host session can start a new game."
        }
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const response = roomStore.rematch(session.roomCode);
    if (!response.ok) {
      emitError(socket, response);
      ack(response);
      return;
    }

    await broadcastRoom(session.roomCode);
    ack(response);
  });

  socket.on("room:submitAnswer", async (payload: SubmitAnswerPayload, ack) => {
    const session = socket.data as SessionData;
    if (
      (session.role !== "player" && session.role !== "host") ||
      !session.roomCode ||
      !session.playerId
    ) {
      const response: ActionResponse = {
        ok: false,
        error: {
          code: "SUBMISSION_CLOSED",
          message: "This device is not joined as an active player."
        }
      };
      emitError(socket, response);
      ack(response);
      return;
    }

    const response = roomStore.submitAnswer(
      session.roomCode,
      session.playerId,
      payload.answer
    );
    if (!response.ok) {
      emitError(socket, response);
      ack(response);
      return;
    }

    await broadcastRoom(session.roomCode);
    ack(response);
  });

  socket.on("disconnect", async () => {
    const session = socket.data as SessionData;
    if (
      session.role === "host" &&
      session.roomCode &&
      activeHostSocketIds.get(session.roomCode) === socket.id
    ) {
      activeHostSocketIds.delete(session.roomCode);
    }

    if (
      (session.role === "player" || session.role === "host") &&
      session.roomCode &&
      session.playerId
    ) {
      roomStore.disconnectPlayer(session.roomCode, session.playerId);
      await broadcastRoom(session.roomCode);
    }
  });
});

setInterval(async () => {
  const updatedRooms = roomStore.advanceExpiredRounds();
  for (const roomCode of updatedRooms) {
    await broadcastRoom(roomCode);
  }
}, 500);

httpServer.listen(PORT, HOST, () => {
  console.log(`Same Brain server listening on port ${PORT}.`);
});
