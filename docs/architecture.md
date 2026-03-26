# Same Brain — System Architecture

## Architecture goals
- browser-first multiplayer game
- low complexity
- server-authoritative game state
- clear separation of game logic and UI
- easy to iterate without architectural drift

## High-level structure
- frontend web client
- realtime server
- shared types/utilities

## Server responsibilities
The server is the source of truth for:
- rooms
- players
- game phase
- timer state
- collected answers
- answer grouping
- scoring
- leaderboard
- round progression

## Client responsibilities
Clients:
- render synced game state
- collect user input
- send events to server
- display results and animations

Clients are not authoritative for:
- scores
- timers
- grouped answers
- current round state

## Suggested folders
/src
  /client
    /components
    /screens
    /hooks
    /lib
  /server
    /rooms
    /game
    /transport
  /shared
    /types
    /game
    /utils

## Core architectural rules
- keep pure game logic isolated from React UI
- keep scoring/grouping deterministic and testable
- keep room/game lifecycle explicit
- avoid duplicating rules between client and server
- prefer narrow modules over broad framework-heavy abstractions

## State phases
Use explicit game phases:
- lobby
- round_intro
- answering
- revealing
- scoring
- leaderboard
- final_results

These phases should be represented with clear types, not loose booleans.

## Persistence
For MVP, in-memory room state is acceptable.
Design code so persistence can be added later without rewriting core game logic.

## Architectural Constraints
- This is a realtime multiplayer game, not a generic form-based app.
- The server is authoritative for rooms, timers, round phases, answer collection, grouping, scoring, and leaderboard state.
- Clients render synced state and submit actions only.
- Core game rules must live in pure testable modules, not React components.
- Host/shared-screen UI and player-phone UI should be separated by responsibility.
- Shared types must be reused across server and client.
- Use explicit phase/state models rather than loosely coordinated booleans.
- Favor deterministic logic over heuristic/AI-heavy logic in MVP.
- Keep MVP infrastructure simple: in-memory state is acceptable.
- Prefer narrow vertical slices over speculative extensibility.