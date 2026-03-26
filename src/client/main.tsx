import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App.js";
import { GameClientProvider } from "./lib/gameClient.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GameClientProvider>
        <App />
      </GameClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

