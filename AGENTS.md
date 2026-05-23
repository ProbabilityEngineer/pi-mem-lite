# Agent Instructions

## Workflow
- Start with the most specific code-intelligence tool for the request, then use explicit repo-relative paths for follow-up reads/searches/edits; if the repo seems wrong, stop and ask.
- For syntax-shaped requests, start with AST/LSP before semantic search.
- For behavior/intent requests, start with Semble before file listing or literal search.

## VCS
- Use jj for local VCS operations.
- Use Git only for remote interoperability.
- Desired final shape: `@` is empty, `@-` is the completed change, and `main`/`main@origin` point to `@-`.

## Tickets
- For non-trivial feature/fix work, use tk tickets.
- Ticket actions may modify `.tickets/` but should not touch code unless the task requires it.

## Shell
- Prefer explicit repo-relative paths for file operations.
- Avoid interactive prompts in automation.
