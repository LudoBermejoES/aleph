---
name: aleph-cli
description: Use the aleph CLI to manage campaigns, entities, characters, locations, organizations, sessions, members, maps, quests, calendars, timelines, items, shops, currencies, transactions, inventories, templates, tags, arcs, chapters, and dice rolls. Use when the user asks to list/create/edit/delete anything in Aleph, or when you need to query campaign data to answer questions.
license: MIT
metadata:
  author: aleph
  version: '1.14'
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

# Nicknames — alternate names/aliases that also resolve in auto-linking (case-insensitive, word-boundary)
aleph entity nickname list <slug> --campaign <id> [--json]
aleph entity nickname add <slug> <nickname> --campaign <id> [--json]
aleph entity nickname remove <slug> <nickname> --campaign <id>
```

Entity types: `location`, `faction`, `npc`, `creature`, `item`, `lore`, `event`, or any custom string.
Pipe content from a file: `cat notes.md | aleph entity edit --campaign <id> <slug> --stdin`
`--board-summary` sets a short graph card label (max 120 chars, separate from the main summary). Pass an empty string to clear it.
`upload-image` accepts PNG, JPEG, or WebP files up to 10 MB. The image is shown on the entity detail page in the web UI.
Nicknames work on any entity (including characters, locations, and organizations — they all share the same underlying entity record and slug). A nickname must be non-empty and unique per entity (case-insensitive); duplicates return 409. Nicknames participate in the same auto-linking system as primary names: typing a nickname in a session, history, or any other text field renders it as a clickable link to that entity.

### Characters

```bash
aleph character list --campaign <id> [--status <alive|dead|missing|unknown>] [--sort <name|updatedAt|status>] [--sort-dir <asc|desc>] [--page <n>] [--limit <n>] [--json]
aleph character create --campaign <id> --name <name> [--type <pc|npc>] [--status <alive|dead|missing|unknown>] [--gender <text>] [--visibility <public|members|editors|dm_only|private|specific_users>] [--json]
aleph character show --campaign <id> <slug> [--json]
aleph character update --campaign <id> <slug> [--name <n>] [--type <pc|npc>] [--template-id <id>] [--fields <json>] [--status <alive|dead|missing|unknown>] [--content <md>] [--stdin] [--backstory <md>] [--backstory-stdin] [--history <md>] [--history-stdin] [--current-status <md>] [--current-status-stdin] [--birth-year <year>] [--death-year <year|"">] [--gender <text|"">] [--owner <userId|"">] [--visibility <public|members|editors|dm_only|private|specific_users>]
# IMPORTANT: Keep these fields up to date after each session:
#   --status          : alive|dead|missing|unknown — update immediately if a character dies or disappears
#   --current-status  : narrative summary of where the character is and what they are doing RIGHT NOW
#                       Should reflect the most recent session: location, goals, key relationships, pending bets/promises, etc.
#                       Must be updated for ALL characters (PC and NPC) after each session that involves them.
#   --backstory       : permanent background (origin, formative events) — rarely changes
#   --history         : session-by-session chronicle of what has happened over time
aleph character notes <slug> --campaign <id> [--json]                                  # every public note on the character, with its author
aleph character note-show <slug> --campaign <id> [--json]                              # only your own note
aleph character note-set <slug> --campaign <id> (--body <md> | --stdin | --clear) [--json]
# Public notes are one row per (character, author): every campaign member who can READ the character
# may write their own note, and no save can overwrite another member's. `note-set` only ever touches
# your own note — there is no route or flag for editing someone else's.
#   --clear (or an empty/whitespace-only --body) DELETES your note rather than storing a blank.
#   A `visitor` gets 403 and the command exits non-zero.
#   A character you cannot read answers 404 — the same as reading it.
aleph character upload-portrait --campaign <id> --slug <slug> --file <path>
aleph character connect <slug> --campaign <id> --target <entity-slug> [--label <text>] [--description <text>] [--json]
aleph character connections <slug> --campaign <id> [--json]
aleph character connection-delete <slug> <connectionId> --campaign <id> [--yes]
aleph character ability-delete <slug> <abilityId> --campaign <id> [--yes]
aleph character folder-update <folderId> --campaign <id> [--name <name>]
aleph character folder-delete <folderId> --campaign <id> [--yes]
aleph character family-add <slug> --campaign <id> --type <parent|child|spouse|sibling> --target <slug> [--json]
aleph character family-remove <slug> <relationId> --campaign <id> [--yes]
aleph character genealogy <slug> --campaign <id> [--depth <n>] [--format ascii|json]

