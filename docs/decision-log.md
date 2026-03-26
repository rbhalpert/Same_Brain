# Same Brain — Decision Log

## Format
### Decision
[what was decided]

### Date
[YYYY-MM-DD]

### Reason
[why]

### Rejected alternatives
[briefly]

---

### Decision
Build browser-first, not native-app-first.

### Date
2026-03-23

### Reason
Lowest friction for party play. Players can join instantly by QR/link/code without installing anything.

### Rejected alternatives
- iOS-first MVP
- native-only client approach

---

### Decision
Use conservative deterministic answer grouping in MVP.

### Date
2026-03-23

### Reason
Trust and predictability matter more than aggressive semantic matching early on.

### Rejected alternatives
- AI-heavy semantic grouping in MVP
- ambiguous grouping by default

---

### Decision
Use Socket.IO for MVP realtime room sync and round updates.

### Date
2026-03-25

### Reason
The repo was starting from zero implementation, and Socket.IO gave the fastest path to room broadcasting, typed request/ack flows, and basic disconnect tolerance without building a custom websocket protocol first.

### Rejected alternatives
- raw WebSocket with custom event protocol
- heavier framework-specific realtime layers

---

### Decision
Treat `Create room` as both the host session and the host's own participating player in MVP.

### Date
2026-03-25

### Reason
The room creator should not be excluded from the game they started. Creating a room now immediately establishes both the shared-screen host session and a player identity for that same person, which keeps the mental model simple while still leaving the shared screen in control of pacing.

### Rejected alternatives
- making the host a non-player spectator-only session
- requiring the host to join separately from another tab or device

---

### Decision
Use a short server-authoritative round intro before answering opens.

### Date
2026-03-25

### Reason
Milestone 2 needed a real round-intro step, but the game should still keep fast pacing. A brief server-timed intro preserves synchronized state across clients, gives the prompt a clear entrance, and avoids making the client authoritative for phase timing.

### Rejected alternatives
- jumping directly from lobby to answering
- client-only intro timing on each device
- a longer interstitial that slows down the round loop

---

### Decision
Compute reveal groups once on the server when the round closes, and project full grouped results only to the shared screen.

### Date
2026-03-25

### Reason
Milestone 3 needed a trustworthy reveal without duplicating grouping logic in the client. Computing conservative groups once at round close keeps the game deterministic, keeps the server authoritative, and lets phones stay simple by showing only personal reveal status.

### Rejected alternatives
- regrouping answers independently in React
- sending the full reveal board to every phone
- aggressive semantic matching beyond safe normalization rules

---

### Decision
Use a simple MVP scoring table: matched players earn points equal to their group size, while solo or missing answers earn zero.

### Date
2026-03-25

### Reason
Milestone 4 needed scoring that is easy to understand after one round and easy to trust on a shared screen. Group-size scoring is deterministic, aligns with the social matching premise, and keeps the explanation short enough for MVP.

### Rejected alternatives
- more complex bonus tables in MVP
- solo-answer consolation points
- client-derived scoring

---

### Decision
Keep reveal, scoring, leaderboard, and final-results progression host-controlled after the answer timer ends.

### Date
2026-03-25

### Reason
This keeps pacing explicit while the game loop is still being built out, and avoids adding extra server timers or client timing rules before rematch and disconnect handling are in place.

### Rejected alternatives
- auto-advancing every post-answer phase on timers
- separate advancement controls on player phones

---

### Decision
Make `Create room` immediately establish the room’s host/controller session.

### Date
2026-03-25

### Reason
The mental model needs to stay simple: if you click `Create room`, you are already the host for that room and can run the game from that same session. Requiring a separate controller handoff made room creation and hosting feel like two different actions, which added friction without enough payoff for MVP. Restoring host ownership to the create-room session keeps the product easier to understand while still letting the room creator participate without a second join flow.

### Rejected alternatives
- requiring the room creator to claim control through a second link, QR code, or tab
- letting any player phone advance the room
- requiring a separate non-playing controller device

---

### Decision
Persist a private host resume token locally so the room creator can recover the host session after refresh or reconnect.

### Date
2026-03-25

### Reason
Milestone 5 needed the room creator to be able to keep the game moving even if the shared-screen browser refreshes or the socket reconnects. A server-issued host token tied to the original host player gives the browser a narrow, deterministic way to reclaim the room without rebuilding player state or creating a second host identity.

### Rejected alternatives
- forcing the host to recreate the room after refresh
- trying to recover the host from the room code alone
- making reconnect logic client-authoritative

---

### Decision
Derive invite links and QR codes from a server-resolved share origin instead of the host browser's raw `window.location.origin`.

### Date
2026-03-25

### Reason
When the host opens Same Brain on `localhost`, copying that browser origin into the QR code makes the join link unusable on a phone. Resolving a LAN-friendly share origin on the server lets the host keep using `localhost` locally while still handing out a phone-reachable URL. The server also accepts a `SAME_BRAIN_PUBLIC_ORIGIN` override for machines with multiple adapters or unusual network setups.

### Rejected alternatives
- requiring the host to type or rewrite a LAN URL manually
- keeping `localhost` in the shared QR code and expecting phones to recover
- hardcoding a single port-specific LAN URL without respecting dev versus built client origins

---

### Decision
Preserve the host browser's active protocol and port when building the QR code and invite link.

### Date
2026-03-25

### Reason
The shareable URL needs to match the actual session the host launched, especially during local development where the browser often runs on port `5173` while the game server is on another port. The QR code now keeps the current session's protocol and port, and only swaps `localhost` for the server-resolved LAN hostname when needed.

### Rejected alternatives
- always using the server port in shared links
- forcing hosts to hand-edit the port in copied links
- treating the socket handshake origin as the only source of truth for the full invite URL

---

### Decision
Expand the default prompt pool to a curated bank of 100 short, overlap-prone prompts.

### Date
2026-03-26

### Reason
Prompt quality directly drives "same brain" moments and replayability. A larger, curated bank reduces repeat frequency while keeping prompts instinctive, readable, and broadly relatable for MVP groups.

### Rejected alternatives
- keeping the tiny seed prompt list and deferring curation
- adding open-ended or niche prompts that reduce answer overlap
- introducing category/tag systems before prompt quality baseline was in place
