import { describe, expect, it } from "vitest";

import { buildShareJoinUrl } from "./shareUrl.js";

describe("buildShareJoinUrl", () => {
  it("preserves the active session port while swapping localhost for the LAN address", () => {
    expect(
      buildShareJoinUrl({
        roomCode: "ABCD",
        currentOrigin: "http://localhost:5173",
        shareOrigin: "http://192.168.50.180:3001"
      })
    ).toBe("http://192.168.50.180:5173/join?room=ABCD");
  });

  it("keeps the active browser origin when the session is already LAN reachable", () => {
    expect(
      buildShareJoinUrl({
        roomCode: "ABCD",
        currentOrigin: "http://192.168.50.180:5173",
        shareOrigin: "http://192.168.50.180:3001"
      })
    ).toBe("http://192.168.50.180:5173/join?room=ABCD");
  });

  it("falls back to the shared origin when no browser origin is available", () => {
    expect(
      buildShareJoinUrl({
        roomCode: "ABCD",
        shareOrigin: "http://192.168.50.180:3001"
      })
    ).toBe("http://192.168.50.180:3001/join?room=ABCD");
  });
});
