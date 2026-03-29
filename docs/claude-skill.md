---
name: aleph-cli
description: Use the aleph CLI to manage campaigns, entities, characters, locations, organizations, sessions, members, search, and dice rolls. Use when the user asks to list/create/edit/delete anything in Aleph, or when you need to query campaign data to answer questions.
license: MIT
metadata:
  author: aleph
  version: "1.6"
---

You have access to the `aleph` CLI. Run it as `aleph` if installed globally (`npm i -g aleph-cli`), or `npx aleph-cli` otherwise.

## Setup

Config is stored at `~/.aleph/config.json` with `url`, `apiKey`, and `apiKeyId` fields.

Check current config:
```bash
cat ~/.aleph/config.json 2>/dev/null || echo "not configured"
```

Log in (creates an API key and stores it):
```bash
aleph login
# prompts for server URL, email, and password
```

Set server URL manually:
```bash
aleph config set --url https://your-aleph-instance.com
```

You can also override via environment variables: `ALEPH_URL` and `ALEPH_TOKEN`.

> Authentication uses `X-API-Key` headers. The stored credential is `apiKey`. API keys can also be generated and revoked from the Aleph web UI at `/settings`.

## Command Reference

All commands support `--json` for machine-readable output. Always use `--json` when parsing results programmatically.

### Authentication
```bash
aleph login                           # interactive login — creates and stores an API key
aleph logout                          # revokes the stored API key and clears config
aleph config show                     # show current URL and masked API key
aleph config set --url <url>          # set server URL
```

### Campaigns
```bash
aleph campaign list [--json]
aleph campaign create --name <name> [--description <desc>] [--theme <theme>] [--json]
aleph campaign show <id> [--json]
aleph campaign delete <id> [--yes]
```

Available themes: `default`, `dark-fantasy`, `cyberpunk`, `cosmic-horror`, `high-fantasy`, `western`, `steampunk`, `eldritch`, `fey-wilds`, `undead`, `superhero`

### Entities (wiki entries)
```bash
aleph entity list --campaign <id> [--type <type>] [--search <q>] [--json]
aleph entity create --campaign <id> --name <name> --type <type> [--content <markdown>] [--json]
aleph entity show --campaign <id> <slug> [--json]
aleph entity edit --campaign <id> <slug> [--name <name>] [--content <markdown>] [--stdin] [--json]
aleph entity delete --campaign <id> <slug> [--yes]
aleph entity upload-image --campaign <id> --slug <slug> --file <path> [--json]
```

Entity types: `location`, `faction`, `npc`, `creature`, `item`, `lore`, `event`, or any custom string.
Pipe content from a file: `cat notes.md | aleph entity edit --campaign <id> <slug> --stdin`
`upload-image` accepts PNG, JPEG, or WebP files up to 10 MB. The image is shown on the entity detail page in the web UI.

### Characters
```bash
aleph character list --campaign <id> [--status <alive|dead|missing|unknown>] [--race <race>] [--class <class>] [--alignment <alignment>] [--sort <name|updatedAt|status|race|class>] [--sort-dir <asc|desc>] [--json]
aleph character create --campaign <id> --name <name> [--class <class>] [--json]
aleph character show --campaign <id> <slug> [--json]
aleph character update --campaign <id> <slug> [--name <n>] [--race <r>] [--class <c>] [--alignment <a>] [--status <s>] [--content <md>] [--stdin]
aleph character upload-portrait --campaign <id> --slug <slug> --file <path>
aleph character connect <slug> --campaign <id> --target <entity-slug> [--label <text>] [--description <text>] [--json]
aleph character connections <slug> --campaign <id> [--json]
```

`upload-portrait` accepts PNG, JPEG, or WebP files up to 10 MB. The portrait is shown on the character detail page in the web UI.

### Sessions
```bash
aleph session list --campaign <id> [--json]
aleph session create --campaign <id> --title <title> --date <YYYY-MM-DD> [--json]
aleph session show --campaign <id> <slug> [--json]
```

### Members
```bash
aleph member list --campaign <id> [--json]
aleph member invite --campaign <id> --role <role> [--json]
```

Roles: `player`, `editor`, `co_dm`

### Search
```bash
aleph search --campaign <id> <query> [--json]
```

