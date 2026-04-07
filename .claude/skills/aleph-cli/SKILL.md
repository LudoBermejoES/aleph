---
name: aleph-cli
description: Use the aleph CLI to manage campaigns, entities, characters, locations, organizations, sessions, members, maps, quests, calendars, timelines, items, shops, currencies, transactions, inventories, templates, tags, arcs, chapters, and dice rolls. Use when the user asks to list/create/edit/delete anything in Aleph, or when you need to query campaign data to answer questions.
license: MIT
metadata:
  author: aleph
  version: '3.1'
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
aleph campaign export <id> --output <file.zip> [--include <types>]  # exports as ZIP archive (--output required)
aleph campaign import <file.zip|file.json> [--name <name>]  # import from ZIP (v1.2) or legacy JSON (v1.0/v1.1)
```

Themes: `default`, `dark-fantasy`, `cyberpunk`, `cosmic-horror`, `high-fantasy`, `western`, `steampunk`, `eldritch`, `fey-wilds`, `undead`, `superhero`

### Entities (wiki entries)

```bash
aleph entity list --campaign <id> [--type <type>] [--search <q>] [--json]
aleph entity create --campaign <id> --name <name> --type <type> [--content <markdown>] [--json]
aleph entity show --campaign <id> <slug> [--json]
aleph entity edit --campaign <id> <slug> [--name <name>] [--content <markdown>] [--stdin] [--json]
aleph entity delete --campaign <id> <slug> [--yes]
aleph entity upload-image --campaign <id> --slug <slug> --file <path> [--json]
aleph entity type-update <typeId> --campaign <id> [--name <name>]
aleph entity type-delete <typeId> --campaign <id> [--yes]
```

Entity types: `location`, `faction`, `npc`, `creature`, `item`, `lore`, `event`, or any custom string.
Use `--stdin` on `entity edit` to pipe Markdown content from a file: `cat notes.md | aleph entity edit --campaign <id> <slug> --stdin`
`upload-image` accepts PNG, JPEG, or WebP files up to 10 MB. The image is shown on the entity detail page in the web UI.

### Characters

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js character list --campaign <id> [--status <alive|dead|missing|unknown>] [--race <race>] [--class <class>] [--alignment <alignment>] [--sort <name|updatedAt|status|race|class>] [--sort-dir <asc|desc>] [--page <n>] [--limit <n>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character create --campaign <id> --name <name> [--class <class>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character show --campaign <id> <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character update --campaign <id> <slug> [--name <n>] [--race <r>] [--class <c>] [--alignment <a>] [--status <s>] [--content <md>] [--stdin]
node /Users/ludo/code/aleph/cli/bin/aleph.js character upload-portrait --campaign <id> --slug <slug> --file <path>
node /Users/ludo/code/aleph/cli/bin/aleph.js character connect <slug> --campaign <id> --target <entity-slug> [--label <text>] [--description <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character connections <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character connection-delete <slug> <connectionId> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js character ability-delete <slug> <abilityId> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js character folder-update <folderId> --campaign <id> [--name <name>]
node /Users/ludo/code/aleph/cli/bin/aleph.js character folder-delete <folderId> --campaign <id> [--yes]
```

`upload-portrait` accepts PNG, JPEG, or WebP files up to 10 MB.

