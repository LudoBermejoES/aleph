## Why

The Aleph CLI can fully bootstrap a campaign — but doing so for a Pathfinder 2e game requires a lot of structured knowledge: entity types for every game object category, a full set of templates capturing PF2e stat blocks, and hundreds of seed entities (spells, classes, ancestries, equipment). Without a purpose-built setup script and matching templates, a DM would have to create all this by hand. This change defines everything needed to run `aleph` and end up with a fully structured PF2e campaign on the remote server.

## What Changes

- **One shell script** (`scripts/pf2-setup.sh`) that creates the campaign and wires up everything via CLI calls to `aleph.ludobermejo.es`
- **Custom entity types** for every PF2e object category: Spell, Class, Ancestry, Feat, Trait, Action, Weapon, Armor, Background, Condition, Heritage, Archetype
- **Templates** for each entity type and for characters (PC template + NPC/creature template)
- **Seed entities** for all core PF2e content sourced from `/Users/ludo/code/pf2`:
  - All spells from `tools/spellCardCreator/data/spells.json`
  - All weapons from `tools/weaponsCardCreator/data/weapons.json`
  - All armors from `tools/armorCardCreator/data/armors.json`
  - All items from `tools/itemCardCreator/data/items.json`
  - All feats from `tools/featCardCreator/data/feats.json`
  - All actions from `tools/actionsCardCreator/data/actions.json`
  - All 18 classes from `docs/_clases/`
  - All 17+ ancestries from `docs/_ascendencias/`
  - Traits, conditions, skills, backgrounds from `docs/_apendices/` and `docs/_campana/`
- **Currencies** set up for PF2e: pp (platino), go (oro), pa (plata), pc (cobre)
- **Grupo de sesion por defecto** para la campaña (ej. "Sesion Cero", "Campaña Principal")
- **Script Node.js de semilla** que lee los archivos JSON de PF2 y realiza llamadas CLI en lotes

## Capabilities

### New Capabilities

- `pf2-campaign-seed`: Full specification for a seed script and entity-type/template schema that produces a ready-to-use PF2e campaign in Aleph via CLI

### Modified Capabilities

_(none — this is purely additive scripting, no server code changes)_

## Impact

- New files: `scripts/pf2-setup/` directory containing:
  - `setup.js` — Node.js script orchestrating campaign creation
  - `seed-entities.js` — reads PF2 JSON and creates entities via CLI
  - `templates.json` — template definitions for all entity types and characters
  - `currencies.json` — PF2e currency definitions
  - `README.md` — usage instructions
- Reads from: `/Users/ludo/code/pf2/tools/*/data/*.json` and `/Users/ludo/code/pf2/docs/`
- Talks to: `aleph.ludobermejo.es` via `aleph` CLI (or `node /Users/ludo/code/aleph/cli/bin/aleph.js`)
- aleph-cli: No changes — all operations use existing CLI commands. The `template create` command accepts `--content <json>` for field definitions. Character/entity creates accept `--templateId` and `--fields` via API.
- No DB migrations, no server changes, no frontend changes