# Character images (gallery). Exactly one image is the main portrait shown elsewhere.
aleph character images <slug> --campaign <id> [--json]
aleph character image-add <slug> --campaign <id> --file <path> [--caption <text>] [--json]
aleph character image-update <slug> <imageId> --campaign <id> [--caption <text>] [--order <n>]
aleph character image-set-primary <slug> <imageId> --campaign <id>
aleph character image-remove <slug> <imageId> --campaign <id>
#   --caption travels as a form field, not JSON. `image-update --caption ""` CLEARS the caption.
#   image-update with neither --caption nor --order fails locally without sending a request.
#   Deleting the main image promotes the next one; emptying the gallery clears portraitUrl.
```

`upload-portrait` accepts PNG, JPEG, or WebP files up to 10 MB. The portrait is shown on the character detail page in the web UI.

The `character create` and `character update` API endpoints accept optional `templateId` (string) and `fields` (object) parameters for storing template field values. These are not exposed as CLI flags but can be passed directly via the API using `X-API-Key` authentication.

### Sessions

```bash
aleph session list --campaign <id> [--subcampaign <slug>] [--arc <slug>] [--page <n>] [--limit <n>] [--json]   # table shows arc + chapter names; unknown --arc slug = empty list, not an error
aleph session create --campaign <id> --title <title> [--date <YYYY-MM-DD>] [--subcampaign <slug>] [--arc <slug>] [--chapter <slug>] [--json]   # omit --subcampaign to use the campaign's default sub-campaign
aleph session show <slug> --campaign <id> [--json]   # includes subCampaignName, arc + chapter names, hasManualNotes/hasAiNotes/hasSummary
aleph session update <slug> --campaign <id> [--title <title>] [--date <YYYY-MM-DD>] [--status planned|active|completed|cancelled] [--subcampaign <slug>] [--arc <slug>] [--chapter <slug>]
# --group is a deprecated alias for --subcampaign, kept for one release.
# --arc/--chapter take slugs, resolved server-side. --arc '' unsets the arc (and clears the chapter with it); --chapter '' unsets only the chapter.
# --chapter <slug> alone also sets the arc it belongs to. Unknown slug -> 404, duplicate slug -> 409, chapter not in the named arc -> 422.
aleph session delete <slug> --campaign <id> [--yes]  # --yes skips confirmation prompt

# Session content (notes)
aleph session content get <slug> --campaign <id> [--type manual_notes|ai_notes|summary]  # omit --type to show all
aleph session content set <slug> --campaign <id> --type manual_notes|ai_notes|summary [--file <path>]  # reads from file or stdin
aleph session content delete <slug> <contentId> --campaign <id> [--yes]  # delete a content entry by ID

# Attendance / RSVP
aleph session attendance set <slug> --campaign <id> --status pending|accepted|declined|tentative
aleph session attendance mark <slug> --campaign <id> --characters <slug1,slug2,...> [--absent] [--json]  # DM/co-DM: bulk-mark characters as attended (or absent with --absent)
aleph session attendance add <slug> --campaign <id> --user <userId> [--character <id>] [--status pending|accepted|declined|tentative]  # DM/co-DM: add a campaign member as a session participant
aleph session attendance remove <slug> --campaign <id> --user <userId>  # DM/co-DM: remove a participant from a session

