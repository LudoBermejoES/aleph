---
name: aleph-cli
description: Use the aleph CLI to manage campaigns, entities, characters, locations, organizations, sessions, members, search, and dice rolls. Use when the user asks to list/create/edit/delete anything in Aleph, or when you need to query campaign data to answer questions.
license: MIT
metadata:
  author: aleph
  version: "1.3"
---

You have access to the `aleph` CLI tool at `node /Users/ludo/code/aleph/cli/bin/aleph.js` (or `npm run aleph -- <args>` from the project root). Use it to interact with the running Aleph server.

## Setup

Config is stored at `~/.aleph/config.json`. It contains `url`, `apiKey`, and `apiKeyId`. Check if it exists before running commands that require auth:
```bash
cat ~/.aleph/config.json 2>/dev/null || echo "not configured"
```

To log in (if not already):
```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js login
# prompts for URL, email, password — creates an API key and stores it automatically
```

To set URL manually (then use `aleph login` to generate the key):
```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js config set --url http://localhost:3333
```

> **Note**: Authentication uses `X-API-Key` headers, not `Authorization: Bearer`. The stored credential is `apiKey` (not `token`). If the config has an old `token` field but no `apiKey`, the CLI will prompt to re-login.

## Command Reference

All commands support `--json` for machine-readable output. Always use `--json` when you need to parse results or pipe to further processing.

### Authentication
```bash
aleph login                          # interactive: prompts for URL, email, password — creates and stores an API key
aleph logout                         # revokes the stored API key and clears config
aleph config show                    # show current URL and masked API key
aleph config set --url <url>         # set server URL
```

### Campaigns
```bash
aleph campaign list [--json]
aleph campaign create --name <name> [--description <desc>] [--theme <theme>] [--json]
aleph campaign show <id> [--json]
aleph campaign delete <id> [--yes]   # --yes skips confirmation
```

Themes: `default`, `dark-fantasy`, `cyberpunk`, `cosmic-horror`, `high-fantasy`, `western`, `steampunk`, `eldritch`, `fey-wilds`, `undead`, `superhero`

### Entities (wiki entries)
```bash
aleph entity list --campaign <id> [--type <type>] [--search <q>] [--json]
aleph entity create --campaign <id> --name <name> --type <type> [--content <markdown>] [--json]
aleph entity show --campaign <id> <slug> [--json]
aleph entity edit --campaign <id> <slug> [--name <name>] [--content <markdown>] [--stdin] [--json]
aleph entity delete --campaign <id> <slug> [--yes]
```

Entity types: `location`, `faction`, `npc`, `creature`, `item`, `lore`, `event`, or any custom string.
Use `--stdin` on `entity edit` to pipe Markdown content from a file: `cat notes.md | aleph entity edit --campaign <id> <slug> --stdin`

### Characters
```bash
aleph character list --campaign <id> [--json]
aleph character create --campaign <id> --name <name> [--class <class>] [--json]
aleph character show --campaign <id> <slug> [--json]
```

### Sessions
```bash
aleph session list --campaign <id> [--json]
aleph session create --campaign <id> --title <title> --date <YYYY-MM-DD> [--json]
aleph session show --campaign <id> <slug> [--json]
```

### Members
```bash
aleph member list --campaign <id> [--json]
aleph member invite --campaign <id> --role <role> [--expires <days>] [--json]
```

Roles: `player`, `editor`, `co_dm`

### Organizations
```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js organization list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization create --campaign <id> --name <name> [--type <type>] [--status <status>] [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization show <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization edit <slug> --campaign <id> [--name <name>] [--type <type>] [--status <status>] [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization delete <slug> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization member-add <slug> --campaign <id> --character <characterId> [--role <role>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization member-remove <slug> --campaign <id> --character <characterId>
```

Types: `faction`, `guild`, `army`, `cult`, `government`, `other`
Statuses: `active`, `inactive`, `secret`, `dissolved`

### Locations

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js location list --campaign <id> [--search <q>] [--subtype <subtype>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location create --campaign <id> --name <name> [--subtype <subtype>] [--parent <id>] [--visibility <vis>] [--content <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location show <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location edit <slug> --campaign <id> [--name <name>] [--subtype <subtype>] [--parent <id>] [--visibility <vis>] [--content <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location delete <slug> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js location inhabitants <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location inhabitant-add <slug> --campaign <id> --character <characterId>
node /Users/ludo/code/aleph/cli/bin/aleph.js location inhabitant-remove <slug> --campaign <id> --character <characterId>
node /Users/ludo/code/aleph/cli/bin/aleph.js location organizations <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location org-add <slug> --campaign <id> --org <organizationId>
node /Users/ludo/code/aleph/cli/bin/aleph.js location org-remove <slug> --campaign <id> --org <organizationId>
```

Subtypes: `country`, `region`, `city`, `town`, `village`, `dungeon`, `lair`, `building`, `room`, `wilderness`, `other`

### Search
```bash
aleph search --campaign <id> <query> [--json]
```

Returns entities, characters, and sessions matching the query.

### Dice Rolls
```bash
aleph roll <formula> [--json]                        # local roll (offline)
aleph roll <formula> --campaign <id> [--json]        # server roll (recorded in history)
```

Examples: `aleph roll 2d6+3`, `aleph roll 1d20`, `aleph roll 4d6`

## How to Use This Skill

1. **Before any command**, check config exists:
   ```bash
   cat ~/.aleph/config.json 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const c=JSON.parse(d); console.log('url:', c.url, '| apiKey:', c.apiKey ? c.apiKey.slice(0,14)+'...' : 'MISSING')"
   ```
   If `apiKey` is missing or config doesn't exist, prompt the user to run `aleph login`.

2. **Always use `--json`** when parsing output. The human-readable format uses chalk colors that may not parse cleanly.

3. **IDs vs slugs**: Campaigns use UUIDs (`id`). Entities, characters, and sessions use URL-friendly slugs (e.g. `red-dragon`, `session-5`). Use `--json` on list commands to get both.

4. **Destructive operations**: Use `--yes` flag to skip interactive confirmation prompts when running non-interactively.

5. **Error handling**: The CLI exits with code `2` on API errors and writes the error to stderr. Check `$?` after commands if needed.

6. **API key management**: Users can also manage API keys in the web UI at `/settings` (API Keys section). This is useful if the CLI key needs to be rotated or revoked.

## Workflow Examples

**Find a campaign and list its NPCs:**
```bash
CAMPAIGN=$(node /Users/ludo/code/aleph/cli/bin/aleph.js campaign list --json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d)[0].id)")
node /Users/ludo/code/aleph/cli/bin/aleph.js entity list --campaign $CAMPAIGN --type npc --json
```

**Create an entity from a markdown file:**
```bash
cat dungeon-notes.md | node /Users/ludo/code/aleph/cli/bin/aleph.js entity edit --campaign <id> <slug> --stdin
```

**Roll dice and parse result:**
```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js roll 2d6+3 --json
# → {"formula":"2d6+3","rolls":[4,5],"total":12}
```
