---
name: aleph-cli
description: Use the aleph CLI to manage campaigns, entities, characters, locations, organizations, sessions, members, maps, quests, calendars, timelines, items, shops, currencies, transactions, inventories, templates, tags, arcs, chapters, and dice rolls. Use when the user asks to list/create/edit/delete anything in Aleph, or when you need to query campaign data to answer questions.
license: MIT
metadata:
  author: aleph
  version: '3.15'
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
aleph entity edit --campaign <id> <slug> [--name <name>] [--content <markdown>] [--stdin] [--board-summary <text>] [--json]
aleph entity delete --campaign <id> <slug> [--yes]
aleph entity upload-image --campaign <id> --slug <slug> --file <path> [--json]
aleph entity type-update <typeId> --campaign <id> [--name <name>]
aleph entity type-delete <typeId> --campaign <id> [--yes]

# Nicknames — alternate names/aliases that also resolve in auto-linking (case-insensitive, word-boundary)
aleph entity nickname list <slug> --campaign <id> [--json]
aleph entity nickname add <slug> <nickname> --campaign <id> [--json]
aleph entity nickname remove <slug> <nickname> --campaign <id>
```

Entity types: `location`, `faction`, `npc`, `creature`, `item`, `lore`, `event`, or any custom string.
Use `--stdin` on `entity edit` to pipe Markdown content from a file: `cat notes.md | aleph entity edit --campaign <id> <slug> --stdin`
`--board-summary` sets a short graph card label (max 120 chars, separate from the main summary). Pass an empty string to clear it.
`upload-image` accepts PNG, JPEG, or WebP files up to 10 MB. The image is shown on the entity detail page in the web UI.
Nicknames work on any entity (including characters, locations, and organizations — they all share the same underlying entity record and slug). A nickname must be non-empty and unique per entity (case-insensitive); duplicates return 409. Nicknames participate in the same auto-linking system as primary names: typing a nickname in a session, history, or any other text field renders it as a clickable link to that entity.

### Characters

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js character list --campaign <id> [--status <alive|dead|missing|unknown>] [--sort <name|updatedAt|status>] [--sort-dir <asc|desc>] [--page <n>] [--limit <n>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character create --campaign <id> --name <name> [--type <pc|npc>] [--status <alive|dead|missing|unknown>] [--gender <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character show --campaign <id> <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character update --campaign <id> <slug> [--name <n>] [--type <pc|npc>] [--template-id <id>] [--fields <json>] [--status <alive|dead|missing|unknown>] [--content <md>] [--stdin] [--backstory <md>] [--backstory-stdin] [--history <md>] [--history-stdin] [--current-status <md>] [--current-status-stdin] [--birth-year <year>] [--death-year <year|"">] [--gender <text|"">] [--owner <userId|"">]
# IMPORTANT: Keep these fields up to date after each session:
#   --status          : alive|dead|missing|unknown — update immediately if a character dies or disappears
#   --current-status  : narrative summary of where the character is and what they are doing RIGHT NOW
#                       Should reflect the most recent session events: location, active goals, key relationships formed, pending bets/promises, etc.
#                       Must be updated for ALL characters (PC and NPC) after each session that involves them.
#   --backstory       : permanent background that doesn't change (origin, formative events)
#   --history         : session-by-session chronicle of what has happened to the character over time
node /Users/ludo/code/aleph/cli/bin/aleph.js character notes <slug> --campaign <id> [--json]                                  # every public note on the character, with its author
node /Users/ludo/code/aleph/cli/bin/aleph.js character note-show <slug> --campaign <id> [--json]                              # only your own note
node /Users/ludo/code/aleph/cli/bin/aleph.js character note-set <slug> --campaign <id> (--body <md> | --stdin | --clear) [--json]
# Public notes are one row per (character, author): every campaign member who can READ the character
# may write their own note, and no save can overwrite another member's. `note-set` only ever touches
# your own note — there is no route or flag for editing someone else's.
#   --clear (or an empty/whitespace-only --body) DELETES your note rather than storing a blank.
#   A `visitor` gets 403 and the command exits non-zero.
#   A character you cannot read answers 404 — the same as reading it.
node /Users/ludo/code/aleph/cli/bin/aleph.js character upload-portrait --campaign <id> --slug <slug> --file <path>
node /Users/ludo/code/aleph/cli/bin/aleph.js character connect <slug> --campaign <id> --target <entity-slug> [--label <text>] [--description <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character connections <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character connection-delete <slug> <connectionId> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js character ability-delete <slug> <abilityId> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js character folder-update <folderId> --campaign <id> [--name <name>]
node /Users/ludo/code/aleph/cli/bin/aleph.js character folder-delete <folderId> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js character family-add <slug> --campaign <id> --type <parent|child|spouse|sibling> --target <slug> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character family-remove <slug> <relationId> --campaign <id> [--yes]
node /Users/ludo/code/aleph/cli/bin/aleph.js character genealogy <slug> --campaign <id> [--depth <n>] [--format ascii|json]

# Character images (gallery). Exactly one image is the main portrait shown elsewhere.
node /Users/ludo/code/aleph/cli/bin/aleph.js character images <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character image-add <slug> --campaign <id> --file <path> [--caption <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js character image-update <slug> <imageId> --campaign <id> [--caption <text>] [--order <n>]
node /Users/ludo/code/aleph/cli/bin/aleph.js character image-set-primary <slug> <imageId> --campaign <id>
node /Users/ludo/code/aleph/cli/bin/aleph.js character image-remove <slug> <imageId> --campaign <id>
#   --caption travels as a form field, not JSON. `image-update --caption ""` CLEARS the caption.
#   image-update with neither --caption nor --order fails locally without sending a request.
#   Deleting the main image promotes the next one; emptying the gallery clears portraitUrl.
```

