## ADDED Requirements

### Requirement: PF2e campaign setup script creates a fully structured campaign

The system SHALL provide a Node.js script at `scripts/pf2-setup/setup.js` that, when run against a configured Aleph server, creates a complete Pathfinder 2e campaign with all entity types, templates, and currencies in a single command.

#### Scenario: Running setup creates the campaign and base structure

- **WHEN** a user runs `node scripts/pf2-setup/setup.js --name "My PF2e Campaign"`
- **THEN** a new campaign is created on the configured Aleph server
- **AND** 14 custom entity types are created (pf2-conjuro, pf2-clase, pf2-ascendencia, pf2-herencia, pf2-trasfondo, pf2-dote, pf2-accion, pf2-arma, pf2-armadura, pf2-escudo, pf2-objeto, pf2-rasgo, pf2-condicion, pf2-arquetipo)
- **AND** a template is created for each entity type with the appropriate typed fields (all labels in Spanish)
- **AND** two character templates are created: "PJ PF2e" and "PNJ/Criatura PF2e"
- **AND** four currencies are created: Moneda de Platino (pp, value 1000), Moneda de Oro (go, value 100), Moneda de Plata (pa, value 10), Moneda de Cobre (pc, value 1)
- **AND** the script prints the campaign ID on completion

#### Scenario: Setup script is idempotent on campaign name

- **WHEN** a user runs setup with a campaign name that already exists
- **THEN** the script prints the existing campaign ID and exits without creating duplicates

### Requirement: PF2e entity seed script populates all core content

The system SHALL provide a seed script at `scripts/pf2-setup/seed-entities.js` that reads the PF2e JSON data files and creates wiki entities for all core game content.

#### Scenario: Seeding spells creates one entity per spell

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type conjuros` is run
- **THEN** one entity of type `pf2-conjuro` is created per entry in `tools/spellCardCreator/data/spells.json`
- **AND** each entity has its name, markdown content (bloque de estadisticas formateado en español), and template field values set from the JSON data
- **AND** each entity is tagged with its traditions (arcana, divina, ocultista, primigenia) and level

#### Scenario: Seeding weapons creates one entity per weapon

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type armas` is run
- **THEN** one entity of type `pf2-arma` is created per entry in `tools/weaponsCardCreator/data/weapons.json`
- **AND** each entity's template fields are populated with dano, manos, bulto, grupo, categoria, precio, rasgos

#### Scenario: Seeding armors creates one entity per armor

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type armaduras` is run
- **THEN** one entity of type `pf2-armadura` is created per entry in `tools/armorCardCreator/data/armors.json`
- **AND** each entity's template fields are populated with bono_ca, limite_des, penalizacion_pruebas, penalizacion_velocidad, requisito_fuerza, bulto, grupo, categoria, tipo, precio

#### Scenario: Seeding items creates one entity per item

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type objetos` is run
- **THEN** one entity of type `pf2-objeto` is created per entry in `tools/itemCardCreator/data/items.json`
- **AND** each entity's template fields include precio, bulto, manos

#### Scenario: Seeding feats creates one entity per feat

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type dotes` is run
- **THEN** one entity of type `pf2-dote` is created per entry in `tools/featCardCreator/data/feats.json`
- **AND** each entity's template fields include nivel, categoria, clase_o_ascendencia, prerequisitos, tipo_accion, beneficio

#### Scenario: Seeding actions creates one entity per action

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type acciones` is run
- **THEN** one entity of type `pf2-accion` is created per entry in `tools/actionsCardCreator/data/actions.json`
- **AND** each entity's template fields include tipo_accion, categoria, desencadenante, requisitos, exito_critico, exito, fallo, fallo_critico

#### Scenario: Seeding classes creates one entity per class

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type clases` is run
- **THEN** one entity of type `pf2-clase` is created for each of the 18 PF2e classes
- **AND** each entity's template fields include complejidad, pg_por_nivel, atributo_clave, percepcion

#### Scenario: Seeding ancestries creates one entity per ancestry

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --type ascendencias` is run
- **THEN** one entity of type `pf2-ascendencia` is created for each of the 17+ PF2e ancestries
- **AND** each entity's template fields include pg, tamanio, velocidad, mejoras_atributo, defecto_atributo, idiomas, rasgos

#### Scenario: Seeding all content with --all flag

- **WHEN** `node scripts/pf2-setup/seed-entities.js --campaign <id> --all` is run
- **THEN** all entity types are seeded in sequence: conjuros, armas, armaduras, escudos, objetos, dotes, acciones, clases, ascendencias, trasfondos, rasgos
- **AND** progress is printed to stdout as each batch completes (messages in Spanish)

### Requirement: PF2e PC character template captures full stat block

The "PJ PF2e" character template SHALL contain fields covering the complete Pathfinder 2e player character stat block, organized into sections, with all labels in Spanish.

#### Scenario: PC template has all required sections

- **WHEN** the "PJ PF2e" template is applied to a character
- **THEN** the template fields include sections for: Datos Principales, Puntuaciones de Atributo, Defensas, Ataque, Movimiento, Habilidades, Dotes y Caracteristicas, Lanzamiento de Conjuros, Equipo, Recursos, Notas
- **AND** attribute score fields (fuerza, destreza, constitucion, inteligencia, sabiduria, carisma) are number type
- **AND** skill fields use text type to store both proficiency letter and modifier (e.g. "E+7")
- **AND** spellcasting tradition is a select field with options: arcana, divina, ocultista, primigenia, —
- **AND** HP (pg_max, pg_actual) and AC (ca) fields are number type

#### Scenario: NPC/creature template has monster stat block fields

- **WHEN** the "PNJ/Criatura PF2e" template is applied to a character
- **THEN** the template fields include sections for: Identidad, Caracteristicas, Modificadores de Atributo, Defensas, Ataque, Fuente
- **AND** rareza is a select field with options: comun, infrecuente, raro, unico
- **AND** attack fields (ataques_cuerpo_a_cuerpo, ataques_a_distancia, conjuros, habilidades_especiales) are textarea type
- **AND** inmunidades, resistencias, and debilidades are text fields

### Requirement: Script reads configuration from aleph CLI config

The setup and seed scripts SHALL read the server URL and API key from `~/.aleph/config.json` — the same config used by the `aleph` CLI — without requiring separate configuration.

#### Scenario: Script uses existing CLI authentication

- **WHEN** the user has already run `aleph login` successfully
- **THEN** the setup script can connect to the server without any additional authentication steps
- **AND** the script fails with a clear error message if `~/.aleph/config.json` does not exist or has no valid API key

### Requirement: Seed script produces formatted markdown content for each entity

Each seeded entity SHALL have human-readable markdown content built from the source JSON data, following a consistent stat-block format.

#### Scenario: Spell entity content is a readable stat block

- **WHEN** a spell entity is created by the seed script
- **THEN** its content field contains a formatted markdown block in Spanish showing: Nivel, Acciones, Tradiciones, Alcance, Objetivos, Area (if any), Duracion, Rasgos, descripcion, and entries Potenciado
- **AND** action costs are rendered with action symbols: ◆ (1 accion), ◆◆ (2 acciones), ◆◆◆ (3 acciones), ↺ (reaccion), ◇ (accion libre)

#### Scenario: Weapon entity content is a readable stat block

- **WHEN** a weapon entity is created by the seed script
- **THEN** its content field contains in Spanish: dados de dano, manos, bulto, grupo, categoria, precio, alcance (if ranged), recarga (if ranged), and descripcion de rasgos
