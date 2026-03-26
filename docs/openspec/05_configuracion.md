# Configuración de OpenSpec

Tres niveles de personalización:

| Nivel | Qué permite | Para quién |
|-------|-------------|------------|
| **Project Config** | Defaults, contexto del proyecto, reglas por artifact | La mayoría de equipos |
| **Custom Schemas** | Workflow propio con artifacts personalizados | Equipos con procesos únicos |
| **Global Overrides** | Compartir schemas entre proyectos | Power users |

---

## Project Config (`openspec/config.yaml`)

El archivo más importante para personalizar OpenSpec en un proyecto concreto.

### Estructura

```yaml
# openspec/config.yaml
schema: spec-driven

context: |
  Project: Aleph - A TTRPG Campaign Management Suite
  Tech stack: Nuxt 4 (Vue 3, Vite, Nitro), SQLite (via Drizzle ORM), better-auth, Hocuspocus, Tailwind CSS, shadcn-vue
  Architecture: Full-stack Nuxt app — pages and components in app/, server API routes in server/api/, DB schema in server/db/schema/, migrations in server/db/migrations/
  Domain: Tabletop RPG campaign management — entities/wiki, characters, sessions, quests, maps, calendars, timelines, relations, inventories, shops, currencies
  Auth: better-auth with email/password; role-based access (dm, co_dm, editor, player, visitor) enforced per campaign
  Testing: Vitest for unit + integration tests, Playwright for E2E; integration tests require a running server on port 3333
  Phase: Active development — core features implemented, iterating on polish, performance, and new features

rules:
  proposal:
    - Focus on the problem being solved and why it matters for the existing codebase
    - Identify which files and areas are affected
  specs:
    - Use Given/When/Then format for scenarios
    - Include role-based permission context where relevant
    - Reference existing API routes or components when describing behaviour
  tasks:
    - Tasks should be concrete and implementable — each maps to specific file changes
    - Order tasks so foundational work (types, composables, utilities) comes before consumers
    - Verification tasks (build, test, lint) should be the final group
```

### Cómo funciona

**`schema`**: Schema por defecto para nuevos changes. Se puede sobrescribir con `--schema` en el CLI.

**`context`**: Se inyecta en TODOS los artifacts como `<context>...</context>`. Ayuda a la IA a entender las convenciones del proyecto. Límite: 50 KB.

**`rules`**: Se inyectan solo para el artifact correspondiente como `<rules>...</rules>`. Aparecen después del contexto, antes del template.

### Precedencia del schema

1. CLI flag: `--schema <nombre>`
2. Metadatos del change (`.openspec.yaml` en la carpeta del change)
3. Config del proyecto (`openspec/config.yaml`)
4. Default: `spec-driven`

---

## Custom Schemas

Cuando el config del proyecto no es suficiente. Los schemas personalizados viven en `openspec/schemas/` y se versionan con el código.

### Estructura de un schema

```
openspec/schemas/mi-workflow/
├── schema.yaml
└── templates/
    ├── proposal.md
    ├── spec.md
    ├── design.md
    └── tasks.md
```

### Crear un schema desde cero

```bash
# Interactivo
openspec schema init mi-workflow

# No interactivo
openspec schema init rapid \
  --description "Workflow rápido sin specs" \
  --artifacts "proposal,tasks" \
  --default
```

### Hacer fork de un schema existente

```bash
# La forma más rápida: partir del schema-driven y personalizar
openspec schema fork spec-driven aleph-workflow
```

Copia todo el schema a `openspec/schemas/aleph-workflow/` donde puedes editarlo libremente.

### Definición de schema (`schema.yaml`)

