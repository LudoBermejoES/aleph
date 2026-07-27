# swade-arcadia-seed Specification

## Purpose

Scripts that populate the existing Arcadia campaign with SWADE content: a setup script creating all SWADE entity types and character templates, a seed script turning the Spanish SWADE JSON files and superpower markdown into wiki entities with consistently formatted content, and a Spanish-labelled "Personaje SWADE" template covering the full SWADE + Supers stat block -- both reading credentials from the `aleph` CLI's `~/.aleph/config.json`.

## Requirements

### Requirement: SWADE setup script creates all entity types and templates in the Arcadia campaign

The system SHALL provide a Node.js script at `scripts/swade-arcadia/setup.js` that, when run, creates all SWADE entity types and character templates in the existing Arcadia campaign (`753b7958-d63b-4053-bcb5-1ac44b0f96e0`) on `aleph.ludobermejo.es`.

#### Scenario: Running setup creates entity types and templates

- **WHEN** a user runs `node scripts/swade-arcadia/setup.js`
- **THEN** 11 custom entity types are created: `swade-ventaja`, `swade-desventaja`, `swade-rasgo`, `swade-superpoder`, `swade-armadura`, `swade-arma`, `swade-equipo`, `swade-escudo`, `swade-vehiculo`, `swade-base`, `swade-raza`
- **AND** a template is created for each entity type with typed fields in Spanish
- **AND** two character templates are created: "Personaje SWADE" and "Criatura SWADE"
- **AND** the script prints confirmation for each created type/template

#### Scenario: Setup is idempotent on entity type slug

- **WHEN** setup is run a second time on the same campaign
- **THEN** entity types that already exist (matched by slug) are skipped without error
- **AND** the script prints "ya existe, omitiendo" for skipped types

### Requirement: SWADE seed script populates all reference content

The system SHALL provide a seed script at `scripts/swade-arcadia/seed-entities.js` that reads the Spanish SWADE JSON files and markdown superpower descriptions and creates wiki entities for all reference game content.

#### Scenario: Seeding ventajas creates one entity per ventaja

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type ventajas` is run
- **THEN** one entity of type `swade-ventaja` is created per entry in `manuales/jsons/core/ventajas.json` (134 core) plus `manuales/jsons/supers/ventajasSuperheroes.json` (6 supers) = 140 total
- **AND** each entity's template fields include `requisitos` and `descripcion`
- **AND** supers ventajas are tagged with `superheroes`

#### Scenario: Seeding desventajas creates one entity per desventaja

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type desventajas` is run
- **THEN** one entity of type `swade-desventaja` is created per entry in `manuales/jsons/core/desventajas.json` (57 core) plus `manuales/jsons/supers/desventajasSuperheroes.json` (15 supers) = 72 total
- **AND** each entity's `tipo` field is set to "Mayor", "Menor", or "Mayor/Menor"
- **AND** supers desventajas are tagged with `superheroes`

#### Scenario: Seeding rasgos creates one entity per habilidad

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type rasgos` is run
- **THEN** one entity of type `swade-rasgo` is created per entry in `manuales/jsons/core/rasgos.json` (32 entries)
- **AND** each entity's `atributo_vinculado` field is set from the JSON `atributo` key

#### Scenario: Seeding superpoderes creates one entity per superpoder

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type superpoderes` is run
- **THEN** one entity of type `swade-superpoder` is created per `.md` file in `superpowers-es/` (95 entries)
- **AND** entities that match a `nombre` from `manuales/jsons/supers/superpoderes.json` (12 entries) also have `coste` and `ornamentos` template fields populated
- **AND** the full markdown content from the `.md` file is used as the entity content
- **AND** the modifiers section from the JSON is appended to the content as a markdown table when available

#### Scenario: Seeding armaduras creates one entity per armor

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type armaduras` is run
- **THEN** one entity of type `swade-armadura` is created per item in `manuales/jsons/core/objetos/armaduras.json` and `manuales/jsons/supers/objetos/armaduras.json`
- **AND** each entity's template fields include `proteccion`, `localizaciones`, `peso`, `coste`, `fuerza_minima`
- **AND** each entity is tagged with its category (ej. `contemporanea`, `medieval`, `futurista`)

#### Scenario: Seeding armas creates one entity per arma

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type armas` is run
- **THEN** one entity of type `swade-arma` is created per item in `manuales/jsons/core/objetos/armas_personales.json`, `armas_especiales.json`, and `manuales/jsons/supers/objetos/armas.json`
- **AND** each entity's template fields include `dano`, `fuerza_minima`, `peso`, `coste`, `notas`, `categoria`
- **AND** each entity is tagged with its weapon category (ej. `cuerpo-a-cuerpo`, `distancia`, `especial`, `moderna`)

