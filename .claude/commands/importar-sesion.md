---
name: 'Importar Sesión'
description: Importa una sesión de rol completa a Aleph usando el aleph-cli. Lee las notas, crea la sesión, sube el contenido, genera el resumen y crea/actualiza todos los personajes, localizaciones, facciones y demás entidades mencionadas.
category: Workflow
tags: [aleph, session, import, ttrpg]
---

Cuando el usuario ejecute `/importar-sesion`, documenta la sesión **completamente en Aleph** usando el aleph-cli. No se crea ningún fichero local — todo va al servidor remoto.

## Paso 0 — Verificar configuración

```bash
cat ~/.aleph/config.json 2>/dev/null || echo "not configured"
```

Debe tener `url` apuntando a `https://aleph.ludobermejo.es` y `apiKey` presente. Si falta, pide al usuario que ejecute `node C:/code/aleph/cli/bin/aleph.js login`.

## Paso 1 — Identificar archivos y campaña

El usuario proporcionará uno o dos archivos:

- **`--manual <ruta>`**: Notas del DM (fuente principal de verdad)
- **`--ai <ruta>`**: Transcripción de Gemini (contenido crudo, puede tener mucho off-topic)

**Lee ambos archivos** antes de continuar.

Identifica la campaña por la ruta del archivo:

- `sesiones/kingmaker/` → **Kingmaker** (Pathfinder, tierras salvajes, personajes: Sim Sim, Laughlin, Durgan, Tark Krap, Dain)
- `sesiones/arcadia/` → **Arcadia** (superhéroes, La Fuerza Oculta)
- `sesiones/kult/` → **Kult** (Kult: Divinity Lost)

Lista las campañas del servidor y guarda el `id` de la que corresponda:

```bash
node C:/code/aleph/cli/bin/aleph.js campaign list --json
```

## Paso 2 — Importar la sesión

Sube las notas brutas al servidor sin generar resumen automático:

```bash
node C:/code/aleph/cli/bin/aleph.js session import \
  --campaign <id> \
  [--manual <ruta>] \
  [--ai <ruta>] \
  --no-summarize
```

Anota el `slug` de la sesión creada/encontrada para los pasos siguientes.

## Paso 2b — Generar el resumen de síntesis

**Lee completamente ambos archivos** (manual notes y ai notes si existen). A partir de ellos escribe tú el resumen de la sesión siguiendo estas reglas:

- Incluye solo lo que ocurrió **dentro de la partida**: hechos, diálogos relevantes, decisiones, combates, revelaciones.
- Elimina todo lo que sea meta: quién asistió, bromas fuera de contexto, comentarios de los jugadores, interrupciones técnicas.
- Usa siempre **nombres de personajes**, nunca nombres de jugadores.
- Las notas manuales son la fuente de verdad narrativa. Las notas AI completan detalles de diálogo y momentos concretos que las manuales omiten.
- Trata a Ludo Bermejo como el narrador/DM, no como un jugador más.

Guarda el resumen en el fichero local:

```
C:\code\aleph\sesiones\<campaña>\summary\session-YYYY-MM-DD.md
```

El nombre del fichero debe coincidir con la fecha de la sesión (igual que en `manual-notes/` y `ai-notes/`). Si la carpeta `summary/` no existe, créala.

Una vez guardado localmente, súbelo al campo `summary` de la sesión en Aleph:

```bash
node C:/code/aleph/cli/bin/aleph.js session content set <slug> \
  --campaign <id> \
  --type summary \
  --file C:\code\aleph\sesiones\<campaña>\summary\session-YYYY-MM-DD.md
```

Si falla (503 u otro error), informa al usuario y continúa — el fichero local ya está guardado y puede subirse después.

## Paso 3 — Analizar el contenido

Leyendo las notas (preferentemente las manuales), extrae:

### Personajes (PJs y NPCs)

Por cada personaje mencionado, determina:

- ¿Es un PJ (jugador) o NPC?
- ¿Ya existe en Aleph? → `node C:/code/aleph/cli/bin/aleph.js character list --campaign <id> --json`
- ¿Es nuevo? → créalo
- ¿Ganó información nueva (estado, ubicación, relaciones)? → actualízalo

