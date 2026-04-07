---
name: aleph-cli
description: Use the aleph CLI to manage campaigns, entities, characters, locations, organizations, sessions, members, maps, quests, calendars, timelines, items, shops, currencies, transactions, inventories, templates, tags, arcs, chapters, and dice rolls. Use when the user asks to list/create/edit/delete anything in Aleph, or when you need to query campaign data to answer questions.
license: MIT
metadata:
  author: aleph
  version: '1.9'
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
aleph campaign export <id> --output <file.zip> [--include <types>]
aleph campaign import <file.zip|file.json> [--name <name>]
```

Available themes: `default`, `dark-fantasy`, `cyberpunk`, `cosmic-horror`, `high-fantasy`, `western`, `steampunk`, `eldritch`, `fey-wilds`, `undead`, `superhero`

### Entities (wiki entries)

```bash
aleph entity list --campaign <id> [--type <type>] [--search <q>] [--json]
aleph entity create --campaign <id> --name <name> --type <type> [--content <markdown>] [--json]
aleph entity show --campaign <id> <slug> [--json]
aleph entity edit --campaign <id> <slug> [--name <name>] [--content <markdown>] [--stdin] [--board-summary <text>] [--json]
aleph entity delete --campaign <id> <slug> [--yes]
aleph entity upload-image --campaign <id> --slug <slug> --file <path> [--json]
aleph entity type-update <typeId> --campaign <id> [--name <name>]
aleph entity type-delete <typeId> --campaign <id> [--yes]
```

Entity types: `location`, `faction`, `npc`, `creature`, `item`, `lore`, `event`, or any custom string.
Pipe content from a file: `cat notes.md | aleph entity edit --campaign <id> <slug> --stdin`
`--board-summary` sets a short graph card label (max 120 chars, separate from the main summary). Pass an empty string to clear it.
`upload-image` accepts PNG, JPEG, or WebP files up to 10 MB. The image is shown on the entity detail page in the web UI.

### Characters

```bash
aleph character list --campaign <id> [--status <alive|dead|missing|unknown>] [--race <race>] [--class <class>] [--alignment <alignment>] [--sort <name|updatedAt|status|race|class>] [--sort-dir <asc|desc>] [--page <n>] [--limit <n>] [--json]
aleph character create --campaign <id> --name <name> [--class <class>] [--json]
aleph character show --campaign <id> <slug> [--json]
aleph character update --campaign <id> <slug> [--name <n>] [--race <r>] [--class <c>] [--alignment <a>] [--status <s>] [--content <md>] [--stdin]
aleph character upload-portrait --campaign <id> --slug <slug> --file <path>
aleph character connect <slug> --campaign <id> --target <entity-slug> [--label <text>] [--description <text>] [--json]
aleph character connections <slug> --campaign <id> [--json]
aleph character connection-delete <slug> <connectionId> --campaign <id> [--yes]
aleph character ability-delete <slug> <abilityId> --campaign <id> [--yes]
aleph character folder-update <folderId> --campaign <id> [--name <name>]
aleph character folder-delete <folderId> --campaign <id> [--yes]
```

`upload-portrait` accepts PNG, JPEG, or WebP files up to 10 MB. The portrait is shown on the character detail page in the web UI.

### Sessions

```bash
aleph session list --campaign <id> [--group <slug>] [--page <n>] [--limit <n>] [--json]
aleph session create --campaign <id> --title <title> [--date <YYYY-MM-DD>] [--group <slug>] [--json]
aleph session show <slug> --campaign <id> [--json]   # includes groupName, hasManualNotes/hasAiNotes/hasSummary
aleph session update <slug> --campaign <id> [--title <title>] [--date <YYYY-MM-DD>] [--status planned|active|completed|cancelled] [--group <slug>]
aleph session delete <slug> --campaign <id> [--yes]  # --yes skips confirmation prompt

# Session content (notes)
aleph session content get <slug> --campaign <id> [--type manual_notes|ai_notes|summary]  # omit --type to show all
aleph session content set <slug> --campaign <id> --type manual_notes|ai_notes|summary [--file <path>]  # reads from file or stdin
aleph session content delete <slug> <contentId> --campaign <id> [--yes]  # delete a content entry by ID

