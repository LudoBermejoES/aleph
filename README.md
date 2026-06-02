<div align="center">

# Aleph

**The self-hosted command center for your tabletop RPG campaigns.**

Wikis, characters, maps, diagrams, sessions, quests, an in-world economy, family trees, and a relationship graph — all in one place, all yours, all collaborative in real time.

[Features](#what-you-can-do) · [Quick start](#quick-start) · [Architecture docs](#documentation) · [CLI](#the-aleph-cli)

</div>

---

Aleph is a full-stack campaign manager for game masters who want one tool instead of fifteen browser tabs. Your world lives in plain Markdown files and a single SQLite database that you own — no SaaS lock-in, no per-seat pricing, no "we're shutting down" emails. Run it on a Raspberry Pi or a VPS, invite your table, and play.

It's built like a real application, not a toy: real-time collaborative editing (Hocuspocus + Yjs), a multiplayer diagram canvas (tldraw), full-text search (SQLite FTS5), automatic entity cross-linking, role-based permissions down to the paragraph, a companion CLI, and daily off-site backups.

## Why Aleph

- **You own your data.** Every wiki page is a Markdown file with YAML frontmatter on your disk. The database is one SQLite file. Back it up with `cp`. Read it without the app. Put it in git if you like.
- **Built for the table, not the spreadsheet.** Ten immersive themes (dark-fantasy, cyberpunk, cosmic-horror, eldritch…) with their own typography and texture. Maps with layers and regions. A relationship graph. Family trees laid out automatically.
- **Real-time, genuinely.** Two players editing the same NPC see each other's cursors. The diagram canvas syncs live across the table.
- **Write once, link everywhere.** Mention a character or location by name in any page and Aleph turns it into a live link — without breaking your code blocks, headings, or existing links.
- **Secrets stay secret.** Hide a paragraph behind `:::secret{.dm}` and players literally never receive it — the filtering happens on the server, not in CSS.
- **Scriptable.** A first-class CLI (`aleph`) talks to the same API the web app does, authenticated by API key. Automate imports, bulk edits, and integrations.

## What you can do

| Domain                        | What it gives you                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Campaigns & members**       | Multiple campaigns, invite players, role-based access (DM, Co-DM, Editor, Player, Visitor)               |
| **Wiki / Entities**           | Custom entity types with Markdown content, templates, tags, and visibility controls                      |
| **Characters**                | Rich sheets with stat groups, abilities, connections, portraits, status, and player ownership            |
| **Genealogy**                 | Parent/child/spouse/sibling links rendered as an auto-laid-out interactive family tree                   |
| **Sessions**                  | Schedule and log sessions, track attendance, decisions & consequences, group them into arcs and chapters |
| **Maps**                      | Leaflet maps with tiling, pins, layers, GeoJSON regions, and nested sub-maps                             |
| **Diagrams**                  | A real-time multiplayer tldraw canvas with custom RPG shapes (NPC tokens, location pins, quest nodes…)   |
| **Quests**                    | Hierarchical quest tracking with status, assignments, secret quests, and logs                            |
| **Organizations & locations** | Factions and places with members, presence, and relationships                                            |
| **Economy**                   | Items, custom currencies, shops with stock, inventories, and a full transaction ledger                   |
| **Calendars & timelines**     | Custom in-world calendars and an event timeline                                                          |
| **Relationship graph**        | Visualize how every entity connects, as an interactive force-directed graph                              |
| **Search**                    | Instant full-text search across names, aliases, tags, and body, ranked by relevance                      |
| **Dice**                      | A dice roller with full formula support (`2d6+3`, advantage, etc.)                                       |

## Quick start

**Prerequisites:** Node.js 22+ and npm.

```bash
git clone https://github.com/LudoBermejoES/aleph.git
cd aleph
npm install --legacy-peer-deps   # see note below
cp .env.example .env             # set BETTER_AUTH_SECRET at minimum
npm run dev
```

Open <http://localhost:3000>, register the first account, and create a campaign.

> **Why `--legacy-peer-deps`?** Nuxt 4.4's dependency tree currently has an internal `commander` version conflict between two of its own sub-dependencies. `--legacy-peer-deps` resolves it cleanly; it does not affect your app's dependencies.

### With Docker

```bash
docker compose up --build
```

### Database migrations

Schema lives in `server/db/schema/` as Drizzle definitions. After changing it:

```bash
npm run db:generate   # generate a migration from the schema diff
npm run db:migrate    # apply pending migrations
```

Migrations also run automatically on server start.

## The `aleph` CLI

Aleph ships with a companion CLI that drives the same HTTP API as the web app.

```bash
npm run aleph login --email you@example.com --password ...
npm run aleph campaign list
npm run aleph character create "Gandalf" --campaign <id> --type npc
npm run aleph search "ancient sword" --campaign <id>
npm run aleph roll "2d6+3"
```

It authenticates with an API key stored in `~/.aleph/config.json` and is ideal for scripted imports and automation. See [docs/cli.md](docs/cli.md).

## Testing

Aleph has three test levels — all are expected to be green:

```bash
npm run test:unit          # Vitest — pure logic, fast, no server
npm run test:integration   # Vitest — API endpoints (auto-starts a server on :3333)
npm run test:e2e           # Playwright — full user flows (manages its own server)
npm run test:all           # all three
```

## Tech stack

Nuxt 4 (Vue 3, SPA) · Nitro · SQLite via Drizzle ORM · better-auth · Hocuspocus + Yjs (real-time) · Tiptap (editor) · tldraw 5 (diagrams, via a React-in-Nuxt bridge) · Leaflet (maps) · Cytoscape / v-network-graph (graphs) · Tailwind + shadcn-vue · `@nuxtjs/i18n` · MDC · Sentry · Cloudflare R2 backups.

## Documentation

The README sells it; the deep docs explain the hard parts. Start here:

- **[docs/architecture.md](docs/architecture.md)** — the system map: how the pieces fit together
- **[docs/content-model.md](docs/content-model.md)** — Markdown files ⇄ database ⇄ search; the storage model and why
- **[docs/collaboration.md](docs/collaboration.md)** — Hocuspocus, Yjs, and the Markdown↔Tiptap pipeline
- **[docs/diagrams.md](docs/diagrams.md)** — the React-in-Nuxt bridge, custom tldraw shapes, and live sync
- **[docs/autolink.md](docs/autolink.md)** — automatic entity cross-linking and exclusion zones
- **[docs/auth.md](docs/auth.md)** — dual cookie-session + API-key auth, roles, and secret blocks
- **[docs/cli.md](docs/cli.md)** — the `aleph` CLI
- **[docs/theming.md](docs/theming.md)** — the immersive theme system
- **[docs/development.md](docs/development.md)** — local setup, project layout, testing, conventions, gotchas
- **[docs/deployment.md](docs/deployment.md)** — production deploy, env vars, PM2, Sentry
- **[docs/backup.md](docs/backup.md)** — Cloudflare R2 backups and restore

## Contributing

1. Fork and clone, then `npm install --legacy-peer-deps`.
2. Make your change with tests at the appropriate level (see [docs/development.md](docs/development.md)).
3. Run `npm run test:all` and `npm run format`.
4. Open a PR.

## License

[MIT](LICENSE)
