# pi-mem-lite Design

## Goal

Provide explicit, lightweight persistent memory for Pi agents: durable user preferences, workflow habits, and stable project patterns that can be searched or recalled across sessions without large automatic context injection.

## Non-goals

- No automatic LLM consolidation.
- No vector database or semantic embeddings in v1.
- No silent durable writes from inferred observations.
- No broad session transcript storage.
- No large memory dump in every prompt.

## Principles

- Explicit beats automatic: durable writes should be user-requested or clearly agent-proposed.
- Human-readable storage: memory should be easy to inspect, edit, and back up.
- Small prompt footprint: expose one compact tool and short guidance.
- Memory is context, not authority: repo evidence and user instructions override memory.
- Easy deletion: forgetting or updating stale memory should be first-class.

## Storage

Use JSON Lines under `~/.pi/agent/pi-mem-lite/`:

- `memories.jsonl` — approved durable memories.
- `candidates.jsonl` — proposed but unapproved memories.

Memory shape:

```json
{
  "id": "mem_...",
  "created": "2026-05-23T00:00:00.000Z",
  "updated": "2026-05-23T00:00:00.000Z",
  "kind": "preference",
  "scope": "global",
  "text": "User prefers compact action-enum tools over many separate tools.",
  "evidence": "User said this while designing pi-tickets.",
  "tags": ["pi", "tool-design"],
  "pinned": true
}
```

Kinds:

- `preference` — user style/workflow preferences.
- `project` — stable project-specific facts or conventions.
- `lesson` — corrections or mistakes to avoid.
- `reference` — useful durable facts or links.

Scopes:

- `global` — applies across repos.
- `project` — tied to the current repo root/path.

## Tool surface

One compact tool: `memory`.

Actions:

- `list`
- `search`
- `review`
- `remember`
- `propose`
- `approve`
- `update`
- `forget`

`propose` writes to the candidate queue. `remember` writes approved memory directly when the user explicitly asks to remember something.

## Commands

- `/memory` — show stats and recent approved memories.
- `/memory-search <query>` — search approved memories.
- `/memory-remember <text>` — save approved memory.
- `/memory-review` — show pending candidates.

## Injection policy

V1 should avoid automatic injection, except possibly a tiny pinned-memory block later. If added, injection must be opt-in or capped hard, e.g. top pinned global preferences under 1 KB.

## Safety

- Do not store secrets.
- Prefer explicit user approval for durable memory.
- Store concise preferences, not raw transcripts.
- Include evidence/reason text for auditability.
- Make forget/update easy and reliable.
