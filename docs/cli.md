# The `aleph` CLI

A standalone Node.js CLI that drives the same HTTP API as the web app. Ideal for scripted imports, bulk edits, automation, and CI. It lives in `cli/` and is built on Commander.

## Running it

From the repo:

```bash
npm run aleph <command> …        # = node cli/bin/aleph.js
```

Or, where the published package is installed: `aleph <command>` / `npx aleph-cli <command>`.

## Authentication

```bash
npm run aleph login --email you@example.com --password ...
npm run aleph logout
```

`login` creates an API key on the server and stores it (plus its id and the server URL) in `~/.aleph/config.json`. Every subsequent command sends it as an `X-API-Key` header (see [auth.md](auth.md)). **`~/.aleph/config.json` holds a live credential — never commit it.**

Configure the target server and default campaign with:

```bash
npm run aleph config            # view/set serverUrl, campaignId, …
```

## What it covers

There's a command group per domain — the CLI surface mirrors the app:

`config` · `login` · `logout` · `campaign` · `entity` · `character` · `session` · `session-group` · `member` · `search` · `roll` · `organization` · `location` · `relation` · `map` · `quest` · `calendar` · `timeline` · `item` · `shop` · `currency` · `transaction` · `inventory` · `template` · `tag` · `arc` · `chapter` · `diagram` · `health`

Examples:

```bash
npm run aleph campaign list
npm run aleph character create "Gandalf" --campaign <id> --type npc
npm run aleph character genealogy gandalf --campaign <id> --depth 3
npm run aleph search "ancient sword" --campaign <id>
npm run aleph roll "2d6+3"
```

## How it's built

```
cli/
  bin/aleph.js          executable entry (shebang)
  src/
    index.js            Commander setup, registers every command
    commands/*.js       one file per domain (campaign.js, character.js, …)
    lib/
      client.js         HTTP client (base URL + API key from config, retries, error formatting)
      config.js         config persistence via `conf` → ~/.aleph/config.json
      output.js         pretty terminal output
```

Because the CLI is just an API client, anything it can do is something the server already exposes — and vice versa. **When you add or change a server endpoint, auth flow, or data model, update the CLI alongside it** (`cli/src/commands/`, and `cli/src/lib/client.js` if the HTTP shape changed).

## Keep the skill docs in sync

Two skill files describe the CLI for AI assistants and must be updated **together** whenever commands change:

- `docs/claude-skill.md` — the shareable skill (uses `aleph` / `npx aleph-cli`); installable by other projects.
- `.claude/skills/aleph-cli/SKILL.md` — the local Claude Code skill (uses the absolute `node …/cli/bin/aleph.js` path); bump its frontmatter `version` when updated.