`upload-portrait` accepts PNG, JPEG, or WebP files up to 10 MB.

The `character create` and `character update` API endpoints accept optional `templateId` (string) and `fields` (object) parameters for storing template field values. These are not exposed as CLI flags but can be passed directly via the API using `X-API-Key` authentication.

### Sessions

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js session list --campaign <id> [--subcampaign <slug>] [--arc <slug>] [--page <n>] [--limit <n>] [--json]   # table shows arc + chapter names; unknown --arc slug = empty list, not an error
node /Users/ludo/code/aleph/cli/bin/aleph.js session create --campaign <id> --title <title> [--date <YYYY-MM-DD>] [--subcampaign <slug>] [--arc <slug>] [--chapter <slug>] [--json]   # omit --subcampaign to use the campaign's default sub-campaign
node /Users/ludo/code/aleph/cli/bin/aleph.js session show <slug> --campaign <id> [--json]   # includes subCampaignName, arc + chapter names, hasManualNotes/hasAiNotes/hasSummary
node /Users/ludo/code/aleph/cli/bin/aleph.js session update <slug> --campaign <id> [--title <title>] [--date <YYYY-MM-DD>] [--status planned|active|completed|cancelled] [--subcampaign <slug>] [--arc <slug>] [--chapter <slug>]
# --group is a deprecated alias for --subcampaign, kept for one release.
# --arc/--chapter take slugs, resolved server-side. --arc '' unsets the arc (and clears the chapter with it); --chapter '' unsets only the chapter.
# --chapter <slug> alone also sets the arc it belongs to. Unknown slug -> 404, duplicate slug -> 409, chapter not in the named arc -> 422.
node /Users/ludo/code/aleph/cli/bin/aleph.js session delete <slug> --campaign <id> [--yes]  # --yes skips confirmation prompt

# Session content (notes)
node /Users/ludo/code/aleph/cli/bin/aleph.js session content get <slug> --campaign <id> [--type manual_notes|ai_notes|summary]  # omit --type to show all
node /Users/ludo/code/aleph/cli/bin/aleph.js session content set <slug> --campaign <id> --type manual_notes|ai_notes|summary [--file <path>]  # reads from file or stdin
node /Users/ludo/code/aleph/cli/bin/aleph.js session content delete <slug> <contentId> --campaign <id> [--yes]  # delete a content entry by ID

