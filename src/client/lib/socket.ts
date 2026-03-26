import { io } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents
} from "../../shared/types.js";

export const socket = io<ServerToClientEvents, ClientToServerEvents>({
  autoConnect: true
});

