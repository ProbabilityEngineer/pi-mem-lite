---
id: pml-49fm
status: open
deps: []
links: []
created: 2026-05-23T13:04:13Z
type: feature
priority: 3
assignee: ProbabilityEngineer
---
# Add optional pinned memory injection

Optionally inject a tiny capped pinned-memory context block at session start.

## Acceptance Criteria

Injection is disabled or conservative by default; capped around 1KB; memory is framed as context not authority.

