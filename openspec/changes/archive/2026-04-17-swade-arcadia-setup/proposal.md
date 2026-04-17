## Why

The Arcadia campaign ("Arcadia - La fuerza oculta", ID `753b7958-d63b-4053-bcb5-1ac44b0f96e0`) is a Savage Worlds Adventure Edition (SWADE) + Supers campaign running on `aleph.ludobermejo.es`, but the server has no entity types, templates, or reference content for SWADE yet. All game reference data — ventajas, desventajas, rasgos, superpoderes, equipo, armaduras, vehículos, bestiary — must be looked up externally. This change seeds the Arcadia campaign with the full SWADE + Supers Spanish content from `/Users/ludo/code/swade`, making it a self-contained reference wiki inside Aleph.

## What Changes

- **One setup script** (`scripts/swade-arcadia/setup.js`) creates all entity types and templates for the Arcadia campaign via the Aleph CLI/API
- **One seed script** (`scripts/swade-arcadia/seed-entities.js`) reads the Spanish JSON and markdown files from `/Users/ludo/code/swade/manuales/` and `/Users/ludo/code/swade/superpowers-es/` and creates wiki entities
- **Custom entity types** for every SWADE + Supers category: Ventaja, Desventaja, Rasgo, Superpoder, Armadura, Arma, Equipo, Escudo, Vehículo, Base de Operaciones, Raza
- **Templates** for each entity type with typed fields (all labels in Spanish)
- **Two character templates**: "Personaje SWADE" (PC) and "Criatura SWADE" (NPC/bestiary entry)
- **Seed entities** from the Spanish manuals:
  - 134 ventajas (core) + 6 ventajas de superhéroes
  - 57 desventajas (core) + 15 desventajas de superhéroes
  - 32 rasgos/habilidades
  - 12 superpoderes (index with modifiers) + 95 markdown descriptions
  - All armaduras, armas, escudos, equipo, vehículos, bases de operaciones
- **Script targets the existing Arcadia campaign** by ID — no new campaign is created

## Capabilities

### New Capabilities

- `swade-arcadia-seed`: Full specification for a seed script and entity-type/template schema that populates the existing Arcadia campaign with SWADE + Supers reference content

### Modified Capabilities

_(none — purely additive scripting, no server code changes)_

## Impact

- New files: `scripts/swade-arcadia/` directory containing:
  - `setup.js` — creates entity types and templates for the Arcadia campaign
  - `seed-entities.js` — reads SWADE JSON/markdown and creates entities via API
  - `lib/cli.js` — HTTP helper using API key from `~/.aleph/config.json`
  - `lib/templates.js` — template field definitions for all entity types
  - `lib/format.js` — markdown content formatters for each entity category
  - `README.md` — usage instructions
- Reads from: `/Users/ludo/code/swade/manuales/jsons/` and `/Users/ludo/code/swade/superpowers-es/`
- Talks to: `aleph.ludobermejo.es` via direct HTTP calls with API key (same auth as `aleph` CLI)
- aleph-cli: No changes — all operations use existing API endpoints
- No DB migrations, no server changes, no frontend changes
