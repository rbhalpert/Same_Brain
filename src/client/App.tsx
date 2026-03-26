import { Navigate, Route, Routes } from "react-router-dom";

import { HomeScreen } from "./screens/HomeScreen.js";
import { HostRoomScreen } from "./screens/HostRoomScreen.js";
import { JoinScreen } from "./screens/JoinScreen.js";
import { PlayerRoomScreen } from "./screens/PlayerRoomScreen.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/host/:roomCode" element={<HostRoomScreen />} />
      <Route path="/join" element={<JoinScreen />} />
      <Route path="/play/:roomCode" element={<PlayerRoomScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

