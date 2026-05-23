# pi-mem-lite

Explicit lightweight persistent memory for Pi agents.

`pi-mem-lite` stores durable memories only when requested or proposed. It avoids background LLM consolidation, vector databases, transcript storage, and large automatic context injection.

## Tool

One compact tool:

- `memory` — list, search, review, remember, propose, approve, update, and forget memories.

Actions:

```json
{ "action": "remember", "text": "User prefers concise recommendations first.", "kind": "preference", "tags": "style", "pinned": true }
{ "action": "propose", "text": "User prefers compact action-enum tools.", "kind": "preference", "evidence": "Discussed during extension design." }
{ "action": "list" }
{ "action": "search", "query": "action-enum" }
{ "action": "review" }
{ "action": "approve", "id": "cand_..." }
{ "action": "update", "id": "mem_...", "text": "Updated memory text", "pinned": true }
{ "action": "forget", "id": "mem_..." }
```

## Commands

```bash
/memory
/memory-search <query>
/memory-remember <text>
/memory-review
```

## Storage

JSON Lines under:

```text
~/.pi/agent/pi-mem-lite/
  memories.jsonl
  candidates.jsonl
```

Memories are human-readable and easy to inspect or back up.

## Safety

- Memory is context, not authority; current user instructions and repo evidence win.
- Do not store secrets.
- Prefer concise, stable preferences and lessons over raw transcript snippets.
- Use `propose` for inferred memories, `review` for pending candidates, and `remember` for explicit user requests.

## Install

```bash
pi install git:github.com/ProbabilityEngineer/pi-mem-lite
```

For local testing:

```bash
pi -e ./index.ts
```

## Development

```bash
npm install
npm run lint
```
