## Context

The SWADE data at `/Users/ludo/code/swade` is organized as:

- **Spanish manual JSON** in `manuales/jsons/core/` and `manuales/jsons/supers/` — clean Spanish arrays for ventajas, desventajas, rasgos, superpoderes, and all equipment
- **Spanish superpower markdown** in `superpowers-es/` — 95 `.md` files, one per superpoder, with full description + modifier table

The target campaign is **Arcadia - La fuerza oculta** (ID `753b7958-d63b-4053-bcb5-1ac44b0f96e0`) on `aleph.ludobermejo.es`. The script does NOT create a new campaign — it adds entity types, templates, and entities to this existing one.

Auth is read from `~/.aleph/config.json` (same file the `aleph` CLI uses: `{ serverUrl, apiKey }`).

**Entity type strategy:** Aleph's entity wiki system is the right home for SWADE reference content — ventajas, rasgos, superpoderes, equipo are reference material. Characters (PCs and NPCs/criaturas) use the character system with templates.

## Goals / Non-Goals

**Goals:**

- `node scripts/swade-arcadia/setup.js` creates all entity types and templates in the Arcadia campaign
- `node scripts/swade-arcadia/seed-entities.js --all` populates all reference content
- Every SWADE category has a matching entity type with Spanish display name
- Every entity type has a template with typed fields in Spanish
- Two character templates: "Personaje SWADE" (PJ) and "Criatura SWADE" (PNJ)
- Script is idempotent at entity-type level: skips types that already exist by slug

**Non-Goals:**

- Importing the FoundryVTT building/ JSON (those are Foundry-specific format with HTML descriptions; the manuales/ JSON is cleaner and already in Spanish)
- Seeding the full 651-entry core bestiary or 5,433-entry supers bestiary (too large; DM adds creatures manually)
- Importing campaign markdown files (isla_aldebo.md, etc.) — those are DM notes, not reference data
- Creating currencies (SWADE uses abstract wealth; no coin tracking needed)
- Any server code changes

## Decisions

### Entity type mapping

| SWADE Category      | Entity Type Slug   | Display Name        | Template Fields (Spanish)                                             |
| ------------------- | ------------------ | ------------------- | --------------------------------------------------------------------- |
| Ventaja             | `swade-ventaja`    | Ventaja             | Requisitos, Categoria, Descripcion                                    |
| Desventaja          | `swade-desventaja` | Desventaja          | Tipo (Mayor/Menor), Descripcion                                       |
| Rasgo/Habilidad     | `swade-rasgo`      | Rasgo               | Atributo Vinculado, Descripcion                                       |
| Superpoder          | `swade-superpoder` | Superpoder          | Coste, Ornamentos, Descripcion, Modificadores                         |
| Armadura            | `swade-armadura`   | Armadura            | Proteccion, Localizaciones, Peso, Coste, Fuerza Minima, Notas         |
| Arma                | `swade-arma`       | Arma                | Dano, Fuerza Minima, Peso, Coste, Notas, Categoria                    |
| Equipo              | `swade-equipo`     | Equipo              | Peso, Coste, Notas, Categoria                                         |
| Escudo              | `swade-escudo`     | Escudo              | Bonus Parada, Cobertura, Peso, Coste                                  |
| Vehículo            | `swade-vehiculo`   | Vehiculo            | Tamanio, Manejo, Velocidad Max, Dureza, Tripulacion, Coste, Categoria |
| Base de Operaciones | `swade-base`       | Base de Operaciones | Coste por Nivel, Dureza, Modificaciones Disponibles                   |
| Raza                | `swade-raza`       | Raza                | Habilidades Raciales, Descripcion                                     |

### Character templates

**Plantilla PJ** (`entityTypeSlug: character`, `isDefault: false`, name: "Personaje SWADE"):

```
SECCION: Datos Principales
- rango (select: novato/avanzado/veterano/heroico/legendario)
- raza (text)
- concepto (text)
- puntos_poder_super (number)  — SPP total disponibles

SECCION: Atributos
- agilidad (select: d4/d6/d8/d10/d12)
- astucia (select: d4/d6/d8/d10/d12)
- espiritu (select: d4/d6/d8/d10/d12)
- fuerza (select: d4/d6/d8/d10/d12)
- vigor (select: d4/d6/d8/d10/d12)

SECCION: Derivadas
- ritmo (number), parada (number), temple (number)
- carga_max (number)

SECCION: Heridas y Fatiga
- heridas (number), fatiga (number)
- heridas_incapacitado (checkbox)

SECCION: Rasgos / Habilidades
- habilidades (textarea — "Atletismo d6, Pelear d8, Disparar d10...")

SECCION: Ventajas
- ventajas (textarea)

SECCION: Desventajas
- desventajas (textarea)

SECCION: Superpoderes
- puntos_poder_gastados (number)
- superpoderes (textarea — nombre + ornamento por linea)
- puntos_de_poder (number)  — PP actuales para activar poderes

SECCION: Equipo
- armas (textarea)
- armadura (text)
- equipo (textarea)
- dinero (text)

SECCION: Notas
- trasfondo (textarea)
- notas (textarea)
```

**Plantilla PNJ/Criatura** (`entityTypeSlug: character`, `isDefault: false`, name: "Criatura SWADE"):

