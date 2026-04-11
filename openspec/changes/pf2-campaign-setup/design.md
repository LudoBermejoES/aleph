## Context

The PF2e data at `/Users/ludo/code/pf2` is organized as:

- **JSON tool data** in `tools/*/data/*.json` — structured arrays for spells, weapons, armor, shields, items, feats, actions, traits
- **Markdown docs** in `docs/_clases/`, `docs/_ascendencias/`, `docs/_conjuros/` — narrative/rules content per class, ancestry, spell

Aleph's CLI supports everything needed:

- `aleph entity create` — wiki entries (any type), supports `--content` markdown, tags
- `aleph template create` — field templates with typed fields
- `aleph character create` + API `templateId`/`fields` — PCs/NPCs with structured stats
- `aleph currency create` — PF2e coin system
- `aleph item create` — tracked campaign items (distinct from wiki item entities)

The remote server is at `aleph.ludobermejo.es`. The setup script authenticates via `aleph login` (already configured in `~/.aleph/config.json`).

**Entity type strategy:** Aleph's entity system (wiki) is the right home for PF2e reference content — spells, classes, feats, etc. are reference material, not campaign-specific tracked objects. Characters (PCs and NPCs/creatures) use the character system with templates.

## Goals / Non-Goals

**Goals:**

- One command (`node scripts/pf2-setup/setup.js`) creates a fully structured PF2e campaign
- Every PF2e content category has a matching entity type
- Every entity type has a template with the right fields for that type
- All core content from the PF2 JSON files is seeded as entities
- PCs and NPCs/creatures get templates with the full PF2e stat block
- PF2e currencies (pp, go, pa, pc) are created
- Script is idempotent: if the campaign already exists by name, it reports and exits

**Non-Goals:**

- Importing the full Spanish narrative text from markdown docs (the JSON data is sufficient for structured content; markdown lore can be added manually)
- Syncing/updating entities after initial seed (this is a one-time setup)
- Implementing a PF2e-specific character sheet in the Aleph frontend
- Creating session groups, arcs, quests, or timelines (those are campaign-specific and added by the DM)

## Decisions

### Entity type mapping

Each PF2e object category maps to a custom entity type in Aleph. Entity type slugs are short kebab-case identifiers; display names and all template field labels are fully in Spanish.

| PF2e Category | Entity Type Slug  | Display Name | Template Field Labels (Spanish)                                                                                                                 |
| ------------- | ----------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Spell         | `pf2-conjuro`     | Conjuro      | Nivel, Es Truco, Tradiciones, Acciones, Alcance, Objetivos, Area, Duracion, Salvacion, Rasgos, Descripcion, Potenciado                          |
| Class         | `pf2-clase`       | Clase        | Complejidad, PG por Nivel, Atributo Clave, Percepcion, Fortaleza, Reflejos, Voluntad, Habilidades con Entrenamiento, Resumen de Caracteristicas |
| Ancestry      | `pf2-ascendencia` | Ascendencia  | Puntos de Golpe, Tamanio, Velocidad, Mejoras de Atributo, Defecto de Atributo, Idiomas, Rasgos, Habilidades Especiales                          |
| Heritage      | `pf2-herencia`    | Herencia     | Ascendencia, Rasgos, Beneficio                                                                                                                  |
| Background    | `pf2-trasfondo`   | Trasfondo    | Mejoras de Atributo, Entrenamiento en Habilidad, Dote de Habilidad, Habilidad de Saber, Especial                                                |
| Feat          | `pf2-dote`        | Dote         | Nivel, Categoria, Clase o Ascendencia, Tipo de Accion, Prerequisitos, Rasgos, Beneficio, Especial                                               |
| Action        | `pf2-accion`      | Accion       | Tipo de Accion, Categoria, Rasgos, Desencadenante, Requisitos, Exito Critico, Exito, Fallo, Fallo Critico                                       |
| Weapon        | `pf2-arma`        | Arma         | Precio, Dano, Manos, Bulto, Grupo, Categoria, Rasgos, Es a Distancia, Alcance, Recarga                                                          |
| Armor         | `pf2-armadura`    | Armadura     | Precio, Bono de CA, Limite DES, Penalizacion a Pruebas, Penalizacion a Velocidad, Requisito de Fuerza, Bulto, Grupo, Categoria, Tipo, Rasgos    |
| Shield        | `pf2-escudo`      | Escudo       | Precio, Bono de CA, Dureza, Puntos de Golpe, Umbral de Rotura, Bulto, Rasgos                                                                    |
| Item          | `pf2-objeto`      | Objeto       | Precio, Bulto, Manos, Rasgos, Tipo de Objeto, Uso                                                                                               |
| Trait         | `pf2-rasgo`       | Rasgo        | Tipo de Rasgo                                                                                                                                   |
| Condition     | `pf2-condicion`   | Condicion    | — (description only)                                                                                                                            |
| Archetype     | `pf2-arquetipo`   | Arquetipo    | Dote de Dedicacion, Rasgos de Clase, Complejidad                                                                                                |

### Character templates

Two templates for characters:

**Plantilla PJ** (`entityTypeSlug: character`, `isDefault: false`, name: "PJ PF2e"):