# Attendance / RSVP
node /Users/ludo/code/aleph/cli/bin/aleph.js session attendance set <slug> --campaign <id> --status pending|accepted|declined|tentative
node /Users/ludo/code/aleph/cli/bin/aleph.js session attendance mark <slug> --campaign <id> --characters <slug1,slug2,...> [--absent] [--json]  # DM/co-DM: bulk-mark characters as attended (or absent with --absent)
node /Users/ludo/code/aleph/cli/bin/aleph.js session attendance add <slug> --campaign <id> --user <userId> [--character <id>] [--status pending|accepted|declined|tentative]  # DM/co-DM: add a campaign member as a session participant
node /Users/ludo/code/aleph/cli/bin/aleph.js session attendance remove <slug> --campaign <id> --user <userId>  # DM/co-DM: remove a participant from a session

# AI generation (requires AI_PROVIDER + AI_API_KEY configured on the server)
node /Users/ludo/code/aleph/cli/bin/aleph.js session summarize <slug> --campaign <id> [--type summary|ai_notes] [--force]  # --type defaults to summary; --force skips confirmation

# Import session notes from files (finds or creates session by date)
node /Users/ludo/code/aleph/cli/bin/aleph.js session import --campaign <id> [--manual <file>] [--ai <file>] [--date <YYYY-MM-DD>] [--no-summarize] [--force] [--json]
# At least one of --manual or --ai is required.
# Date is parsed from filename (session-YYYY-MM-DD.md) if not provided.
# Session title defaults to Spanish date format: "26 de abril de 2026".
# If --manual is provided, auto-generates a summary unless --no-summarize is set.
```

### Sub-Campaigns

Organizes arcs, sessions, and quests into named storylines within a single campaign
(e.g. a mage-focused main campaign and a mortals-focused sub-campaign in the same
setting). Every campaign has exactly one default sub-campaign ("General"), auto-created
on campaign creation; arcs/sessions/quests fall back to it when `--subcampaign` is omitted.

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js sub-campaign list --campaign <id> [--json]   # shows name, slug, and whether it's the default
node /Users/ludo/code/aleph/cli/bin/aleph.js sub-campaign create --campaign <id> --name <name> [--description <desc>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js sub-campaign update <slug> --campaign <id> [--name <name>] [--description <desc>]   # the default sub-campaign can be renamed but not deleted
node /Users/ludo/code/aleph/cli/bin/aleph.js sub-campaign delete <slug> --campaign <id> [--yes]  # --yes skips confirmation; arcs/sessions/quests move to the default; deleting the default itself returns 422
```

### Members

```bash
aleph member list --campaign <id> [--json]
aleph member invite --campaign <id> --role <role> [--expires <days>] [--json]
# Prints: "Join URL: <server>/join?token=<token>&campaign=<id>"
# Share this URL with the invitee — they can register or log in and join in one step
aleph member add --campaign <id> --user <userId> --role <role> [--json]
# Directly adds an already-registered user to a campaign (no invite link needed)
# role: visitor | player | editor | co_dm — requires co_dm+ permission
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
node /Users/ludo/code/aleph/cli/bin/aleph.js organization member-update <slug> --campaign <id> --character <characterId> [--role <role>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization member-remove <slug> --campaign <id> --character <characterId>
node /Users/ludo/code/aleph/cli/bin/aleph.js organization upload-image <slug> --campaign <id> --file <path> [--json]

# Organization images (gallery). Exactly one image is the main one shown elsewhere.
node /Users/ludo/code/aleph/cli/bin/aleph.js organization images <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization image-add <slug> --campaign <id> --file <path> [--caption <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization image-update <slug> <imageId> --campaign <id> [--caption <text>] [--order <n>]
node /Users/ludo/code/aleph/cli/bin/aleph.js organization image-set-primary <slug> <imageId> --campaign <id>
node /Users/ludo/code/aleph/cli/bin/aleph.js organization image-remove <slug> <imageId> --campaign <id>
#   --caption travels as a form field, not JSON. `image-update --caption ""` CLEARS the caption.
#   image-update with neither --caption nor --order fails locally without sending a request.
#   Deleting the main image promotes the next one; emptying the gallery clears imageUrl.
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

# Location images (gallery). Exactly one image is the main one shown elsewhere.
node /Users/ludo/code/aleph/cli/bin/aleph.js location images <slug> --campaign <id> [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location image-add <slug> --campaign <id> --file <path> [--caption <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js location image-update <slug> <imageId> --campaign <id> [--caption <text>] [--order <n>]
node /Users/ludo/code/aleph/cli/bin/aleph.js location image-set-primary <slug> <imageId> --campaign <id>
node /Users/ludo/code/aleph/cli/bin/aleph.js location image-remove <slug> <imageId> --campaign <id>
#   MIME type comes from the FILE EXTENSION (png/jpg/jpeg/webp); the server also checks the magic
#   bytes and answers 400 on a mismatch, so renaming a .gif to .png fails.
#   --caption travels as a form field, not JSON. `image-update --caption ""` CLEARS the caption.
#   image-update with neither --caption nor --order fails locally without sending a request.
#   Deleting the main image promotes the next one; emptying the gallery clears the location image.
```