# Session XP (per CHARACTER, not per player)
aleph session xp <slug> --campaign <id> --list [--json]  # print the session's current awards
aleph session xp <slug> --campaign <id> --character <slug> --xp <n>  # DM/co-DM: award one character. Read-modify-write: every OTHER character's award is preserved. --xp must be a whole number >= 0, and 0 is a real award ("recorded, awarded nothing"), distinct from no award at all.
aleph session xp <slug> --campaign <id> --character <slug> --clear  # DM/co-DM: remove one character's award (404 if nothing was recorded)
# --character takes a CHARACTER slug: XP belongs to the character, not to the player holding the dice, so one player fielding two characters gets two awards, and a character needs no attendance row to be awarded.
# --character with neither --xp nor --clear is refused before any request is sent; --list cannot be combined with the write flags.

# AI generation (requires AI_PROVIDER + AI_API_KEY configured on the server)
aleph session summarize <slug> --campaign <id> [--type summary|ai_notes] [--force]  # --type defaults to summary; --force skips confirmation

# Import session notes from files (finds or creates session by date)
aleph session import --campaign <id> [--manual <file>] [--ai <file>] [--date <YYYY-MM-DD>] [--subcampaign <slug>] [--no-summarize] [--force] [--json]
# At least one of --manual or --ai is required.
# Date is parsed from filename (session-YYYY-MM-DD.md) if not provided.
# Session title defaults to Spanish date format: "26 de abril de 2026".
# If --manual is provided, auto-generates a summary unless --no-summarize is set.
```

> `--subcampaign` places the session in a named sub-campaign (alias: `--group`, deprecated). WITHOUT it the session lands in the campaign's DEFAULT sub-campaign and the import still reports success — that is how a session of one storyline ends up inside another one's. The import now always prints the resulting sub-campaign, and moves an existing session when the flag names a different one.

### Sub-Campaigns

Organizes arcs, sessions, and quests into named storylines within a single campaign
(e.g. a mage-focused main campaign and a mortals-focused sub-campaign in the same
setting). Every campaign has exactly one default sub-campaign ("General"), auto-created
on campaign creation; arcs/sessions/quests fall back to it when `--subcampaign` is omitted.

```bash
aleph sub-campaign list --campaign <id> [--json]   # shows name, slug, and whether it's the default
aleph sub-campaign create --campaign <id> --name <name> [--description <desc>] [--json]
aleph sub-campaign update <slug> --campaign <id> [--name <name>] [--description <desc>]   # the default sub-campaign can be renamed but not deleted
aleph sub-campaign delete <slug> --campaign <id> [--yes]  # --yes skips confirmation; arcs/sessions/quests move to the default; deleting the default itself returns 422
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

### Search

```bash
aleph search --campaign <id> <query> [--preview-as <role>] [--json]
```

Hybrid search: combines exact/fuzzy text matching with meaning-based (semantic) matching, so a query can surface relevant entities even when it shares no words with their content (e.g. a Spanish-language concept query can find a session summary that never uses those exact words). Text matching still wins for exact names; semantic matching adds recall on top. `--json` output includes each result's `score` and which arm(s) matched (`lexical`, `semantic`, or both).

Matching understands Spanish inflection: `asesinar` finds `asesinó`, `correr` finds `corriendo`, `hablar` finds `hablaron`.

**Results are role-scoped.** Content inside `:::secret{...}` blocks is searchable only by `co_dm` and above — for anyone below (including `editor`) such a term returns nothing at all, not a blanked excerpt, because the existence of a hit is itself the leak. Both the text and the semantic arm are scoped the same way. `--preview-as <role>` re-runs the search as that role would see it and requires `co_dm`+.

### Organizations

