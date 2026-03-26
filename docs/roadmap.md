# Same Brain — Current Roadmap

## Current phase
MVP vertical slice implementation

## Goal
Get a fully playable browser-based version working end to end.

## Milestones
### Milestone 1
Room creation and joining
Status: complete
- host creates room
- room code works
- invite link works
- QR works
- players can join and appear in lobby
Implemented now: creating a room also creates the host's own player slot, so the room creator can participate without a second join flow, and invite links or QR codes now automatically switch away from `localhost` so phones on the same LAN can join the room.

### Milestone 2
Round flow
Status: complete
- round intro
- answering state
- answer submission
- timer
- lock-in state
Implemented now: a short server-timed round intro, answering state, answer submission, timer, lock-in state, and a placeholder reveal handoff screen.

### Milestone 3
Reveal and grouping
Status: complete
- reveal all answers
- conservative grouping
- result display
Implemented now: the shared screen shows grouped reveal clusters, and each phone gets a simple personal reveal result without mirroring the whole board.

### Milestone 4
Scoring and leaderboard
Status: complete
- apply scoring table
- cumulative score tracking
- leaderboard between rounds
- final results
Implemented now: score is applied server-side from reveal groups, cumulative totals carry across an 8-round Classic session, leaderboard appears between rounds, and the game ends in final results after round 8.

### Milestone 5
Rematch and basic resilience
Status: in progress
- rematch flow
- disconnect does not crash room
- basic inactive player handling
Implemented now: the room can rematch from final results back into the same lobby, the same host session that created the room owns start, next-round, and play-again controls on the shared screen, and the host can now recover that room after a refresh or reconnect without recreating it.
Remaining: make disconnected non-host players easier to manage and add basic inactive-player handling between rounds.

## Out of scope
- alternate modes
- account system
- social graph
- economy
- advanced moderation
- native app shell

## Current next task
Continue Milestone 5 resilience work:
- add basic inactive-player handling for players who drop mid-session
- let the host remove or ignore inactive players between rounds
- preserve the current server-authoritative state model while making the room more forgiving