Subtypes: `country`, `region`, `city`, `town`, `village`, `dungeon`, `lair`, `building`, `room`, `wilderness`, `other`

### Relations

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js relation create --campaign <id> --source <entity-slug> --target <entity-slug> [--type <type-slug>] [--forward <label>] [--reverse <label>] [--attitude <-100..100>] [--description <text>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js relation list --campaign <id> [--entity <entity-slug>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js relation delete <relationId> --campaign <id> [--yes]
```

Relations are bidirectional links between any two entities with forward/reverse labels and an optional attitude score (-100 = hostile, 0 = neutral, 100 = allied).

Organizations are first-class entities for relation purposes — their slug works as `--source` or `--target` just like characters, locations, and wiki entries. Example:

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js relation create --campaign <id> --source los-senores-del-tigre --target la-pequena-flor --forward "arrasó" --reverse "arrasada por"
```

Quests are relatable too — a quest's own slug works as `--source`/`--target`, so sub-quests can be linked to a main quest (or to any character/location/other quest) with custom labels, same as everything else:

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js relation create --campaign <id> --source encontrar-al-herrero --target impedir-la-corrupcion-de-tezgul --forward "es parte de" --reverse "incluye la sub-misión"
```

This is independent of `parentQuestId` (the single "sub-quest of" hierarchy shown in the quest tree UI) — use relations when you need a custom label, an attitude score, or a link to something that isn't a quest.

Sessions and arcs are relatable too — link a session to the characters/locations/organizations that were part of it, or an arc to the entities it centers on:

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js relation create --campaign <id> --source la-noche-que-se-trago-a-clara --target clara-bohm --forward "contó con" --reverse "participó en"
node /Users/ludo/code/aleph/cli/bin/aleph.js relation create --campaign <id> --source el-camino-hasta-oda --target la-capilla --forward "parte de" --reverse "es el hogar de la cábala durante"
```

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
node /Users/ludo/code/aleph/cli/bin/aleph.js quest list --campaign <id> [--status <status>] [--subcampaign <slug>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js quest create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--subcampaign <slug>] [--json]   # omit --subcampaign to use the campaign's default sub-campaign
node /Users/ludo/code/aleph/cli/bin/aleph.js quest update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>] [--subcampaign <slug>]
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
node /Users/ludo/code/aleph/cli/bin/aleph.js arc list --campaign <id> [--subcampaign <slug>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js arc create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--sort-order <n>] [--subcampaign <slug>] [--json]   # omit --subcampaign to use the campaign's default sub-campaign
node /Users/ludo/code/aleph/cli/bin/aleph.js arc update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>] [--sort-order <n>] [--subcampaign <slug>]   # --sort-order reorders the arc; must be numeric
node /Users/ludo/code/aleph/cli/bin/aleph.js arc delete --campaign <id> --slug <slug> [--yes]
```

### Chapters

```bash
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter list --campaign <id> [--arc <slug>] [--json]   # campaign-wide (reads the arcs endpoint); shows the arc name, not the arcId
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter create --campaign <id> --name <name> --arc <arcSlug|arcId> [--description <desc>] [--sort-order <n>] [--json]
node /Users/ludo/code/aleph/cli/bin/aleph.js chapter update --campaign <id> --slug <slug> [--name <name>] [--description <desc>] [--sort-order <n>]
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
