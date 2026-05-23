# pi-mem-lite

Explicit lightweight persistent memory for Pi agents.

`pi-mem-lite` stores durable memories only when requested or proposed. It avoids background LLM consolidation, vector databases, transcript storage, and large automatic context injection.

## How to use it

Use `pi-mem-lite` for durable context that should survive sessions:

- user preferences
- workflow habits
- recurring corrections
- stable project conventions
- lessons learned

Do not use it for:

- secrets
- temporary task state
- raw transcripts
- one-off command output
- facts that are better stored in repo docs

## Commands

Show saved memories:

```text
/memory
```

Search approved memories:

```text
/memory-search jj workflow
```

Save an explicit memory:

```text
/memory-remember I prefer concise recommendations first, then caveats.
```

Review proposed memories:

```text
/memory-review
```

## Tool

One compact tool:

- `memory` — list, search, review, remember, propose, approve, update, and forget memories.

### Save an explicit user-requested memory

Use `remember` only when the user asks to remember something.

```json
{ "action": "remember", "text": "User prefers compact action-enum tools for small Pi extensions.", "kind": "preference", "tags": "pi,extensions,tools", "pinned": true }
```

### Propose an inferred memory

Use `propose` when the agent notices a durable preference, but the user did not explicitly ask to save it.

```json
{ "action": "propose", "text": "User prefers positive guidance phrased as desired behavior rather than negative bans.", "kind": "preference", "evidence": "User requested this style while discussing AGENTS.md guidance.", "tags": "guidance,style" }
```

### Review pending candidates

```json
{ "action": "review" }
```

### Approve a candidate

```json
{ "action": "approve", "id": "cand_..." }
```

### Search approved memories

```json
{ "action": "search", "query": "positive guidance" }
```

### Update a memory

```json
{ "action": "update", "id": "mem_...", "text": "User prefers concise positive guidance phrased as desired behavior rather than negative bans.", "pinned": true }
```

### Forget a memory

```json
{ "action": "forget", "id": "mem_..." }
```

## Memory kinds

Use one of:

- `preference` — user style or workflow preference
- `project` — stable project convention
- `lesson` — correction or mistake to avoid
- `reference` — useful durable fact or link

## Scopes

Default is global:

```json
{ "scope": "global" }
```

Use project scope for repo-specific memory:

```json
{ "scope": "project" }
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