# Attendance / RSVP
aleph session attendance set <slug> --campaign <id> --status pending|accepted|declined|tentative

# AI generation (requires AI_PROVIDER + AI_API_KEY configured on the server)
aleph session summarize <slug> --campaign <id> [--type summary|ai_notes] [--force]  # --type defaults to summary; --force skips confirmation
```

### Session Groups

```bash
aleph session-group list --campaign <id> [--json]
aleph session-group create --campaign <id> --name <name> [--description <desc>] [--json]
aleph session-group update <slug> --campaign <id> [--name <name>] [--description <desc>]
aleph session-group delete <slug> --campaign <id> [--yes]  # --yes skips confirmation; sessions become unassigned
```

### Members

```bash
aleph member list --campaign <id> [--json]
aleph member invite --campaign <id> --role <role> [--expires <days>] [--json]
# Prints: "Join URL: <server>/join?token=<token>&campaign=<id>"
# Share this URL with the invitee — they can register or log in and join in one step
```

Roles: `player`, `editor`, `co_dm`

### Search

```bash
aleph search --campaign <id> <query> [--json]
```

### Organizations

```bash
aleph organization list --campaign <id> [--page <n>] [--limit <n>] [--json]
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
aleph location list --campaign <id> [--search <q>] [--subtype <subtype>] [--page <n>] [--limit <n>] [--json]
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

### Maps

```bash
aleph map list --campaign <id> [--json]
aleph map get --campaign <id> --slug <slug> [--json]
aleph map create --campaign <id> --name <name> [--description <desc>] [--json]
aleph map update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
aleph map delete --campaign <id> --slug <slug> [--yes]
aleph map upload --campaign <id> --slug <slug> --file <path>
aleph map pins --campaign <id> --slug <slug> [--json]
aleph map pin-add --campaign <id> --slug <slug> --label <label> --x <x> --y <y> [--entity <slug>]
aleph map pin-delete --campaign <id> --slug <slug> --pin <pinId>
aleph map layer-update --campaign <id> --slug <slug> --layer <layerId> [--name <name>] [--opacity <n>]
aleph map layer-delete --campaign <id> --slug <slug> --layer <layerId> [--yes]
aleph map region-update --campaign <id> --slug <slug> --region <regionId> [--name <name>]
aleph map region-delete --campaign <id> --slug <slug> --region <regionId> [--yes]
```

### Quests

```bash
aleph quest list --campaign <id> [--status <status>] [--json]
aleph quest create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--json]
aleph quest update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]
aleph quest delete --campaign <id> --slug <slug> [--yes]
```

Quest statuses: `active`, `completed`, `failed`, `inactive`

### Calendars

```bash
aleph calendar list --campaign <id> [--json]
aleph calendar get --campaign <id> --calendar <calendarId> [--json]
aleph calendar create --campaign <id> --name <name> [--json]
aleph calendar update --campaign <id> --calendar <calendarId> [--name <name>]
aleph calendar delete --campaign <id> --calendar <calendarId> [--yes]
aleph calendar advance --campaign <id> --calendar <calendarId> --days <n>
aleph calendar events --campaign <id> --calendar <calendarId> [--json]
aleph calendar event-add --campaign <id> --calendar <calendarId> --name <name> --day <day> [--json]
aleph calendar event-delete --campaign <id> --calendar <calendarId> --event <eventId> [--yes]
```

### Timelines

```bash
aleph timeline list --campaign <id> [--json]
aleph timeline get --campaign <id> --slug <slug> [--json]
aleph timeline create --campaign <id> --name <name> [--json]
aleph timeline update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
aleph timeline delete --campaign <id> --slug <slug> [--yes]
aleph timeline event-add --campaign <id> --slug <slug> --name <name> [--json]
aleph timeline event-delete --campaign <id> --slug <slug> --event <eventId> [--yes]
```

### Items

```bash
aleph item list --campaign <id> [--json]
aleph item create --campaign <id> --name <name> [--price <json>] [--rarity <rarity>] [--description <desc>] [--json]
aleph item update --campaign <id> --id <itemId> [--name <name>] [--rarity <rarity>] [--description <desc>]
aleph item delete --campaign <id> --id <itemId> [--yes]
```

### Shops