```
SECCION: Datos Principales
- nivel (number, required)
- ascendencia (text)
- herencia (text)
- trasfondo (text)
- clase (text)
- subclase (text)

SECCION: Puntuaciones de Atributo
- fuerza, destreza, constitucion, inteligencia, sabiduria, carisma (all number)

SECCION: Defensas
- pg_max (number), pg_actual (number), ca (number)
- fortaleza (text), reflejos (text), voluntad (text)
- percepcion (text)

SECCION: Ataque
- cd_clase (number), ataque_conjuro (number), cd_conjuro (number)

SECCION: Movimiento
- velocidad (number), velocidad_vuelo (number), velocidad_nado (number)

SECCION: Habilidades (competencia + modificador)
- acrobacias, arcanos, atletismo, artesania, engano, diplomacia
- intimidacion, saber, medicina, naturaleza, ocultismo, interpretacion
- religion, sociedad, sigilo, supervivencia, latrocinio (all text: "E+7", "E+3")

SECCION: Dotes y Caracteristicas
- dotes_ascendencia (textarea), dotes_clase (textarea), dotes_habilidad (textarea)
- dotes_generales (textarea), caracteristicas_clase (textarea)

SECCION: Lanzamiento de Conjuros
- tradicion (select: arcana/divina/ocultista/primigenia/-)
- tipo_lanzamiento (select: preparado/espontaneo/-)
- trucos (number), espacios_conjuro_1..10 (number each)

SECCION: Equipo
- armadura_equipada (text), escudo (text), armas (textarea)

SECCION: Recursos
- puntos_heroismo (number), puntos_concentracion (number), resonancia_usada (number)
- recursos_especiales (textarea)

SECCION: Notas
- personalidad (textarea), apariencia (textarea), trasfondo_narrativo (textarea)
- aliados (textarea), enemigos (textarea), notas (textarea)
```

**Plantilla PNJ/Criatura** (`entityTypeSlug: character`, `isDefault: false`, name: "PNJ/Criatura PF2e"):

```
SECCION: Identidad
- tipo_criatura (text), nivel (number), alineamiento (text), tamanio (text)
- rareza (select: comun/infrecuente/raro/unico)

SECCION: Caracteristicas
- percepcion (text), sentidos (textarea)
- idiomas (text)
- habilidades (textarea, ej. "Atletismo +8, Sigilo +6")

SECCION: Modificadores de Atributo
- fuerza, destreza, constitucion, inteligencia, sabiduria, carisma (all number, modificadores)

SECCION: Defensas
- ca (number), pg_max (number)
- fortaleza (text), reflejos (text), voluntad (text)
- inmunidades (text), resistencias (text), debilidades (text)
- defensas_especiales (textarea)

SECCION: Ataque
- velocidad (text, ej. "7,5 m, volar 12 m")
- ataques_cuerpo_a_cuerpo (textarea, ej. "Mandibulas +12 [agil] 2d6+4 perforante")
- ataques_a_distancia (textarea)
- conjuros (textarea)
- habilidades_especiales (textarea)

SECCION: Fuente
- libro_fuente (text), pagina (text), rasgos (text)
- xp_otorgado (number), tesoro (text)
```

### Script architecture

```
scripts/pf2-setup/
├── setup.js           # Main orchestrator: creates campaign, types, templates, currencies
├── seed-entities.js   # Reads JSON files, calls aleph entity create in batches
├── lib/
│   ├── cli.js         # Wrapper: executes aleph CLI, returns parsed JSON
│   ├── templates.js   # Template field definitions for all entity types
│   └── currencies.js  # PF2e currency definitions
├── data/              # Symlink or copy of pf2 JSON data files
└── README.md
```

The script uses `child_process.execSync` to call the `aleph` CLI (or `node /Users/ludo/code/aleph/cli/bin/aleph.js`). Each entity creation is done with `--json` flag and the result is parsed to confirm success.

**Batch strategy:** Seed entities are created sequentially with a small delay to avoid overwhelming the server. Spells (~500+) take the longest; feats are similarly numerous.

**Content format for entity `--content`:** Each entity's markdown content is built from the JSON data, creating a human-readable description:

Para un conjuro:

```markdown
**Nivel:** 5 | **Acciones:** ◆◆◆ | **Tradiciones:** Primigenia

**Alcance:** 4,5 m | **Objetivos:** hasta 8 criaturas | **Duracion:** 10 minutos

**Rasgos:** Concentracion, Ilusion, Manipulacion

---

[Texto de descripcion]

**Potenciado:** (+1) La duracion aumenta 10 minutos.
```

### Idempotency

The `setup.js` script:

1. Calls `aleph campaign list --json` and searches for an existing campaign with the same name
2. If found, prints the campaign ID and exits with a message rather than duplicating
3. Entity seeding is done in a separate pass (`seed-entities.js --campaign <id>`) to allow re-running just the seed without recreating the campaign structure

## Risks / Trade-offs

- **Large entity count** → The script may take 10–20 minutes to run for a full seed. Mitigation: progress output per batch, can be interrupted and re-run.
- **Duplicate detection** → The script doesn't track which entities already exist beyond the campaign-level check. Re-running `seed-entities.js` on an existing campaign will create duplicates. Mitigation: document clearly this is a one-time setup; add `--force` flag to skip this pass.
- **CLI field support** → `template create --content <json>` and character `fields` are supported via API but the CLI `character create` doesn't expose all template field flags. The seed script will call the API directly for template field values using `apiFetch`-style direct HTTP calls with the API key from `~/.aleph/config.json`.
- **PF2e data is Spanish** → The pf2 repo is a Spanish translation. All entity names and descriptions will be in Spanish. This is fine for the intended use case.
