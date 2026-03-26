# Same Brain - Roadmap

## Current State
Same Brain is now a **playable MVP**.

- Browser-first multiplayer flow is working end to end.
- Complete now: room creation, join by code/link/QR, live lobby sync, full 8-round Classic loop, reveal board, personal results, server-authoritative timers, grouping, scoring, progression, leaderboard, final results, rematch, host recovery, and LAN-friendly join links.
- Main remaining gap: resilience and polish around dropped or reconnecting non-host players.

## Phase 1 - Stability & Resilience
**Goal**
Finish the remaining MVP hardening so rooms stay playable when people disconnect, reconnect, or leave mid-session. Keep the current server-authoritative model intact while removing the main failure points.

- Add explicit player participation state separate from raw socket `connected` state.
- Let the host mark offline players inactive between rounds.
- Let the host remove or ignore inactive players without resetting the room.
- Add non-host player reconnect and slot reclaim with preserved name, score, and room identity.
- Harden timer and round transitions when players drop during `round_intro`, `answering`, `revealing`, or `scoring`.
- Add a narrow host failover fallback only if the room can otherwise become stuck.

## Phase 2 - UX & Playability
**Goal**
Make the game easier to understand on first play and faster to move through round to round. Focus on clarity, pacing, and reducing confusion without changing the game loop.

- Add clearer join and lobby instructions on the shared screen and phone UI.
- Improve answer input guidance with better empty-state, length, and invalid-answer feedback.
- Tighten lock-in feedback so players clearly know when their answer is safe.
- Shorten or streamline post-answer transitions while preserving server-owned phase timing.
- Improve reveal pacing with clearer group ordering, labels, and spacing.
- Explain why answers matched or stayed separate in simple MVP-friendly language.
- Add optional per-player accessibility quick toggles (high contrast, larger text scale, dyslexia-friendly font mode) that stay local to each device.

## Phase 3 - Fun & Retention
**Goal**
Increase delight and replay value once the core experience is stable. Keep additions lightweight, deterministic, and easy to explain after one round.

- Expand and curate the prompt pool with lightweight categories or tags.
- Reduce repeated prompts within a single session or rematch.
- Polish scoring only where it stays simple and trustworthy, such as small deterministic bonuses.
- Improve personal results feedback with clearer round summaries and match callouts.
- Highlight standout "same brain" moments in reveal, leaderboard, or final results.
- Add lightweight end-of-game session highlights worth talking about.
- Add a one-time per-game prompt veto token so rooms can democratically skip one weak prompt before answering opens.
- Add adaptive per-round answer timer tuning based on recent room lock-in speed, with conservative min/max bounds to preserve pacing clarity.

## Phase 4 - Frictionless Multiplayer
**Goal**
Reduce the effort required to get a room started and keep joining smooth across devices. Prepare the current browser-first flow for non-LAN multiplayer without changing architecture direction.

- Further reduce join friction with stronger room prefill and one-tap join behavior where possible.
- Improve QR and invite-link presentation on the host screen, including clearer LAN status and fallback copy.
- Make host roster state easier to scan for active, inactive, offline, and removed players.
- Harden shared links for non-LAN hosting through explicit public-origin configuration.
- Improve error states for unreachable room, expired session, and reconnect failure.
- Prepare deployment assumptions for internet-based play while keeping the server authoritative.

## Phase 5 - Growth & Sharing
**Goal**
Make the game easier to replay and share once multiplayer stability feels solid. Keep this phase lightweight and avoid introducing heavy social systems.

- Refine rematch so restarting a session is faster and less confusing.
- Add shareable final-results output or summary screenshot support.
- Surface lightweight post-game highlights players want to talk about.
- Add simple invite or results sharing hooks without accounts.
- Improve replay loop messaging so groups naturally start another game.

## Priority Now
- Add explicit inactive-player state and host controls to mark dropped players inactive between rounds.
- Exclude inactive players from start-round eligibility and next-round participation while preserving their past scores.
- Add non-host player reconnect and slot reclaim after refresh or reconnect.
- Harden disconnect behavior and tests for `round_intro`, `answering`, timeout, reveal, scoring, and rematch transitions.
- Decide whether host failover is still needed after the above work; if it is, implement the narrowest unblocking fallback.