```yaml
name: aleph-workflow
version: 1
description: Workflow personalizado de Aleph para cambios en la app de gestión de campañas

artifacts:
  - id: proposal
    generates: proposal.md
    description: Propuesta de cambio
    template: proposal.md
    instruction: |
      Crea una propuesta que explique POR QUÉ se necesita este cambio.
      Identificar qué roles de campaña se ven afectados (dm, co_dm, editor, player, visitor).
      Indicar si el cambio afecta a la API, al frontend, o a ambos.
    requires: []

  - id: specs
    generates: specs/**/*.md
    description: Especificaciones de comportamiento
    template: spec.md
    instruction: |
      Crea delta specs con los requisitos que cambian.
      Usa formato Given/When/Then para los scenarios.
      Incluir scenario de permisos por rol cuando aplique.
    requires:
      - proposal

  - id: design
    generates: design.md
    description: Diseño técnico
    template: design.md
    instruction: |
      Documenta las decisiones técnicas.
      Si hay cambios en el schema de BD, especificar la migración Drizzle.
      Si hay nuevas rutas API, listarlas con método y path completo.
    requires:
      - proposal

  - id: tasks
    generates: tasks.md
    description: Checklist de implementación
    template: tasks.md
    instruction: |
      Crea la lista de tareas con checkboxes.
      Ordenar: schema/tipos primero, luego API, luego componentes Vue.
      Siempre incluir tareas de build, tests y lint al final.
    requires:
      - specs
      - design

apply:
  requires: [tasks]
  tracks: tasks.md
```

### Templates

Los templates guían a la IA sobre qué generar. Son archivos Markdown con secciones y comentarios HTML:

```markdown
<!-- templates/proposal.md -->
# Propuesta: {nombre-del-change}

## Motivación

<!-- ¿Qué problema resuelve este cambio? ¿Por qué es necesario ahora? -->

## Alcance

**En scope:**
-

**Fuera de scope:**
-

## Enfoque técnico

<!-- Descripción de alto nivel de cómo se implementará -->

## Impacto

<!-- ¿Afecta a integraciones E3L? ¿A qué CCAA? -->
<!-- ¿Hay riesgo de regresión? -->

## Rollback

<!-- ¿Cómo se deshace si algo va mal? -->
```

### Validar y usar el schema

```bash
# Validar antes de usar
openspec schema validate aleph-workflow

# Verificar de dónde se resuelve
openspec schema which aleph-workflow

# Usar al crear un change
openspec new change mi-feature --schema aleph-workflow

# O establecer como default en config.yaml
# schema: aleph-workflow
```

---

## Ejemplo: Schema para nuevas entidades de dominio

```yaml
# openspec/schemas/aleph-domain-entity/schema.yaml
name: aleph-domain-entity
version: 1
description: Workflow para añadir una nueva entidad al dominio de Aleph (DB + API + UI)

artifacts:
  - id: proposal
    generates: proposal.md
    requires: []
    instruction: |
      Especificar:
      - Qué entidad se añade y su relación con la campaña
      - Roles que pueden crear/editar/ver (dm, co_dm, editor, player, visitor)
      - Si necesita slug único o UUID como identificador
      - Impacto en el dashboard de campaña

  - id: specs
    generates: specs/**/*.md
    requires: [proposal]
    instruction: |
      Incluir scenarios para:
      - CRUD completo con permisos por rol
      - Validaciones requeridas en el servidor
      - Comportamiento cuando la campaña no existe o el usuario no tiene acceso
      - Paginación si la lista puede ser larga

  - id: design
    generates: design.md
    requires: [proposal]
    instruction: |
      Documentar:
      - Schema Drizzle (tabla, columnas, relaciones)
      - Rutas API (GET/POST/PATCH/DELETE en server/api/campaigns/[id]/)
      - Componentes Vue necesarios (página index, detail, form)
      - Entradas en sidebar nav y campaign dashboard

  - id: tasks
    generates: tasks.md
    requires: [specs, design]

apply:
  requires: [tasks]
  tracks: tasks.md
```

---

## Telemetría

OpenSpec recopila estadísticas anónimas (solo nombres de comandos y versión, sin contenido ni paths).

Para deshabilitar:
```bash
export OPENSPEC_TELEMETRY=0
# o
export DO_NOT_TRACK=1
```

Se deshabilita automáticamente en CI.