```bash
aleph organization list --campaign <id> [--page <n>] [--limit <n>] [--json]
aleph organization create --campaign <id> --name <name> [--type <type>] [--status <status>] [--visibility <vis>] [--description <desc>] [--json]
aleph organization show <slug> --campaign <id> [--json]
aleph organization edit <slug> --campaign <id> [--name <name>] [--type <type>] [--status <status>] [--visibility <vis>] [--description <desc>] [--json]
aleph organization delete <slug> --campaign <id> [--yes]
aleph organization member-add <slug> --campaign <id> --character <characterId> [--role <role>] [--json]
aleph organization member-update <slug> --campaign <id> --character <characterId> [--role <role>] [--json]
aleph organization member-remove <slug> --campaign <id> --character <characterId>
aleph organization upload-image <slug> --campaign <id> --file <path> [--json]

# Organization images (gallery). Exactly one image is the main one shown elsewhere.
aleph organization images <slug> --campaign <id> [--json]
aleph organization image-add <slug> --campaign <id> --file <path> [--caption <text>] [--json]
aleph organization image-update <slug> <imageId> --campaign <id> [--caption <text>] [--order <n>]
aleph organization image-set-primary <slug> <imageId> --campaign <id>
aleph organization image-remove <slug> <imageId> --campaign <id>
#   --caption travels as a form field, not JSON. `image-update --caption ""` CLEARS the caption.
#   image-update with neither --caption nor --order fails locally without sending a request.
#   Deleting the main image promotes the next one; emptying the gallery clears imageUrl.
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

# Location images (gallery). Exactly one image is the main one shown elsewhere.
aleph location images <slug> --campaign <id> [--json]
aleph location image-add <slug> --campaign <id> --file <path> [--caption <text>] [--json]
aleph location image-update <slug> <imageId> --campaign <id> [--caption <text>] [--order <n>]
aleph location image-set-primary <slug> <imageId> --campaign <id>
aleph location image-remove <slug> <imageId> --campaign <id>
#   MIME type comes from the FILE EXTENSION (png/jpg/jpeg/webp); the server also checks the magic
#   bytes and answers 400 on a mismatch, so renaming a .gif to .png fails.
#   --caption travels as a form field, not JSON. `image-update --caption ""` CLEARS the caption.
#   image-update with neither --caption nor --order fails locally without sending a request.
#   Deleting the main image promotes the next one; emptying the gallery clears the location image.
```

Subtypes: `country`, `region`, `city`, `town`, `village`, `dungeon`, `lair`, `building`, `room`, `wilderness`, `other`

### Relations

```bash
aleph relation create --campaign <id> --source <entity-slug> --target <entity-slug> [--type <type-slug>] [--forward <label>] [--reverse <label>] [--attitude <-100..100>] [--description <text>] [--json]
aleph relation list --campaign <id> [--entity <entity-slug>] [--json]
aleph relation delete <relationId> --campaign <id> [--yes]
```

Relations are bidirectional links between any two entities with forward/reverse labels and an optional attitude score (-100 = hostile, 0 = neutral, 100 = allied).

Organizations are first-class entities for relation purposes — their slug works as `--source` or `--target` just like characters, locations, and wiki entries. Example:

```bash
aleph relation create --campaign <id> --source los-senores-del-tigre --target la-pequena-flor --forward "arrasó" --reverse "arrasada por"
```

Quests are relatable too — a quest's own slug works as `--source`/`--target`, so sub-quests can be linked to a main quest (or to any character/location/other quest) with custom labels, same as everything else:

```bash
aleph relation create --campaign <id> --source encontrar-al-herrero --target impedir-la-corrupcion-de-tezgul --forward "es parte de" --reverse "incluye la sub-misión"
```

This is independent of `parentQuestId` (the single "sub-quest of" hierarchy shown in the quest tree UI) — use relations when you need a custom label, an attitude score, or a link to something that isn't a quest.

Sessions and arcs are relatable too — link a session to the characters/locations/organizations that were part of it, or an arc to the entities it centers on:

