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

Sube las notas y genera el resumen:

```bash
node C:/code/aleph/cli/bin/aleph.js session import \
  --campaign <id> \
  [--manual <ruta>] \
  [--ai <ruta>]
```

- Si solo hay `--ai` (sin `--manual`), añade `--no-summarize` (la transcripción cruda de Gemini incluye mucho contenido fuera de la partida; no es buena base para el resumen).
- Si hay `--manual`, el resumen se genera automáticamente. Si falla (503 = IA no configurada), informa y sigue.

Anota el `slug` de la sesión creada/encontrada para los pasos siguientes.

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

**Actualizar estado de un personaje:**

```bash
node C:/code/aleph/cli/bin/aleph.js character update <slug> \
  --campaign <id> --content "<descripción actualizada>"
```

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