```
SECCION: Identidad
- tipo (text — "Humano", "Bestia", "Construccion"...)
- comodin (checkbox — es Comodín?)
- rango (select: salvaje/avanzado/veterano/heroico/legendario)
- rareza (select: comun/infrecuente/raro/unico)

SECCION: Atributos
- agilidad (select: d4/d6/d8/d10/d12)
- astucia (select: d4/d6/d8/d10/d12)
- espiritu (select: d4/d6/d8/d10/d12)
- fuerza (select: d4/d6/d8/d10/d12)
- vigor (select: d4/d6/d8/d10/d12)

SECCION: Derivadas
- ritmo (number), parada (number), temple (number)

SECCION: Habilidades
- habilidades (textarea — "Atletismo d6, Intimidar d8...")

SECCION: Ventajas y Habilidades Especiales
- ventajas (textarea)
- habilidades_especiales (textarea — poderes innatos, rasgos únicos)

SECCION: Equipo
- armas (textarea)
- armadura (text)

SECCION: Superpoderes
- puntos_poder_super (number)
- superpoderes (textarea)

SECCION: Fuente
- libro_fuente (text), pagina (text)
- xp_otorgado (number)
- notas (textarea)
```

### Script architecture

```
scripts/swade-arcadia/
├── setup.js           # Creates entity types + templates in Arcadia campaign
├── seed-entities.js   # Reads manuales/ JSON + superpowers-es/ md, creates entities
├── lib/
│   ├── api.js         # HTTP helper: reads ~/.aleph/config.json, makes API calls
│   ├── templates.js   # Template field definitions for all entity types
│   └── format.js      # Markdown content formatters per entity category
└── README.md
```

**Data sources used:**

| Type                       | Source file(s)                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Ventajas (core)            | `manuales/jsons/core/ventajas.json` (134)                                                                    |
| Ventajas supers            | `manuales/jsons/supers/ventajasSuperheroes.json` (6)                                                         |
| Desventajas (core)         | `manuales/jsons/core/desventajas.json` (57)                                                                  |
| Desventajas supers         | `manuales/jsons/supers/desventajasSuperheroes.json` (15)                                                     |
| Rasgos/habilidades         | `manuales/jsons/core/rasgos.json` (32)                                                                       |
| Superpoderes               | `manuales/jsons/supers/superpoderes.json` (12 with modifiers) + `superpowers-es/*.md` (95 full descriptions) |
| Armaduras (core)           | `manuales/jsons/core/objetos/armaduras.json`                                                                 |
| Armaduras (supers)         | `manuales/jsons/supers/objetos/armaduras.json`                                                               |
| Armas personales           | `manuales/jsons/core/objetos/armas_personales.json`                                                          |
| Armas especiales           | `manuales/jsons/core/objetos/armas_especiales.json`                                                          |
| Armas supers               | `manuales/jsons/supers/objetos/armas.json`                                                                   |
| Escudos                    | `manuales/jsons/core/objetos/escudos.json`                                                                   |
| Equipo misceláneo          | `manuales/jsons/core/objetos/equipo_miscelaneo.json`                                                         |
| Equipo aventurero (supers) | `manuales/jsons/supers/objetos/equipo_aventurero.json`                                                       |
| Vehículos                  | `manuales/jsons/core/objetos/vehiculos.json` + `manuales/jsons/supers/objetos/vehiculos.json`                |
| Bases de operaciones       | `manuales/jsons/supers/objetos/bases_operaciones.json`                                                       |

**Superpoderes merge strategy:** The `superpoderes.json` index has 12 entries with `nombre`, `coste`, `ornamentos`, `descripción`, `modificadores[]`. The `superpowers-es/` directory has 95 `.md` files with full descriptions. The seed script merges them: for each `.md` file, derive the entity name from the filename (kebab-case → title case), use the full markdown as content, and look up cost/ornamentos from the JSON index if the name matches.

**Equipment JSON structure:** All equipment files use a category-grouped format:

```json
[{ "category": "Armas Cuerpo a Cuerpo", "items": [{ "name": "...", "damage": "...", ... }] }]
```

The seed script flattens these, using `category` as a tag on each entity.

**Content format for entity `--content`:** Each entity gets human-readable markdown built from its JSON fields:

Para una ventaja:

```markdown
**Requisitos:** Novato, Pelear d6+

Descripcion completa de la ventaja...
```

Para un superpoder:

```markdown
**Coste:** 2 SPP

**Ornamentos:** Forma amorfa, control de energía, magia...

Descripcion completa del poder...

## Modificadores

- **Crecimiento** (+3): ...
- **Reduccion** (-1): ...
```

Para un arma:

```markdown
**Daño:** FUE+d8 | **Fuerza Min.:** d8 | **Peso:** 3 | **Coste:** 250 mo

Notas: Alcance 1, dos manos.
```

### Idempotency

`setup.js`:

1. Lists existing entity types for the campaign (`GET /api/campaigns/:id/entity-types`)
2. Skips creation for any slug that already exists
3. Same for templates: lists existing, skips duplicates

`seed-entities.js`:

- No per-entity duplicate check (creating entities is idempotent enough via fresh run)
- Documented as a one-time seed; re-running creates duplicates (same as pf2 setup)

## Risks / Trade-offs

- **Superpoderes count mismatch** → The JSON index has 12 entries but 95 markdown files exist. The merge is best-effort: all 95 markdown files are seeded as entities; the 12 JSON entries add structured fields (coste, ornamentos) where name matches. Unmatched md files get content-only entities with no template fields.
- **Equipment categories as tags** → SWADE equipment is grouped by era/category (medieval, contemporary, futuristic). These become entity tags so DMs can filter by category.
- **No bestiary seed** → The full bestiary (651 + 5,433 entries) is too large and has HTML-formatted descriptions in English. DMs add NPCs as characters using the "Criatura SWADE" template.
- **Foundry VTT JSON skipped** → The `building/` directory has richer data (requirement objects, grants, etc.) but is Foundry-specific format with HTML in English. The `manuales/jsons/` files are cleaner Spanish arrays.
