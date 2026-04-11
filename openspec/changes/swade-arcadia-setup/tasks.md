# Tasks: swade-arcadia-setup

## 1. Scaffold script directory

- [ ] Create `scripts/swade-arcadia/` directory with `lib/` subdirectory
- [ ] Create `scripts/swade-arcadia/lib/api.js` — reads `~/.aleph/config.json`, exports `apiFetch(path, method, body)` that calls `aleph.ludobermejo.es` with `X-API-Key` header; prints Spanish error and exits if config missing
- [ ] Create `scripts/swade-arcadia/lib/templates.js` — exports all entity type definitions and template field arrays (see section 2 and 3)
- [ ] Create `scripts/swade-arcadia/lib/format.js` — exports content formatters: `formatVentaja`, `formatDesventaja`, `formatRasgo`, `formatSuperpoder`, `formatArmadura`, `formatArma`, `formatEquipo`, `formatEscudo`, `formatVehiculo`, `formatBase`

## 2. Setup script — entity types and templates

- [ ] Create `scripts/swade-arcadia/setup.js` with campaign ID hardcoded as `ARCADIA_CAMPAIGN_ID = '753b7958-d63b-4053-bcb5-1ac44b0f96e0'`
- [ ] Implement `createEntityTypes()`: POST each of the 11 types to `/api/campaigns/:id/entity-types`; skip (log "ya existe, omitiendo") if slug already present
  - `swade-ventaja` → display "Ventaja"
  - `swade-desventaja` → display "Desventaja"
  - `swade-rasgo` → display "Rasgo"
  - `swade-superpoder` → display "Superpoder"
  - `swade-armadura` → display "Armadura"
  - `swade-arma` → display "Arma"
  - `swade-equipo` → display "Equipo"
  - `swade-escudo` → display "Escudo"
  - `swade-vehiculo` → display "Vehiculo"
  - `swade-base` → display "Base de Operaciones"
  - `swade-raza` → display "Raza"
- [ ] Implement `createEntityTemplates()`: POST a template for each entity type via `/api/campaigns/:id/entity-templates` with fields array; skip if name already present
  - **swade-ventaja**: fields: `requisitos` (text), `categoria` (text), `descripcion` (textarea)
  - **swade-desventaja**: fields: `tipo` (select: Mayor/Menor/Mayor o Menor), `descripcion` (textarea)
  - **swade-rasgo**: fields: `atributo_vinculado` (select: Agilidad/Astucia/Espiritu/Fuerza/Vigor), `descripcion` (textarea)
  - **swade-superpoder**: fields: `coste` (text), `ornamentos` (textarea), `descripcion` (textarea), `modificadores` (textarea)
  - **swade-armadura**: fields: `proteccion` (number), `localizaciones` (text), `peso` (number), `coste` (number), `fuerza_minima` (select: d4/d6/d8/d10/d12/-), `notas` (text)
  - **swade-arma**: fields: `dano` (text), `fuerza_minima` (select: d4/d6/d8/d10/d12/-), `peso` (number), `coste` (number), `notas` (text), `categoria` (text)
  - **swade-equipo**: fields: `peso` (number), `coste` (number), `notas` (text), `categoria` (text)
  - **swade-escudo**: fields: `bonus_parada` (number), `cobertura` (text), `peso` (number), `coste` (number)
  - **swade-vehiculo**: fields: `tamanio` (number), `manejo` (text), `velocidad_max` (number), `dureza` (text), `tripulacion` (text), `coste` (number), `categoria` (text)
  - **swade-base**: fields: `coste_por_nivel` (number), `dureza` (number), `modificaciones` (textarea)
  - **swade-raza**: fields: `habilidades_raciales` (textarea), `descripcion` (textarea)
