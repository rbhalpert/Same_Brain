# Same Brain — Development Rules

## Core philosophy
Build the smallest clean solution that makes the product playable.

## Required behaviors
- keep changes narrow and purposeful
- prefer a vertical slice over broad scaffolding
- use strong types
- keep pure logic testable
- separate game logic from UI
- preserve existing behavior unless the task explicitly changes it

## Avoid
- speculative abstractions
- giant components
- giant utility files
- duplicate business logic
- framework-heavy patterns that add little value
- over-optimizing early
- adding libraries without clear need

## File size guidance
If a file is becoming hard to scan, split it by responsibility.
Do not split prematurely.

## Refactoring rule
Only refactor when:
- needed for the task
- clearly reducing complexity
- preserving current behavior

## Testing rule
Prioritize tests for:
- scoring
- normalization/grouping
- state transitions
- regression-prone game logic

Do not spend time building large low-value test scaffolding in MVP.

## UI rule
Polish matters most in:
- join flow
- answer flow
- reveal
- scoring clarity

Do not over-polish secondary flows before the core loop works.

## Codex behavior rule
Before coding, identify:
- files to touch
- narrowest implementation path
- assumptions
- acceptance criteria

## Same Brain-specific code rules
- Do not place scoring or grouping logic inside UI components.
- Do not duplicate game rules across client and server.
- Do not make the client authoritative for timer progression or scoring.
- Do not introduce global state libraries unless clearly needed.
- Keep room lifecycle logic and round lifecycle logic explicit and centralized.
- Prefer pure utility modules for normalization, grouping, scoring, ranking, and awards.
- Keep host UI and player UI separate unless sharing is clearly beneficial.
- Build the smallest playable slice first.

Then implement.