### Sessions

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js session list --campaign <id> [--group <slug>] [--page <n>] [--limit <n>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js session create --campaign <id> --title <title> [--date <YYYY-MM-DD>] [--group <slug>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js session show <slug> --campaign <id> [--json]   # includes groupName, hasManualNotes/hasAiNotes/hasSummary
node /Users/ludo/code/aleph/cli/bin/aleph.js session update <slug> --campaign <id> [--title <title>] [--date <YYYY-MM-DD>] [--status planned|active|completed|cancelled] [--group <slug>]
node /Users/ludo/code/aleph/cli/bin/aleph.js session delete <slug> --campaign <id> [--yes]  # --yes skips confirmation prompt

# Session content (notes)
node /Users/ludo/code/aleph/cli/bin/aleph.js session content get <slug> --campaign <id> [--type manual_notes|ai_notes|summary]  # omit --type to show all
node /Users/ludo/code/aleph/cli/bin/aleph.js session content set <slug> --campaign <id> --type manual_notes|ai_notes|summary [--file <path>]  # reads from file or stdin
node /Users/ludo/code/aleph/cli/bin/aleph.js session content delete <slug> <contentId> --campaign <id> [--yes]  # delete a content entry by ID

# Attendance / RSVP
node /Users/ludo/code/aleph/cli/bin/aleph.js session attendance set <slug> --campaign <id> --status pending|accepted|declined|tentative

# AI generation (requires AI_PROVIDER + AI_API_KEY configured on the server)
node /Users/ludo/code/aleph/cli/bin/aleph.js session summarize <slug> --campaign <id> [--type summary|ai_notes] [--force]  # --type defaults to summary; --force skips confirmation
```

### Session Groups

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js session-group list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js session-group create --campaign <id> --name <name> [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js session-group update <slug> --campaign <id> [--name <name>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js session-group delete <slug> --campaign <id> [--yes]  # --yes skips confirmation; sessions become unassigned
```

### Members

```bash
aleph member list --campaign <id> [--json]
aleph member invite --campaign <id> --role <role> [--expires <days>] [--json]
# Prints: "Join URL: <server>/join?token=<token>&campaign=<id>"
# Share this URL with the invitee — they can register or log in and join in one step
```

Roles: `player`, `editor`, `co_dm`

### Organizations

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js organization list --campaign <id> [--page <n>] [--limit <n>] [--json]
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
node /Users/ludo/code/aleph/cli/bin/aleph.js location list --campaign <id> [--search <q>] [--subtype <subtype>] [--page <n>] [--limit <n>] [--json]
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

### Relations

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js relation create --campaign <id> --source <entity-slug> --target <entity-slug> [--type <type-slug>] [--forward <label>] [--reverse <label>] [--attitude <-100..100>] [--description <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js relation list --campaign <id> [--entity <entity-slug>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js relation delete <relationId> --campaign <id> [--yes]
```

Relations are bidirectional links between any two entities with forward/reverse labels and an optional attitude score (-100 = hostile, 0 = neutral, 100 = allied).

### Maps

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js map list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js map get --campaign <id> --slug <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js map create --campaign <id> --name <name> [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js map update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js map delete --campaign <id> --slug <slug> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js map upload --campaign <id> --slug <slug> --file <path>
node /Users/ludo/code/aleph/cli/bin/aleph.js map pins --campaign <id> --slug <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js map pin-add --campaign <id> --slug <slug> --label <label> --x <x> --y <y> [--entity <slug>]
node /Users/ludo/code/aleph/cli/bin/aleph.js map pin-delete --campaign <id> --slug <slug> --pin <pinId>
node /Users/ludo/code/aleph/cli/bin/aleph.js map layer-update --campaign <id> --slug <slug> --layer <layerId> [--name <name>] [--opacity <n>]
node /Users/ludo/code/aleph/cli/bin/aleph.js map layer-delete --campaign <id> --slug <slug> --layer <layerId> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js map region-update --campaign <id> --slug <slug> --region <regionId> [--name <name>]
node /Users/ludo/code/aleph/cli/bin/aleph.js map region-delete --campaign <id> --slug <slug> --region <regionId> [--yes]
```

### Quests

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js quest list --campaign <id> [--status <status>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js quest create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js quest update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js quest delete --campaign <id> --slug <slug> [--yes]
```

Quest statuses: `active`, `completed`, `failed`, `inactive`

### Calendars

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar get --campaign <id> --calendar <calendarId> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar create --campaign <id> --name <name> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar update --campaign <id> --calendar <calendarId> [--name <name>]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar delete --campaign <id> --calendar <calendarId> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar advance --campaign <id> --calendar <calendarId> --days <n>
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar events --campaign <id> --calendar <calendarId> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar event-add --campaign <id> --calendar <calendarId> --name <name> --day <day> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js calendar event-delete --campaign <id> --calendar <calendarId> --event <eventId> [--yes]
```

### Timelines

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline get --campaign <id> --slug <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline create --campaign <id> --name <name> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline delete --campaign <id> --slug <slug> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline event-add --campaign <id> --slug <slug> --name <name> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js timeline event-delete --campaign <id> --slug <slug> --event <eventId> [--yes]
```

### Items

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js item list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js item create --campaign <id> --name <name> [--price <json>] [--rarity <rarity>] [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js item update --campaign <id> --id <itemId> [--name <name>] [--rarity <rarity>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js item delete --campaign <id> --id <itemId> [--yes]
```

### Shops

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js shop list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop get --campaign <id> --slug <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop create --campaign <id> --name <name> [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop delete --campaign <id> --slug <slug> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop stock --campaign <id> --slug <slug> --item <itemId> --quantity <n> [--unavailable]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop stock-update --campaign <id> --slug <slug> --stock-id <stockId> [--quantity <n>] [--available|--unavailable]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop stock-delete --campaign <id> --slug <slug> --stock-id <stockId> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop buy --campaign <id> --slug <slug> --item <itemId> --quantity <n> --buyer <inventoryId>
node /Users/ludo/code/aleph/cli/bin/aleph.js shop sell --campaign <id> --slug <slug> --item <itemId> --quantity <n> --seller <inventoryId>
node /Users/ludo/code/aleph/cli/bin/aleph.js shop till --campaign <id> --slug <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js shop withdraw --campaign <id> --slug <slug> --amounts '{"gp":10}'
```

### Currencies

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js currency list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js currency create --campaign <id> --name <name> --symbol <symbol> --value <n>
node /Users/ludo/code/aleph/cli/bin/aleph.js currency update --campaign <id> --id <currencyId> [--name <name>] [--symbol <symbol>] [--value <n>]
node /Users/ludo/code/aleph/cli/bin/aleph.js currency delete --campaign <id> --id <currencyId> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js currency convert --campaign <id> --amount <n> --from <symbol> --to <symbol>
```

### Transactions

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js transaction list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js transaction create --campaign <id> --type <type> --amounts '{"gp":10}' [--from <entityId>] [--to <entityId>] [--notes <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js transaction update --campaign <id> --id <txId> [--notes <text>] [--amounts <json>]
node /Users/ludo/code/aleph/cli/bin/aleph.js transaction delete --campaign <id> --id <txId> [--yes]
```

Transaction types: `purchase`, `sale`, `transfer`, `trade`, `deposit`, `withdrawal`, `grant`

### Inventories

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js inventory list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js inventory create --campaign <id> --owner-type <type> --owner-id <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js inventory delete --campaign <id> --id <inventoryId> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js inventory add-item --campaign <id> --inventory <inventoryId> --item <itemId> --quantity <n>
node /Users/ludo/code/aleph/cli/bin/aleph.js inventory item-delete --campaign <id> --inventory <inventoryId> --item <itemId> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js inventory transfer --campaign <id> --from <inventoryId> --to <inventoryId> --item <itemId> --quantity <n>
```

Owner types: `character`, `party`, `shop`, `faction`

### Templates

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js template list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js template get --campaign <id> --id <templateId> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js template create --campaign <id> --name <name> --entity-type <type> [--content <json>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js template update --campaign <id> --id <templateId> [--name <name>] [--content <json>]
node /Users/ludo/code/aleph/cli/bin/aleph.js template delete --campaign <id> --id <templateId> [--yes]
```

### Tags

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js tag list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js tag create --campaign <id> --name <name> [--color <hex>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js tag delete --campaign <id> --id <tagId> [--yes]
```

### Arcs

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js arc list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js arc create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js arc update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js arc delete --campaign <id> --slug <slug> [--yes]
```

### Chapters

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter list --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter create --campaign <id> --name <name> [--arc <arcId>] [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter update --campaign <id> --slug <slug> [--name <name>] [--description <desc>]
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter delete --campaign <id> --slug <slug> [--yes]
```

### Diagrams

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js diagram list --campaign <id> [--json]                            # list all diagrams
node /Users/ludo/code/aleph/cli/bin/aleph.js diagram create --campaign <id> --title <title> [--type <type>] [--json]  # create diagram
node /Users/ludo/code/aleph/cli/bin/aleph.js diagram delete <diagramId> --campaign <id> [--yes]               # delete with confirmation
node /Users/ludo/code/aleph/cli/bin/aleph.js diagram generate --campaign <id> --type <type> [--title <title>] [--json]  # generate from data
```

Diagram types for `--type`: `entity-graph`, `quest-tree`, `faction-web`, `session-timeline`

### Health

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js health [--json]    # check server connectivity and status
```

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
