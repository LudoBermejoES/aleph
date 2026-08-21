---
name: 'Importar Sesión'
description: Importa una sesión de rol completa a Aleph usando el aleph-cli. Lee las notas, crea la sesión, sube el contenido, genera el resumen y crea/actualiza todos los personajes, localizaciones, facciones y demás entidades mencionadas.
category: Workflow
tags: [aleph, session, import, ttrpg]
---

Cuando el usuario ejecute `/importar-sesion`, documenta la sesión **completamente en Aleph** usando el aleph-cli.

## Convención de rutas — defínela UNA vez

Esta guía usaba dos rutas distintas al CLI en secciones distintas (`C:/code/aleph/...` en los pasos 1-4b y `/Users/ludo/code/aleph/...` en 4c-4d), y la segunda no existe en Windows. Resuelve la ruta una sola vez al empezar y reutilízala:

```bash
# el checkout que tengas a mano; en este equipo ambos existen
ALEPH="node C:/code/wod20/aleph/cli/bin/aleph.js"   # submódulo dentro de wod20
# ALEPH="$ALEPH"       # checkout independiente
# ALEPH="node ~/code/aleph/cli/bin/aleph.js"        # macOS
```

En el resto del documento, `$ALEPH` significa esa invocación.

> **Windows: no pases texto con acentos por la tubería ni por argumento del shell.** Git Bash mutila UTF-8 al hablar con node — una `í` (`0xC3 0xAD`) llega como `0xAD` sola, y `tail -n +3 fichero.md | $ALEPH ... --history-stdin` sube el historial con los acentos roto. Y lo que es peor: **leer** con `$ALEPH ... --json | python` corrompe igual, así que una verificación por esa vía no distingue un dato roto de una lectura rota. Para cualquier campo con acentos, usa un script `.mjs` que lea el fichero como `utf8` y lance el CLI con `spawn(process.execPath, [CLI, ...args], { shell: false })`, escribiendo el cuerpo en `stdin` como `Buffer`. Verifica dentro del mismo Node.

No se crea ningún fichero local salvo el resumen y los historiales, que viven en el repo (pasos 2b y 4b).

## Paso 0 — Verificar configuración

La credencial vive en un store global de `conf`, **fuera del repo**, y la ruta depende del sistema:

| Sistema | Ruta                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------- |
| macOS   | `~/Library/Preferences/aleph-nodejs/config.json`                                                          |
| Windows | `%APPDATA%leph-nodejs\Config\config.json` (ojo: subcarpeta `Config\`, y `%APPDATA%`, no `%LOCALAPPDATA%`) |
| Linux   | `~/.config/aleph-nodejs/config.json`                                                                      |

```bash
# macOS / Linux
cat ~/Library/Preferences/aleph-nodejs/config.json 2>/dev/null || cat ~/.config/aleph-nodejs/config.json 2>/dev/null || echo "not configured"
# Windows (Git Bash)
cat "$APPDATA/aleph-nodejs/Config/config.json" 2>/dev/null || echo "not configured"
```

Debe tener `url` apuntando a `https://aleph.ludobermejo.es` y `apiKey` presente. Si falta, pide al usuario que ejecute `$ALEPH login`.

> `~/.aleph/config.json` **no existe**: esta guía lo dio por hecho hasta 2026-08-21 y el Paso 0 fallaba en Windows aunque la sesión estuviera perfectamente autenticada.

## Paso 1 — Identificar archivos y campaña

El usuario proporcionará uno o dos archivos:

- **`--manual <ruta>`**: Notas del DM (fuente principal de verdad)
- **`--ai <ruta>`**: Transcripción de Gemini (contenido crudo, puede tener mucho off-topic)

**Lee ambos archivos** antes de continuar.

Identifica la campaña por la ruta del archivo:

- `sesiones/kingmaker/` → **Kingmaker** (Pathfinder, tierras salvajes, personajes: Sim Sim, Laughlin, Durgan, Tark Krap, Dain)
- `sesiones/arcadia/` → **Arcadia** (superhéroes, La Fuerza Oculta)
- `sesiones/kult/` → **Kult** (Kult: Divinity Lost)
- `sesiones/berlin_en_tinieblas/` → **Berlin en tinieblas** (Mundo de Tinieblas / Mago) — **tiene subcampañas, ver Paso 1b**

Lista las campañas del servidor y guarda el `id` de la que corresponda:

```bash
$ALEPH campaign list
```

> `campaign list --json` puede devolver texto no-JSON según la versión; si `--json` falla, usa la vista de tabla.

## Paso 1b — Subcampaña (OBLIGATORIO donde exista)

Una campaña puede tener varias **subcampañas**: líneas argumentales paralelas con reparto propio. `Berlin en tinieblas` tiene dos:

| Subcampaña               | Slug           | Reparto                                                                                                      |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------ |
| La capilla (por defecto) | `general`      | La cábala de magos: Roland FierBier, Julia Kirchner, Otto Von Grugger, Salvador Pacheco-König, Philip Holmes |
| La discoteca             | `la-discoteca` | Seis estudiantes mortales: Ines Falk, Clara Böhm, Theo Brandt, Lena Vogt, Matthias Keller, Jonas Reuter      |

```bash
$ALEPH sub-campaign list --campaign <id>
```

> **`session import` ACEPTA `--subcampaign <slug>`** desde el cambio `session-import-subcampaign` (2026-08-21): pásalo en el propio import y te ahorras el segundo paso. El import imprime siempre la subcampaña resultante, así que un aterrizaje en la por defecto se ve en la salida.
>
> **Sin el flag**, la sesión cae en la subcampaña **por defecto** y el import informa de éxito igualmente: así es como una sesión de La discoteca acaba dentro de La capilla. Antes de este cambio no había flag y había que moverla a mano, un paso fácil de olvidar precisamente porque no fallaba.
>
> El flag es `--subcampaign`; `--group` sobrevive como alias **obsoleto** de cuando esto se llamaba `session-group`.

## Paso 2 — Importar la sesión

Sube las notas brutas al servidor sin generar resumen automático:

```bash
$ALEPH session import \
  --campaign <id> \
  [--manual <ruta>] \
  [--ai <ruta>] \
  [--date YYYY-MM-DD] \
  [--subcampaign <slug>] \
  --no-summarize
```

Anota el `slug` de la sesión creada/encontrada. El slug se deriva de la fecha (`16-de-agosto-de-2026`); `--date` la fija explícitamente en lugar de deducirla del nombre del fichero, que es lo prudente cuando el fichero se llama `transcripcion-YYYY-MM-DD.md` en vez de seguir la convención esperada.

El import ya imprime la subcampaña resultante, así que compruébala en su salida. **Después**, dale título y estado (y `--subcampaign` solo si no lo pasaste arriba):

```bash
$ALEPH session update <slug> --campaign <id> \
  --title "<título narrativo>" \
  --status completed
```

Sin el `--subcampaign` la sesión queda en la subcampaña por defecto. Compruébalo antes de seguir con `$ALEPH session show <slug> --campaign <id>` y mirando la fila `subCampaign`.

## Paso 2b — Generar el resumen de síntesis

**Lee completamente ambos archivos** (manual notes y ai notes si existen). A partir de ellos escribe tú el resumen de la sesión siguiendo estas reglas:

- Incluye solo lo que ocurrió **dentro de la partida**: hechos, diálogos relevantes, decisiones, combates, revelaciones.
- Elimina todo lo que sea meta: quién asistió, bromas fuera de contexto, comentarios de los jugadores, interrupciones técnicas.
- Usa siempre **nombres de personajes**, nunca nombres de jugadores.
- Las notas manuales son la fuente de verdad narrativa. Las notas AI completan detalles de diálogo y momentos concretos que las manuales omiten.
- Trata a Ludo Bermejo como el narrador/DM, no como un jugador más.

Guarda el resumen en el fichero local, **dentro del repo**:

```
<repo-aleph>/sesiones/<campaña>/summary/session-YYYY-MM-DD.md
```

El nombre del fichero debe coincidir con la fecha de la sesión. Si la carpeta `summary/` no existe, créala.

> Las carpetas de origen NO son iguales en todas las campañas: `berlin_en_tinieblas` no tiene `manual-notes/` ni `ai-notes/`, solo `transcription/`. Cuando no hay notas del DM, el resumen sale íntegramente de la transcripción — que estas reglas tratan como fuente secundaria —, así que hay que separar a mano lo jugado del ruido de mesa, y conviene decirlo al entregar.

> Si la campaña tiene subcampañas, imita la cabecera de los resúmenes previos de ESA subcampaña (por ejemplo la línea en cursiva que identifica "La discoteca") y respeta su grafía de nombres: el resumen previo manda sobre el nombre del fichero de historial.

Una vez guardado localmente, súbelo al campo `summary` de la sesión en Aleph:

```bash
$ALEPH session content set <slug> \
  --campaign <id> \
  --type summary \
  --file <repo-aleph>/sesiones/<campaña>/summary/session-YYYY-MM-DD.md
```

Si falla (503 u otro error), informa al usuario y continúa — el fichero local ya está guardado y puede subirse después.

## Paso 2c — Registrar asistencia

Las notas manuales suelen comenzar con una línea de asistentes (ej. "Asisten Ludo, Conchi, Pau, Xavi, Jandro, Edu"). Extrae esa lista, mapea cada nombre al slug del personaje que controla ese jugador, y registra la asistencia:

```bash
$ALEPH session attendance mark <slug> \
  --campaign <id> \
  --characters <slug1,slug2,...>
```

Reglas de mapeo:

- Usa los nombres de **personajes** (no de jugadores) como slugs: `sim-sim`, `laughlin`, `durgan`, etc.
- Si un nombre no tiene personaje asociado (DM, espectador), omítelo.
- Si la lista de asistentes no aparece en las notas o es ambigua, pregunta al usuario antes de proceder.
- Los slugs que no se puedan resolver aparecerán en el campo `unresolved` de la respuesta — informa al usuario.

### Kingmaker — tabla de jugadores

| Jugador (alias)              | Email en Aleph              | userId en Aleph                    | Personaje                  | Slug                       |
| ---------------------------- | --------------------------- | ---------------------------------- | -------------------------- | -------------------------- |
| Eduardo Vaquerizo / Edu      | eduvaq@gmail.com            | `BJi4QrfMtimn2G2dxZ2HSjWBD8CZ3qq8` | Sim Sim                    | `sim-sim`                  |
| Alejandro Salamanca / Jandro | gwyran@gmail.com            | `8tF0lAzqjKdwFyor1jrlKBd1uzaPKGtk` | Durgan "Mediabarba" Garess | `durgan-mediabarba-garess` |
| Kauneda Arashi / Conchi      | kauneda@fihoca.com          | `b11Rr6P2JqE3FZcrb0EO1ISPwvszn45I` | Tark 'Krap'                | `tark-krap`                |
| Pau Aragones Illanas / Pau   | aragonesillanas@hotmail.com | `3wfRiWzazLLNEwQLal72yXFqx8Z0IVFP` | Laughlin Lodovka           | `laughlin-lodovka`         |
| Xavi Gracia / Xavi           | fiber.cat@gmail.com         | `YkLuHmRmCBeDBCh1y7DCl24omb9EBzQF` | Dain Golka                 | `dain-golka`               |
| Luzbel / Carlos              | mirage1cs@gmail.com         | `NdWBPYpxAZkS5uwmFxpKwLk5Kfmr5M4Z` | Gael Mouro                 | `gael-mouro`               |
| Ernesto / Eslizo             | — (sin cuenta)              | —                                  | Nali de la Hierbarroja     | `nali-de-la-hierbarroja`   |
| Ludo Bermejo                 | ludobermejo@gmail.com       | `LbonxEfHrHSYKOmS6Mb7kaauceHcvi7q` | DM (narrador)              | — omitir —                 |

Ejemplo para Kingmaker donde asisten los jugadores de Sim Sim, Laughlin y Durgan:

```bash
$ALEPH session attendance mark <slug> \
  --campaign <id> \
  --characters sim-sim,laughlin,durgan
```

## Paso 3 — Analizar el contenido

Leyendo las notas (preferentemente las manuales), extrae:

### Personajes (PJs y NPCs)

Por cada personaje mencionado, determina:

- ¿Es un PJ (jugador) o NPC?
- ¿Ya existe en Aleph? → `$ALEPH character list --campaign <id> --json`
- ¿Es nuevo? → créalo
- ¿Ganó información nueva (estado, ubicación, relaciones)? → actualízalo

### Entidades del wiki (localizaciones, facciones, objetos, lore)

Por cada elemento del worldbuilding mencionado:

- ¿Ya existe como entidad? → `$ALEPH entity list --campaign <id> --json`
- ¿Es nuevo? → créalo con el tipo correcto
- ¿Tiene información relevante? → edítalo con `entity edit`

### Organizaciones / Facciones

Por cada facción, clan, gremio o grupo mencionado:

- ¿Existe? → `$ALEPH organization list --campaign <id> --json`
- ¿Es nueva? → créala
- ¿Hay miembros nuevos? → `organization member-add`

### Localizaciones

Por cada lugar visitado o mencionado con relevancia narrativa:

- ¿Existe? → `$ALEPH location list --campaign <id> --json`
- ¿Es nueva? → créala con el subtipo correcto (`city`, `town`, `wilderness`, `dungeon`, `building`, etc.)

## Paso 4 — Crear/actualizar entidades

Ejecuta los comandos necesarios para cada elemento identificado en el paso 3. Usa el juicio para decidir qué merece registro en Aleph (no crees entidades para menciones triviales).

**Personaje nuevo:**

```bash
$ALEPH character create \
  --campaign <id> --name "<nombre>" --json
```

**Actualizar un personaje — campos disponibles:**

```bash
# Descripción física (campo "content" / pestaña Información general)
$ALEPH character update <slug> \
  --campaign <id> --content "<descripción física>"

# Trasfondo / origen del personaje (pestaña Historia)
$ALEPH character update <slug> \
  --campaign <id> --backstory "<trasfondo y origen del personaje>"

# Historial de sesiones (pestaña Historia — ACUMULATIVO, ver Paso 4a)
$ALEPH character update <slug> \
  --campaign <id> --history-stdin < <repo-aleph>/sesiones/<campaña>/histories/<slug>.md

# Estado actual tras la última sesión (pestaña Información general — se reescribe cada sesión, ver Paso 4a)
$ALEPH character update <slug> \
  --campaign <id> --current-status "<situación actual del personaje>"
```

| Flag CLI           | Campo en la UI        | Pestaña             |
| ------------------ | --------------------- | ------------------- |
| `--content`        | Descripción física    | Información general |
| `--current-status` | Estado actual         | Información general |
| `--backstory`      | Trasfondo             | Historia            |
| `--history`        | Historial de sesiones | Historia            |

## Paso 4a — Estado actual de los personajes

Tras cada sesión, actualiza el estado actual de **todos los PJs que asistieron**:

```bash
$ALEPH character update <slug> \
  --campaign <id> \
  --current-status "<situación del personaje al final de la sesión: dónde está, cómo está físicamente, qué sabe o sospecha que los demás no saben, qué lleva encima de relevancia>"
```

- Escribe en presente narrativo, no en bullets.
- Incluye heridas, secretos no revelados, objetos adquiridos, y tensiones abiertas.
- Este campo se **reescribe** en cada sesión — no es acumulativo.
- Hazlo para todos los PJs asistentes, no solo los que tuvieron protagonismo.

## Paso 4b — Historiales de personajes (acumulativos, viven en el repo)

> **CRÍTICO**: El campo `--history` es **acumulativo entre sesiones**. NUNCA lo escribas con sólo la sesión que acabas de importar — borrarías todo el historial previo. La fuente de verdad de cada historial vive en el repo, en:
>
> ```text
> <repo-aleph>/sesiones/<campaña>/histories/<slug-del-personaje>.md
> ```
>
> Cada fichero contiene `# <Nombre> — Historial de sesiones` como H1 y una sección `## Sesión del DD de mes de YYYY — <título>` por cada sesión jugada, en orden cronológico de juego.

**Flujo obligatorio para actualizar el historial de un personaje:**

1. **Leer** `<repo-aleph>/sesiones/<campaña>/histories/<slug>.md`. Si no existe, créalo con el H1 (`# <Nombre> — Historial de sesiones`) — significa que es la primera sesión del personaje.
2. **Añadir** al final del fichero una nueva sección `## Sesión del DD de mes de YYYY — <título>` con la narrativa de esta sesión desde la perspectiva del personaje (uno o dos párrafos, prosa narrativa, nombres de personajes — no de jugadores).
3. **No reescribir** secciones de sesiones anteriores salvo error factual evidente.
4. **Subir** el fichero a Aleph saltando el H1 (la UI ya muestra el nombre del personaje):

   ```bash
   tail -n +3 <repo-aleph>/sesiones/<campaña>/histories/<slug>.md | \
     $ALEPH character update <slug> \
       --campaign <id> --history-stdin
   ```

   (En PowerShell: `Get-Content path | Select-Object -Skip 2 | node ... --history-stdin`.)

> **En Windows, NO uses esa tubería.** Git Bash mutila UTF-8 al pasar a node: una `í`
> (`0xC3 0xAD`) llega como `0xAD` sola, y el historial se sube con los acentos roto —
> `## Sesión del 16 de agosto de 2026 — El maniquí en el armario` acabó como `El maniqu␡ en el
armario`. Ocurre igual pasando el texto como argumento (`--current-status "…"`).
>
> Y la trampa peor: **leer** con `$ALEPH character show … --json | python` corrompe exactamente
> igual, así que esa verificación no distingue un dato roto de una lectura rota, y puede hacerte
> "arreglar" algo que ya estaba bien. En 2026-08-21 midió corrupción antes y después de una subida
> limpia.
>
> Vía correcta en Windows: un script `.mjs` que lea el fichero como `utf8` y lance el CLI con
> `spawn(process.execPath, [CLI, ...args], { shell: false })`, escribiendo el cuerpo en `stdin`
> como `Buffer`, y que **verifique dentro del mismo Node**:
>
> ```js
> const body = readFileSync(`${HIST}/${slug}.md`, 'utf8').split('
> ').slice(2).join('
> ');
> const p = spawn(process.execPath, [CLI,'character','update',slug,'--campaign',CID,'--history-stdin'], { shell:false });
> p.stdin.end(Buffer.from(body, 'utf8'));
> ```

**Por qué este flujo**:

- El campo `--history` en Aleph se sobrescribe en cada `character update`. Sin la fuente local, una importación destruye sesiones anteriores.
- Tener los historiales en el repo permite revisarlos, versionarlos con git y reconstruir Aleph si el servidor pierde datos.
- El H1 está sólo en el fichero local para que sea autocontenido al leerlo; Aleph no lo necesita porque ya muestra el nombre como título de la página.

**Convenciones**:

- Slug del fichero = slug del personaje en Aleph (e.g. `tark-krap.md`, `durgan-mediabarba-garess.md`).
- Una sección H2 por sesión, encabezado: `## Sesión del DD de mes de YYYY — <título corto narrativo>`.
- Prosa narrativa, no bullets, no metadatos.
- Si una sesión no involucra al personaje, no añadas sección para ella en ese personaje.

**Entidad del wiki (NPC, objeto, lore, evento):**

```bash
$ALEPH entity create \
  --campaign <id> --name "<nombre>" --type <npc|item|lore|event|location|faction> \
  --content "<descripción>"
```

**Localización:**

```bash
$ALEPH location create \
  --campaign <id> --name "<nombre>" --subtype <subtipo> \
  --content "<descripción>"
```

**Organización / Facción:**

```bash
$ALEPH organization create \
  --campaign <id> --name "<nombre>" --type <faction|guild|government|other> \
  --description "<descripción>"
```

**Añadir personaje a una organización:**

```bash
$ALEPH organization member-add <org-slug> \
  --campaign <id> --character <characterId>
```

**Relación entre entidades:**

```bash
$ALEPH relation create \
  --campaign <id> --source <slug-A> --target <slug-B> \
  --forward "<etiqueta directa>" --reverse "<etiqueta inversa>"
```

**Quest nueva (si la sesión abre o cierra un objetivo):**

```bash
$ALEPH quest create \
  --campaign <id> --name "<nombre>" --status active \
  --description "<descripción>"
```

## Paso 4c — Relaciones entre personajes

Tras crear/actualizar las entidades, revisa las notas buscando vínculos nuevos o confirmados entre personajes: amistades, alianzas, familia, rivalidades, amenazas, secretos compartidos, etc.

**Flujo obligatorio:**

1. **Consulta las relaciones existentes** para los PJs y NPCs relevantes:

   ```bash
   $ALEPH relation list \
     --campaign <id> --json | python3 -c "
   import json, sys
   data = json.load(sys.stdin)
   items = data if isinstance(data, list) else data.get('relations', data.get('data', []))
   slugs = {'<slug1>','<slug2>','<slug-npc>'}  # pon aquí los slugs relevantes
   for r in items:
       s, t = r.get('sourceSlug',''), r.get('targetSlug','')
       if s in slugs or t in slugs:
           print(s, '--[', r.get('forward','?'), ']-->', t)
   "
   ```

2. **Identifica qué relaciones son nuevas** (no aparecen en la lista) o se han reforzado significativamente esta sesión.

3. **Crea solo las relaciones nuevas** — no dupliques las que ya existen:

   ```bash
   $ALEPH relation create \
     --campaign <id> \
     --source <slug-A> \
     --target <slug-B> \
     --forward "<etiqueta de A hacia B>" \
     --reverse "<etiqueta de B hacia A>"
   ```

**Qué merece una relación nueva:**

| Situación                            | Ejemplo de etiquetas                         |
| ------------------------------------ | -------------------------------------------- |
| NPC amenaza a un PJ                  | "amenaza con matar a" / "es objetivo de"     |
| PJ curó o protegió a otro en combate | "protege a" / "confía en"                    |
| PJ y NPC se conocen del pasado       | "tiene historia con" / "conoce de antes a"   |
| NPC está vinculado a una facción     | "miembro de" / "tiene como miembro a"        |
| PJ desconfía o sospecha de alguien   | "desconfía de" / "es vigilado por"           |
| NPC nuevo aparece en escena          | crear relación con los PJs que interactuaron |

Ejemplos de etiquetas útiles: `"amigo de"`, `"aliado de"`, `"rival de"`, `"mentor de"`, `"protege a"`, `"desconfía de"`, `"amenaza con matar a"`, `"tiene historia con"`, `"miembro del clan"`.

> **Importante**: las relaciones son bidireccionales. `--forward` es cómo A describe a B; `--reverse` es cómo B describe a A. Siempre consulta las existentes antes de crear — duplicar relaciones ensucia el grafo.

## Paso 4d — Relaciones de la sesión con sus entidades (OBLIGATORIO)

> **Siempre, en cada importación.** Además de las relaciones entre personajes (Paso 4c), la **propia sesión** debe quedar conectada en el grafo con **todas las entidades existentes que aparecen en ella** (personajes, NPCs, organizaciones y localizaciones con peso narrativo). Una sesión es una entidad más; si no se enlaza, queda huérfana en el grafo. Este paso **no es opcional** y aplica cada vez que se genera o importa una sesión.

La sesión actúa como `--source` (su slug es el de la sesión creada/encontrada en el Paso 2) y cada entidad que aparece como `--target`. **Solo entidades que ya existen en Aleph** — no crees relaciones hacia algo que no hayas creado en el Paso 4.

**Convención de etiquetas** (coincide con las sesiones ya existentes en la campaña):

| Target                 | `--forward` (sesión → entidad) | `--reverse` (entidad → sesión) |
| ---------------------- | ------------------------------ | ------------------------------ |
| Personaje / NPC        | `contó con`                    | `participó en`                 |
| Organización / facción | `involucró a`                  | `participó en`                 |
| Localización           | `transcurrió en`               | `fue escenario de`             |

**Flujo obligatorio:**

1. Reúne la lista de entidades **existentes** que aparecen en la sesión (las creadas/actualizadas en el Paso 4 más las que ya existían y se mencionan de forma relevante).
2. Consulta las relaciones actuales de la sesión para no duplicar:

   ```bash
   $ALEPH relation list --campaign <id> --json | node -e "
   const d=JSON.parse(require('fs').readFileSync(0,'utf8'));
   const items=Array.isArray(d)?d:(d.relations||d.data||[]);
   const S='<session-slug>';
   items.filter(r=>(r.sourceSlug||r.source)===S||(r.targetSlug||r.target)===S)
        .forEach(r=>console.log((r.sourceSlug||r.source),'->',(r.targetSlug||r.target)));
   "
   ```

3. Crea una relación de la sesión hacia cada entidad que **aún no esté enlazada**:

   ```bash
   $ALEPH relation create \
     --campaign <id> \
     --source <session-slug> \
     --target <entity-slug> \
     --forward "contó con" --reverse "participó en"
   # organización: --forward "involucró a" --reverse "participó en"
   # localización:  --forward "transcurrió en" --reverse "fue escenario de"
   ```

> **Regla de cierre**: una sesión sin relaciones con sus entidades está incompleta. Antes de dar por terminada la importación (Paso 6), verifica con `relation list` que la sesión tiene al menos una relación por cada personaje asistente y cada organización/localización relevante.

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
- Relaciones de la sesión: <n> (sesión → entidades: personajes, orgs, localizaciones)
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
$ALEPH character update sim-sim \
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