#### Scenario: Seeding equipo creates one entity per item

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type equipo` is run
- **THEN** one entity of type `swade-equipo` is created per item in `manuales/jsons/core/objetos/equipo_miscelaneo.json` and `manuales/jsons/supers/objetos/equipo_aventurero.json`
- **AND** each entity's template fields include `peso`, `coste`, `notas`, `categoria`

#### Scenario: Seeding escudos creates one entity per escudo

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type escudos` is run
- **THEN** one entity of type `swade-escudo` is created per item in `manuales/jsons/core/objetos/escudos.json`
- **AND** each entity's template fields include `bonus_parada`, `cobertura`, `peso`, `coste`

#### Scenario: Seeding vehiculos creates one entity per vehículo

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type vehiculos` is run
- **THEN** one entity of type `swade-vehiculo` is created per item in `manuales/jsons/core/objetos/vehiculos.json` and `manuales/jsons/supers/objetos/vehiculos.json`
- **AND** each entity's template fields include `tamanio`, `manejo`, `velocidad_max`, `dureza`, `tripulacion`, `coste`, `categoria`
- **AND** each entity is tagged with its vehicle category (ej. `terrestre`, `aeronave`, `acuatico`, `militar`, `wwii`)

#### Scenario: Seeding bases de operaciones creates one entity per base

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --type bases` is run
- **THEN** one entity of type `swade-base` is created per entry in `manuales/jsons/supers/objetos/bases_operaciones.json`
- **AND** each entity's content lists the available modification types

#### Scenario: Seeding all content with --all flag

- **WHEN** `node scripts/swade-arcadia/seed-entities.js --all` is run
- **THEN** all entity types are seeded in sequence: ventajas, desventajas, rasgos, superpoderes, armaduras, armas, escudos, equipo, vehiculos, bases
- **AND** progress is printed to stdout in Spanish as each batch completes (ej. "✓ 140 ventajas creadas")

### Requirement: Personaje SWADE character template captures full stat block

The "Personaje SWADE" character template SHALL contain fields covering the complete SWADE + Supers player character stat block, organized into sections, with all labels in Spanish.

#### Scenario: Personaje SWADE template has all required sections

- **WHEN** the "Personaje SWADE" template is applied to a character
- **THEN** the template fields include sections for: Datos Principales, Atributos, Derivadas, Heridas y Fatiga, Rasgos / Habilidades, Ventajas, Desventajas, Superpoderes, Equipo, Notas
- **AND** all five attribute fields (agilidad, astucia, espiritu, fuerza, vigor) are select fields with options: d4, d6, d8, d10, d12
- **AND** rango is a select field with options: novato, avanzado, veterano, heroico, legendario
- **AND** derived stat fields (ritmo, parada, temple) are number type
- **AND** superpoderes and habilidades are textarea fields

#### Scenario: Criatura SWADE template has monster stat block fields

- **WHEN** the "Criatura SWADE" template is applied to a character
- **THEN** the template fields include sections for: Identidad, Atributos, Derivadas, Habilidades, Ventajas y Habilidades Especiales, Equipo, Superpoderes, Fuente
- **AND** comodin is a checkbox field
- **AND** rango is a select field with options: salvaje, avanzado, veterano, heroico, legendario
- **AND** rareza is a select field with options: comun, infrecuente, raro, unico

### Requirement: Script reads configuration from aleph CLI config

The setup and seed scripts SHALL read the server URL and API key from `~/.aleph/config.json` — the same config used by the `aleph` CLI — without requiring separate configuration.

#### Scenario: Script uses existing CLI authentication

- **WHEN** the user has already run `aleph login` successfully
- **THEN** the setup script can connect to the server without any additional authentication steps
- **AND** the script fails with a clear error in Spanish if `~/.aleph/config.json` does not exist or has no valid API key (ej. "Error: No se encontró configuración de Aleph. Ejecuta 'aleph login' primero.")

### Requirement: Seed script produces formatted markdown content for each entity

Each seeded entity SHALL have human-readable markdown content built from the source data, following a consistent format per category.

#### Scenario: Ventaja entity content is a readable entry

- **WHEN** a ventaja entity is created by the seed script
- **THEN** its content field contains: `**Requisitos:**` line followed by the full description text

#### Scenario: Superpoder entity content includes full description and modifiers

- **WHEN** a superpoder entity is created by the seed script
- **THEN** its content field contains: `**Coste:**`, `**Ornamentos:**` lines, the full description, and a `## Modificadores` section listing each modifier with cost and description
- **AND** the full markdown from `superpowers-es/<nombre>.md` is used as the primary content when available

#### Scenario: Arma entity content is a readable stat block

- **WHEN** an arma entity is created by the seed script
- **THEN** its content field contains: `**Daño:**`, `**Fuerza Min.:**`, `**Peso:**`, `**Coste:**` inline stats followed by any notes