### Organizations
```bash
aleph organization list --campaign <id> [--json]
aleph organization create --campaign <id> --name <name> [--type <type>] [--status <status>] [--description <desc>] [--json]
aleph organization show <slug> --campaign <id> [--json]
aleph organization edit <slug> --campaign <id> [--name <name>] [--type <type>] [--status <status>] [--description <desc>] [--json]
aleph organization delete <slug> --campaign <id> [--yes]
aleph organization member-add <slug> --campaign <id> --character <characterId> [--role <role>] [--json]
aleph organization member-remove <slug> --campaign <id> --character <characterId>
```

Types: `faction`, `guild`, `army`, `cult`, `government`, `other`
Statuses: `active`, `inactive`, `secret`, `dissolved`

### Locations

```bash
aleph location list --campaign <id> [--search <q>] [--subtype <subtype>] [--json]
aleph location create --campaign <id> --name <name> [--subtype <subtype>] [--parent <id>] [--visibility <vis>] [--content <text>] [--json]
aleph location show <slug> --campaign <id> [--json]
aleph location edit <slug> --campaign <id> [--name <name>] [--subtype <subtype>] [--parent <id>] [--visibility <vis>] [--content <text>] [--json]
aleph location delete <slug> --campaign <id> [--yes]
aleph location inhabitants <slug> --campaign <id> [--json]
aleph location inhabitant-add <slug> --campaign <id> --character <characterId>
aleph location inhabitant-remove <slug> --campaign <id> --character <characterId>
aleph location organizations <slug> --campaign <id> [--json]
aleph location org-add <slug> --campaign <id> --org <organizationId>
aleph location org-remove <slug> --campaign <id> --org <organizationId>
```

Subtypes: `country`, `region`, `city`, `town`, `village`, `dungeon`, `lair`, `building`, `room`, `wilderness`, `other`

### Relations

```bash
aleph relation create --campaign <id> --source <entity-slug> --target <entity-slug> [--type <type-slug>] [--forward <label>] [--reverse <label>] [--attitude <-100..100>] [--description <text>] [--json]
aleph relation list --campaign <id> [--entity <entity-slug>] [--json]
aleph relation delete <relationId> --campaign <id> [--yes]
```

Relations are bidirectional links between any two entities with forward/reverse labels and an optional attitude score (-100 = hostile, 0 = neutral, 100 = allied).

### Dice Rolls
```bash
aleph roll <formula> [--json]                      # local (offline)
aleph roll <formula> --campaign <id> [--json]      # server roll, recorded in session history
```

Examples: `aleph roll 2d6+3`, `aleph roll 1d20`, `aleph roll 4d6kh3`

## How to Use This Skill

1. **Check config before any command** — if `apiKey` is missing, prompt the user to run `aleph login`.

2. **Always use `--json`** when parsing output. Human-readable output uses chalk colors that don't parse cleanly.

3. **IDs vs slugs**: Campaigns use UUIDs (`id`). Entities, characters, and sessions use URL-friendly slugs (e.g. `red-dragon`, `session-5`). Use `--json` on list commands to get both.

4. **Destructive operations**: Pass `--yes` to skip interactive confirmation prompts when running non-interactively.

5. **Exit codes**: `0` = success, `1` = usage error, `2` = API error. Errors are written to stderr.

## Workflow Examples

**List all campaigns then fetch NPCs from the first one:**
```bash
aleph campaign list --json
aleph entity list --campaign <id> --type npc --json
```

**Create a location from a file:**
```bash
aleph entity create --campaign <id> --name "Castle Ravenloft" --type location
cat ravenloft-notes.md | aleph entity edit --campaign <id> castle-ravenloft --stdin
```

**Roll dice:**
```bash
aleph roll 2d6+3 --json
# → {"formula":"2d6+3","rolls":[4,5],"total":12}
```

## Installing This Skill in Another Project

Copy this file to `.claude/skills/aleph-cli/SKILL.md` in your project:

```bash
mkdir -p .claude/skills/aleph-cli
curl -o .claude/skills/aleph-cli/SKILL.md \
  https://raw.githubusercontent.com/LudoBermejoES/aleph/master/docs/claude-skill.md
```

Or install globally (available in all projects):

```bash
mkdir -p ~/.claude/skills/aleph-cli
curl -o ~/.claude/skills/aleph-cli/SKILL.md \
  https://raw.githubusercontent.com/LudoBermejoES/aleph/master/docs/claude-skill.md
```
