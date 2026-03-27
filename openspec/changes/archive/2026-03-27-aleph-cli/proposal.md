## Why

Aleph has no programmatic interface for automation, scripting, or AI agent integration — every operation requires a running browser session. A CLI tool following the "CLI is the new MCP" pattern (structured JSON output, discoverable commands, Unix exit codes) gives AI agents, CI pipelines, and power users a first-class interface to manage campaigns, entities, characters, sessions, and content without a UI.

## What Changes

- Add `cli/` package at the repo root: a standalone Node.js CLI (`aleph`) built with [commander.js](https://github.com/tj/commander.js) and distributed as an npm-runnable script
- Commands cover the most common DM workflows: campaign management, entity/character/session CRUD, member management, dice rolling, and search
- All commands support `--json` flag for structured stdout output (AI agent / pipeline friendly)
- Errors go to stderr with non-zero exit codes (Unix convention)
- `aleph --help` and `aleph <command> --help` are the discovery surface for AI agents
- CLI authenticates via a stored API token (generated from the running Aleph server)
- `aleph config set` stores base URL and token in `~/.aleph/config.json`

## Capabilities

### New Capabilities
- `aleph-cli`: Command-line interface for Aleph — auth/config, campaign CRUD, entity/character/session management, member management, dice rolling, and search. Structured JSON output, Unix exit codes, discoverable via --help.

### Modified Capabilities
<!-- No existing spec-level requirements change — the CLI is additive -->

## Impact

- **New directory**: `cli/` — self-contained Node.js package with its own `package.json`
- **New API endpoint**: `POST /api/auth/token` — generate a named API token for CLI use (stored server-side, revocable)
- **No changes** to existing frontend, API routes (except the new token endpoint), or DB schema
- **Dependencies**: `commander` (CLI framework), `@inquirer/prompts` (interactive prompts), `chalk` (terminal color), `ora` (spinners), `conf` (config storage) — all CLI-only, not in the main app bundle
- **Runnable as**: `npx aleph-cli` or globally installed `aleph` command; also via `node cli/bin/aleph.js`