```bash
aleph relation create --campaign <id> --source la-noche-que-se-trago-a-clara --target clara-bohm --forward "contó con" --reverse "participó en"
aleph relation create --campaign <id> --source el-camino-hasta-oda --target la-capilla --forward "parte de" --reverse "es el hogar de la cábala durante"
```

### Maps

```bash
aleph map list --campaign <id> [--json]
aleph map get --campaign <id> --slug <slug> [--json]
aleph map create --campaign <id> --name <name> [--type <image|osm>] [--address <address>] [--lat <lat> --lng <lng>] [--zoom <n>] [--json]
# --type defaults to 'image'. For an 'osm' map, set the initial center either by --address
# (geocoded server-side via Nominatim — the resolved name + coordinates are printed before
# the map is created, e.g. `Geocoded "Berlin, Germany" -> Berlin, Germany, Deutschland (52.52, 13.405)`)
# or directly via --lat/--lng (must be given together; skips geocoding entirely).
aleph map update --campaign <id> --slug <slug> [--name <name>]
aleph map delete --campaign <id> --slug <slug> [--yes]
aleph map upload --campaign <id> --slug <slug> --file <path>
aleph map pins --campaign <id> --slug <slug> [--json]
# --lat/--lng mean different things depending on the map's type: on an image map they are
# CRS.Simple-scaled pixel coordinates matching the uploaded image; on an OSM map they are
# real WGS84 degrees (-90..90 / -180..180). Run `map get` to check the map's type first.
aleph map pin-add --campaign <id> --slug <slug> --lat <lat> --lng <lng> [--label <label>] [--entity <slug>]
# --label is optional: an un-labelled pin displays its linked entity's live name instead (add-pin-rename).
aleph map pin-move --campaign <id> --slug <slug> --pin <pinId> --lat <lat> --lng <lng> [--json]
# Editor+ only. Moves an existing pin -- colour/entity cannot be changed this way.
aleph map pin-rename --campaign <id> --slug <slug> --pin <pinId> --label <label> [--json]
# Editor+ only. Renames a pin's label via the same PATCH route pin-move uses. Pass --label ""
# to clear it, which makes the pin display its linked entity's name again.
aleph map pin-delete --campaign <id> --slug <slug> --pin <pinId>
aleph map layer-update --campaign <id> --slug <slug> --layer <layerId> [--name <name>] [--opacity <n>]
aleph map layer-delete --campaign <id> --slug <slug> --layer <layerId> [--yes]
aleph map region-update --campaign <id> --slug <slug> --region <regionId> [--name <name>]
aleph map region-delete --campaign <id> --slug <slug> --region <regionId> [--yes]
```

### Quests

```bash
aleph quest list --campaign <id> [--status <status>] [--subcampaign <slug>] [--json]
aleph quest create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--subcampaign <slug>] [--json]   # omit --subcampaign to use the campaign's default sub-campaign
aleph quest update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>] [--subcampaign <slug>]
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
aleph arc list --campaign <id> [--subcampaign <slug>] [--json]
aleph arc create --campaign <id> --name <name> [--status <status>] [--description <desc>] [--sort-order <n>] [--subcampaign <slug>] [--json]   # omit --subcampaign to use the campaign's default sub-campaign
aleph arc update --campaign <id> --slug <slug> [--name <name>] [--status <status>] [--description <desc>] [--sort-order <n>] [--subcampaign <slug>]   # --sort-order reorders the arc; must be numeric
aleph arc delete --campaign <id> --slug <slug> [--yes]
```

### Chapters

```bash
aleph chapter list --campaign <id> [--arc <slug>] [--json]   # campaign-wide (reads the arcs endpoint); shows the arc name, not the arcId
aleph chapter create --campaign <id> --name <name> --arc <arcSlug|arcId> [--description <desc>] [--sort-order <n>] [--json]
aleph chapter update --campaign <id> --slug <slug> [--name <name>] [--description <desc>] [--sort-order <n>]
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