### Entidades del wiki (localizaciones, facciones, objetos, lore)

Por cada elemento del worldbuilding mencionado:

- ¿Ya existe como entidad? → `node C:/code/aleph/cli/bin/aleph.js entity list --campaign <id> --json`
- ¿Es nuevo? → créalo con el tipo correcto
- ¿Tiene información relevante? → edítalo con `entity edit`

### Organizaciones / Facciones

Por cada facción, clan, gremio o grupo mencionado:

- ¿Existe? → `node C:/code/aleph/cli/bin/aleph.js organization list --campaign <id> --json`
- ¿Es nueva? → créala
- ¿Hay miembros nuevos? → `organization member-add`

### Localizaciones

Por cada lugar visitado o mencionado con relevancia narrativa:

- ¿Existe? → `node C:/code/aleph/cli/bin/aleph.js location list --campaign <id> --json`
- ¿Es nueva? → créala con el subtipo correcto (`city`, `town`, `wilderness`, `dungeon`, `building`, etc.)

## Paso 4 — Crear/actualizar entidades

Ejecuta los comandos necesarios para cada elemento identificado en el paso 3. Usa el juicio para decidir qué merece registro en Aleph (no crees entidades para menciones triviales).

**Personaje nuevo:**

```bash
node C:/code/aleph/cli/bin/aleph.js character create \
  --campaign <id> --name "<nombre>" --json
```

**Actualizar un personaje — campos disponibles:**

```bash
# Descripción física (campo "content" / pestaña Información general)
node C:/code/aleph/cli/bin/aleph.js character update <slug> \
  --campaign <id> --content "<descripción física>"

# Trasfondo / origen del personaje (pestaña Historia)
node C:/code/aleph/cli/bin/aleph.js character update <slug> \
  --campaign <id> --backstory "<trasfondo y origen del personaje>"

# Historial de sesiones (pestaña Historia — se añade entrada tras cada sesión)
node C:/code/aleph/cli/bin/aleph.js character update <slug> \
  --campaign <id> --history "<resumen narrativo de lo ocurrido hasta ahora>"

# Estado actual tras la última sesión (pestaña Información general)
node C:/code/aleph/cli/bin/aleph.js character update <slug> \
  --campaign <id> --current-status "<situación actual del personaje>"
```

En una sola llamada puedes combinar varios campos:

```bash
node C:/code/aleph/cli/bin/aleph.js character update <slug> \
  --campaign <id> \
  --current-status "<dónde está y cómo se encuentra ahora>" \
  --history "<historial acumulado de sesiones>"
```

| Flag CLI           | Campo en la UI        | Pestaña             |
| ------------------ | --------------------- | ------------------- |
| `--content`        | Descripción física    | Información general |
| `--current-status` | Estado actual         | Información general |
| `--backstory`      | Trasfondo             | Historia            |
| `--history`        | Historial de sesiones | Historia            |

**Entidad del wiki (NPC, objeto, lore, evento):**

```bash
node C:/code/aleph/cli/bin/aleph.js entity create \
  --campaign <id> --name "<nombre>" --type <npc|item|lore|event|location|faction> \
  --content "<descripción>"
```

**Localización:**

```bash
node C:/code/aleph/cli/bin/aleph.js location create \
  --campaign <id> --name "<nombre>" --subtype <subtipo> \
  --content "<descripción>"
```

**Organización / Facción:**

```bash
node C:/code/aleph/cli/bin/aleph.js organization create \
  --campaign <id> --name "<nombre>" --type <faction|guild|government|other> \
  --description "<descripción>"
```

**Añadir personaje a una organización:**

```bash
node C:/code/aleph/cli/bin/aleph.js organization member-add <org-slug> \
  --campaign <id> --character <characterId>
```

**Relación entre entidades:**

```bash
node C:/code/aleph/cli/bin/aleph.js relation create \
  --campaign <id> --source <slug-A> --target <slug-B> \
  --forward "<etiqueta directa>" --reverse "<etiqueta inversa>"
```

**Quest nueva (si la sesión abre o cierra un objetivo):**

```bash
node C:/code/aleph/cli/bin/aleph.js quest create \
  --campaign <id> --name "<nombre>" --status active \
  --description "<descripción>"
```