- [ ] Implement `createCharacterTemplates()`: POST two character templates to `/api/campaigns/:id/character-templates`
  - **"Personaje SWADE"**: sections Datos Principales (rango select, raza text, concepto text, puntos_poder_super number), Atributos (5 × select d4-d12), Derivadas (ritmo/parada/temple number, carga_max number), Heridas y Fatiga (heridas number, fatiga number, heridas_incapacitado checkbox), Rasgos/Habilidades (habilidades textarea), Ventajas (textarea), Desventajas (textarea), Superpoderes (puntos_poder_gastados number, superpoderes textarea, puntos_de_poder number), Equipo (armas textarea, armadura text, equipo textarea, dinero text), Notas (trasfondo textarea, notas textarea)
  - **"Criatura SWADE"**: sections Identidad (tipo text, comodin checkbox, rango select, rareza select), Atributos (5 × select d4-d12), Derivadas (ritmo/parada/temple number), Habilidades (textarea), Ventajas y Habilidades Especiales (ventajas textarea, habilidades_especiales textarea), Equipo (armas textarea, armadura text), Superpoderes (puntos_poder_super number, superpoderes textarea), Fuente (libro_fuente text, pagina text, xp_otorgado number, notas textarea)
- [ ] Print final summary: "✓ Configuración completada. X tipos de entidad, Y plantillas creadas."

## 3. Content formatters (lib/format.js)

- [ ] `formatVentaja(v)` → markdown: `**Requisitos:** ${v.requisitos}\n\n${v.descripción}`
- [ ] `formatDesventaja(d)` → markdown: `**Tipo:** ${d.tipo}\n\n${d.descripción}`
- [ ] `formatRasgo(r)` → markdown: `**Atributo:** ${r.atributo}\n\n${r.descripción}`
- [ ] `formatSuperpoder(sp, mdContent)` → if mdContent provided use it as base; prepend `**Coste:** ${sp.coste}\n\n**Ornamentos:** ${sp.ornamentos}\n\n`; append `## Modificadores\n` table from `sp.modificadores[]`; if no JSON match, use mdContent as-is
- [ ] `formatArmadura(item, category)` → `**Protección:** ${item.armor} | **Localizaciones:** ${item.locations} | **Peso:** ${item.weight} kg | **Coste:** ${item.cost} mo\n\nCategoría: ${category}${item.notes ? '\n\n' + item.notes : ''}`
- [ ] `formatArma(item, category)` → `**Daño:** ${item.damage} | **Fuerza Min.:** ${item.min_strength} | **Peso:** ${item.weight} kg | **Coste:** ${item.cost} mo\n\n${item.notes || ''}`
- [ ] `formatEquipo(item, category)` → `**Peso:** ${item.weight ?? '-'} kg | **Coste:** ${item.cost} mo\n\nCategoría: ${category}${item.notes ? '\n\n' + item.notes : ''}`
- [ ] `formatEscudo(item, category)` → `**Bonus Parada:** ${item.parry_bonus ?? '-'} | **Cobertura:** ${item.coverage ?? '-'} | **Peso:** ${item.weight} kg | **Coste:** ${item.cost} mo`
- [ ] `formatVehiculo(item, category)` → `**Tamaño:** ${item.size} | **Manejo:** ${item.handling} | **Vel. Máx.:** ${item.topspeed} km/h | **Dureza:** ${item.toughness} | **Tripulación:** ${item.crew}\n\nCategoría: ${category}`
- [ ] `formatBase(base)` → content describing base with cost per level and list of available modifications

## 4. Seed script — ventajas and desventajas

- [ ] Create `scripts/swade-arcadia/seed-entities.js` with `--type` and `--all` CLI argument parsing (use `process.argv`)
- [ ] Implement `seedVentajas()`:
  - Load `manuales/jsons/core/ventajas.json` (134) and `manuales/jsons/supers/ventajasSuperheroes.json` (6)
  - POST each to `/api/campaigns/:id/entities` with `type: 'swade-ventaja'`, `name: v.nombre`, `content: formatVentaja(v)`, `templateFields: { requisitos: v.requisitos, descripcion: v.descripción }`
  - Tag supers entries with `['superheroes']`
  - Print progress: "Creando ventaja: Arma Distintiva..."
  - Print summary: "✓ 140 ventajas creadas"
- [ ] Implement `seedDesventajas()`:
  - Load `manuales/jsons/core/desventajas.json` (57) and `manuales/jsons/supers/desventajasSuperheroes.json` (15)
  - POST each with `type: 'swade-desventaja'`, `templateFields: { tipo: d.tipo, descripcion: d.descripción }`
  - Tag supers entries with `['superheroes']`
  - Print summary: "✓ 72 desventajas creadas"

## 5. Seed script — rasgos and superpoderes

