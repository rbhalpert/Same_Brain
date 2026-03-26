# Same Brain — State Ownership

## Principle
Every important piece of state should have one clear owner.

## Server-owned state
- room code
- room membership
- player readiness / active status
- current round index
- selected prompt
- answer timer start/end
- submitted answers
- normalized/grouped answers
- round scores
- cumulative scores
- leaderboard
- game phase

## Client-owned local UI state
- current input text before submission
- keyboard/focus state
- local animation state
- temporary UI transitions
- copied-link success feedback
- QR render state if generated client-side

## Shared derived state
Derived from server state:
- submission progress count
- player ranking
- per-round result summaries
- final awards if implemented deterministically

## Important rule
Do not allow both client and server to independently derive authoritative scoring/grouping.
That logic must live in one place: the server or shared pure logic called by the server.

## Answer input
Before submission:
- text lives on client

After submission:
- answer lives on server
- client only displays server-confirmed state

## Reconnection
If reconnection is supported, the server remains source of truth.
The client should rehydrate from server state, not attempt to reconstruct the round locally.