## Paso 5 — Confirmar antes de actuar

Antes de crear o modificar entidades, presenta al usuario la lista de acciones planificadas:

```
## Acciones planificadas para Sesión DD de mes de YYYY

### Sesión
- [x] Importada: <título> (<slug>)
- [x] manual_notes / ai_notes subidas
- [x/o] Resumen generado

### A crear:
- Personaje: Tark Krap (goblin, NPC)
- Localización: Pueblo del lago (town)
- Organización: Familia Laughlin (faction)

### A actualizar:
- Personaje Sim Sim: añadir relación con Laughlin
- ...

¿Procedo con todas las acciones? (sí/no/editar)
```

Espera confirmación antes de ejecutar los comandos de creación/actualización.

## Paso 6 — Checklist final

Una vez completado todo, muestra el resumen de lo realizado:

```
## Sesión importada: <título>

- Sesión: <slug> en campaña <nombre>
- manual_notes: ✓ / —
- ai_notes: ✓ / —
- Resumen: ✓ / — (generado / no disponible)

Entidades creadas/actualizadas:
- Personajes: <lista>
- Localizaciones: <lista>
- Organizaciones: <lista>
- Entidades wiki: <lista>
- Quests: <lista>
```

## Enlaces a otras entidades dentro del texto

Aleph puede convertir automáticamente los nombres de entidades en enlaces clicables. Hay dos formas de usarlo al rellenar los campos de texto (`--content`, `--backstory`, `--history`, `--current-status`):

### Opción A — Auto-enlace automático (recomendada)

Escribe el nombre de la entidad **tal cual** en el texto. Aleph lo detecta al renderizar y lo convierte en un enlace sin que tengas que hacer nada más:

```
"Sim Sim encontró a Laughlin en el Pueblo del lago antes de que llegara Tark Krap."
```

Si `Laughlin`, `Pueblo del lago` y `Tark Krap` existen como entidades en la campaña, los tres aparecerán como enlaces clicables en la UI. El sistema es **insensible a mayúsculas** y respeta límites de palabra (no enlaza "Orc" dentro de "Oracle").

> **Importante**: el auto-enlace funciona mejor si los personajes, localizaciones y entidades ya existen en Aleph **antes** de subir el texto. Por eso, en el Paso 4 se crean primero todas las entidades y después se actualizan los campos de texto.

### Opción B — Enlace manual con slug exacto

Si quieres forzar un enlace aunque el nombre en el texto no coincida exactamente con el slug, usa la sintaxis MDC:

```
":entity-link{slug=\"pueblo-del-lago\" label=\"el pueblo\"}"
```

Ejemplo real en un campo de historial:

```bash
node C:/code/aleph/cli/bin/aleph.js character update sim-sim \
  --campaign <id> \
  --history "Tras la batalla en :entity-link{slug=\"pueblo-del-lago\" label=\"el pueblo\"}, Sim Sim acordó una tregua con :entity-link{slug=\"familia-laughlin\" label=\"la Familia Laughlin\"}."
```

### Cuándo usar cada opción

| Situación                                                  | Opción                                       |
| ---------------------------------------------------------- | -------------------------------------------- |
| El nombre en el texto coincide con el nombre de la entidad | Auto-enlace (A) — escribe normal             |
| El nombre en el texto es un alias, apodo o fragmento       | MDC manual (B) — usa `slug` + `label`        |
| Quieres enlazar dentro de un bloque de código o encabezado | MDC manual (B) — el auto-enlace no actúa ahí |

---

## Criterios de qué merece ir a Aleph

| Tipo                | Crear si...                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| Personaje           | Tiene nombre propio y actúa en la trama                                 |
| Localización        | Es un lugar con identidad propia (pueblo, mazmorra, edificio relevante) |
| Organización        | Es una facción, clan, gremio o grupo con relevancia narrativa           |
| Entidad wiki (NPC)  | Un NPC con nombre propio que puede volver a aparecer                    |
| Entidad wiki (lore) | Información de trasfondo del mundo importante                           |
| Entidad wiki (item) | Objeto único o de relevancia narrativa                                  |
| Quest               | Objetivo que los PJs han asumido o cerrado                              |

No crees entidades para menciones de pasada o elementos puramente decorativos.