- [ ] Implement `seedRasgos()`:
  - Load `manuales/jsons/core/rasgos.json` (32)
  - POST each with `type: 'swade-rasgo'`, `templateFields: { atributo_vinculado: r.atributo, descripcion: r.descripción }`
  - Print summary: "✓ 32 rasgos creados"
- [ ] Implement `seedSuperpoderes()`:
  - Build an index map from `manuales/jsons/supers/superpoderes.json` keyed by `nombre` (case-insensitive, normalized)
  - Enumerate all `.md` files in `superpowers-es/`; derive entity name from filename (e.g. `ataque-a-distancia.md` → "Ataque a Distancia")
  - For each md file: read content, look up JSON entry by name, build combined content with `formatSuperpoder`
  - POST with `type: 'swade-superpoder'`; include `coste` and `ornamentos` in templateFields when JSON entry found
  - Print summary: "✓ 95 superpoderes creados"

## 6. Seed script — equipment (armaduras, armas, escudos, equipo, vehiculos, bases)

- [ ] Implement `seedArmaduras()`:
  - Load and flatten `manuales/jsons/core/objetos/armaduras.json` and `manuales/jsons/supers/objetos/armaduras.json`
  - Flatten category groups: each `items[]` entry + `category` string
  - POST each with `type: 'swade-armadura'`, templateFields: `{ proteccion, localizaciones, peso, coste, fuerza_minima }`
  - Tag with slugified category name
  - Print summary: "✓ N armaduras creadas"
- [ ] Implement `seedArmas()`:
  - Load and flatten `armas_personales.json`, `armas_especiales.json`, `manuales/jsons/supers/objetos/armas.json`
  - POST each with `type: 'swade-arma'`, templateFields: `{ dano, fuerza_minima, peso, coste, notas, categoria }`
  - Tag with slugified category name
  - Print summary: "✓ N armas creadas"
- [ ] Implement `seedEscudos()`:
  - Load and flatten `manuales/jsons/core/objetos/escudos.json`
  - POST each with `type: 'swade-escudo'`, templateFields: `{ bonus_parada, cobertura, peso, coste }`
  - Note: escudos JSON fields may differ — inspect and map `parry_bonus`, `coverage` from actual field names
  - Print summary: "✓ N escudos creados"
- [ ] Implement `seedEquipo()`:
  - Load and flatten `manuales/jsons/core/objetos/equipo_miscelaneo.json` and `manuales/jsons/supers/objetos/equipo_aventurero.json`
  - POST each with `type: 'swade-equipo'`, templateFields: `{ peso, coste, notas, categoria }`
  - Print summary: "✓ N equipos creados"
- [ ] Implement `seedVehiculos()`:
  - Load and flatten `manuales/jsons/core/objetos/vehiculos.json` and `manuales/jsons/supers/objetos/vehiculos.json`
  - POST each with `type: 'swade-vehiculo'`, templateFields: `{ tamanio, manejo, velocidad_max, dureza, tripulacion, coste, categoria }`
  - Tag with slugified category (ej. `terrestre`, `aeronave`, `acuatico`, `militar`)
  - Print summary: "✓ N vehiculos creados"
- [ ] Implement `seedBases()`:
  - Load `manuales/jsons/supers/objetos/bases_operaciones.json`
  - Create a single entity "Base de Operaciones" of type `swade-base` with content describing the system and available modifications
  - Print summary: "✓ Base de operaciones creada"

## 7. Seed script — --all flag and error handling

- [ ] Implement `--all` flag: runs all seed functions in sequence with progress output
- [ ] Implement `--type <nombre>` single-type seeding: maps type names (ventajas, desventajas, rasgos, superpoderes, armaduras, armas, escudos, equipo, vehiculos, bases) to their seed functions
- [ ] Add top-level error handler: print error message in Spanish and exit with code 1 on API failures
- [ ] Add small delay (100ms) between entity creates to avoid rate-limiting the server

## 8. README

- [ ] Create `scripts/swade-arcadia/README.md` with sections:
  - **Requisitos** — Node.js, `aleph login` ejecutado
  - **Uso** — `node setup.js` then `node seed-entities.js --all`
  - **Tipos por separado** — `node seed-entities.js --type ventajas`
  - **Advertencia** — no re-ejecutar seed sobre campaña ya poblada (crea duplicados)
  - **Fuentes de datos** — tabla de archivos fuente por tipo de entidad
