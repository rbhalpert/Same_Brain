# AGENTS.md

## Purpose
This repository contains Same Brain, a browser-first multiplayer party game.
Before planning or coding, read the project docs in `/docs` and follow them.

## Read these docs first
- docs/product-overview.md
- docs/architecture.md
- docs/state-ownership.md
- docs/ui-principles.md
- docs/prompts-and-grouping.md
- docs/dev-rules.md
- docs/roadmap.md
- docs/decision-log.md

## Working rules
- Keep changes narrow and purposeful.
- Prefer the smallest vertical slice that increases end-to-end playability.
- Do not add speculative abstractions or future-facing systems unless the current task clearly requires them.
- Preserve existing behavior unless the task explicitly changes it.
- Keep game logic deterministic and testable.
- Keep server-authoritative logic on the server.
- Be conservative with answer grouping in MVP.
- Do not add accounts, chat, voice, monetization, or extra game modes unless explicitly asked.

## Planning rules
Before making changes:
1. Briefly state the files you plan to touch.
2. Explain the narrowest implementation path.
3. Note assumptions or risks.
4. Confirm the task against `docs/roadmap.md`.

If the user asks what to do next:
- inspect the current codebase
- compare it to `docs/roadmap.md`
- propose exactly 3 bounded next slices
- rank them from best to worst
- prefer user-visible MVP progress over infrastructure work
- do not code until one slice is chosen

## Implementation priorities
Prioritize polish and clarity in:
- room creation and joining
- prompt/answer flow
- reveal
- scoring clarity

## Testing
When changing core logic, add or update targeted tests where practical, especially for:
- normalization/grouping
- scoring
- game-state transitions

## After completing meaningful work
If project status changed or an important implementation decision was made, update:
- docs/roadmap.md
- docs/decision-log.md