```bash
aleph shop list --campaign <id> [--json]
aleph shop get --campaign <id> --slug <slug> [--json]
aleph shop create --campaign <id> --name <name> [--description <desc>] [--json]
aleph shop update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
aleph shop delete --campaign <id> --slug <slug> [--yes]
aleph shop stock --campaign <id> --slug <slug> --item <itemId> --quantity <n> [--unavailable]
aleph shop stock-update --campaign <id> --slug <slug> --stock-id <stockId> [--quantity <n>] [--available|--unavailable]
aleph shop stock-delete --campaign <id> --slug <slug> --stock-id <stockId> [--yes]
aleph shop buy --campaign <id> --slug <slug> --item <itemId> --quantity <n> --buyer <inventoryId>
aleph shop sell --campaign <id> --slug <slug> --item <itemId> --quantity <n> --seller <inventoryId>
aleph shop till --campaign <id> --slug <slug> [--json]
aleph shop withdraw --campaign <id> --slug <slug> --amounts '{"gp":10}'
```

### Currencies

```bash
aleph currency list --campaign <id> [--json]
aleph currency create --campaign <id> --name <name> --symbol <symbol> --value <n>
aleph currency update --campaign <id> --id <currencyId> [--name <name>] [--symbol <symbol>] [--value <n>]
aleph currency delete --campaign <id> --id <currencyId> [--yes]
aleph currency convert --campaign <id> --amount <n> --from <symbol> --to <symbol>
```

### Transactions

```bash
aleph transaction list --campaign <id> [--json]
aleph transaction create --campaign <id> --type <type> --amounts '{"gp":10}' [--from <entityId>] [--to <entityId>] [--notes <text>] [--json]
aleph transaction update --campaign <id> --id <txId> [--notes <text>] [--amounts <json>]
aleph transaction delete --campaign <id> --id <txId> [--yes]
```

Transaction types: `purchase`, `sale`, `transfer`, `trade`, `deposit`, `withdrawal`, `grant`

### Inventories

```bash
aleph inventory list --campaign <id> [--json]
aleph inventory create --campaign <id> --owner-type <type> --owner-id <id> [--json]
aleph inventory delete --campaign <id> --id <inventoryId> [--yes]
aleph inventory add-item --campaign <id> --inventory <inventoryId> --item <itemId> --quantity <n>
aleph inventory item-delete --campaign <id> --inventory <inventoryId> --item <itemId> [--yes]
aleph inventory transfer --campaign <id> --from <inventoryId> --to <inventoryId> --item <itemId> --quantity <n>
```

Owner types: `character`, `party`, `shop`, `faction`

### Templates

```bash
aleph template list --campaign <id> [--json]
aleph template get --campaign <id> --id <templateId> [--json]
aleph template create --campaign <id> --name <name> --entity-type <type> [--content <json>] [--json]
aleph template update --campaign <id> --id <templateId> [--name <name>] [--content <json>]
aleph template delete --campaign <id> --id <templateId> [--yes]
```

### Tags

```bash
aleph tag list --campaign <id> [--json]
aleph tag create --campaign <id> --name <name> [--color <hex>] [--json]
aleph tag delete --campaign <id> --id <tagId> [--yes]
```

### Arcs

```bash
aleph arc list --campaign <id> [--json]
aleph arc create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--json]
aleph arc update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]
aleph arc delete --campaign <id> --slug <slug> [--yes]
```

### Chapters

```bash
aleph chapter list --campaign <id> [--json]
aleph chapter create --campaign <id> --name <name> [--arc <arcId>] [--description <desc>] [--json]
aleph chapter update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
aleph chapter delete --campaign <id> --slug <slug> [--yes]
```

### Diagrams

```bash
aleph diagram list --campaign <id> [--json]                            # list all diagrams
aleph diagram create --campaign <id> --title <title> [--type <type>] [--json]  # create diagram
aleph diagram delete <diagramId> --campaign <id> [--yes]               # delete with confirmation
aleph diagram generate --campaign <id> --type <type> [--title <title>] [--json]  # generate from data
```

Diagram types for `--type`: `entity-graph`, `quest-tree`, `faction-web`, `session-timeline`

### Health

```bash
aleph health [--json]    # check server connectivity and status
```

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
