# Tasks — fix-campaign-search

## 0. La decisión que no es tuya

- [x] 0.1 **Preguntar al propietario cuál de las tres salidas de `design.md` D2 quiere.**
      Respondida: **opción 2, dos índices por rol.** Uno completo, que solo consulta
      `co_dm` o superior; otro filtrado, construido sobre el texto ya pasado por
      `stripSecretBlocks`, para todos los demás. El DJ conserva la búsqueda de sus propios
      secretos y se cierran las DOS fugas, la del texto y la de existencia.
- [x] 0.2 Reproducir la fuga. **Reproducida literalmente**, primero en un script y luego como
      prueba roja: consultando una palabra que solo vive dentro del bloque, el snippet
      devuelto era
      `...relleno59 El ritual exige que tres inocentes se <mark>sacrificarán</mark> antes del alba...`
- [x] 0.3 Mirar `entity_trigrams` (D3). **No estaba infrautilizada, estaba deliberadamente
      acotada**: solo indexa `name` + `aliases` (`search.ts`, comentario propio: "not the
      long-form body text") y solo se dispara por debajo de `FUZZY_FALLBACK_THRESHOLD = 3`.
      Extenderla al cuerpo era la media solución aparente y se descartó con medida: un
      solapamiento de 2 trigramas sobre texto largo convierte el buscador en subcadena
      (`sangre` traería `sanidad`, `sangría`, `sangrar`… y también `casa`→`castillo`). La
      morfología se resolvió donde corresponde, en el análisis, no en la coincidencia difusa.
      Los trigramas quedan **intactos**, y por eso siguen siendo UNA sola tabla que sirve a
      los dos índices: `name`/`aliases` son idénticos en ambos.

## 1. La fuga

- [x] 1.1 Brazo léxico: `FTS_TABLES = { full: 'entities_fts', filtered: 'entities_fts_filtered' }`.
      `searchEntities(..., role)` elige tabla con `indexVariantForRole`, que pregunta a
      `seesSecretContent` — la MISMA función que ahora usa `stripSecretBlocks`, no una copia
      del umbral.
- [x] 1.2 Brazo semántico: `VEC_TABLES = { full: 'entity_vectors', filtered: 'entity_vectors_filtered' }`,
      mismo reparto y mismo umbral. `indexEntityEmbedding` embebe el texto filtrado y
      **reutiliza el vector cuando no hay nada que quitar**, así que la ficha sin secretos
      cuesta exactamente lo que costaba.
- [x] 1.3 El DJ y el co-DJ conservan la búsqueda completa. Nadie pierde nada respecto a hoy.

### La divergencia, que es el precio de la opción 2

- [x] 1.4 **Una sola pasada.** `indexEntity` deriva cada campo una vez, de una entidad, y
      escribe las dos filas bajo el MISMO rowid de `entities_fts_map` dentro de una
      transacción. No existe un punto de entrada por variante: no hay forma de escribir un
      índice sin el otro. Igual en `indexEntityEmbedding` y en los dos borrados.
- [x] 1.5 **Una sola DDL.** Las dos tablas se crean del mismo `FTS_COLUMNS` en un bucle; no
      pueden diferir de forma.
- [x] 1.6 **Un guard que falla.** `findIndexParityGaps` / `assertIndexParity` (léxico) y
      `findVectorParityGaps` (semántico) fallan si una tabla tiene una entidad que la otra no.
      `tests/unit/server/search-index-parity.test.ts` los ejerce sobre alta/reindexado/borrado
      y **rompe la invariante a mano** para exigir que el guard la vea.
      `server/plugins/watcher.ts` los ejecuta al arrancar y registra `logger.error`.
- [x] 1.7 Mutación comprobada: con `indexEntity` escribiendo solo el índice completo (una
      línea, `if (variant === 'filtered') continue`), **6 pruebas se ponen rojas** en dos
      ficheros. Restaurado, 14/14 verdes.

## 2. La morfología

- [x] 2.1 `server/services/spanish-stem.ts` — el algoritmo Snowball español en TypeScript,
      sin dependencia nueva. FTS5 no trae stemmer español y un tokenizador propio es un
      callback en C que `better-sqlite3` no puede registrar (la misma restricción que ya
      produjo la tabla de trigramas en vez de `spellfix1`), así que la raíz se calcula en JS a
      los dos lados: una columna `stems` en el índice y una cláusula `OR` en la consulta.
- [x] 2.2 **`bm25(entities_fts, 10.0, 8.0, 2.0, 1.0)` sin tocar, literalmente.** Se le siguen
      pasando CUATRO pesos contra cinco columnas porque SQLite asigna 1.0 a los que faltan.
      Medido: la llamada de cuatro pesos y la misma con un 1.0 explícito devuelven la misma
      puntuación bit a bit, mientras que 0.0 y 7.0 devuelven otras.
- [x] 2.3 Plurales y diacríticos: 11 casos de no-regresión, verdes antes y después.
      `Ines`→`Inés` sigue funcionando por dos caminos independientes (el plegado de
      `unicode61` y el postludio del propio Snowball, que quita los acentos agudos al final).

## 3. Pruebas

- [x] 3.1 **Roja hoy.** `tests/unit/server/search-secrets.test.ts` — 3 de 5 casos fallaban
      antes del arreglo, y el fallo imprimía el texto secreto en el snippet.
- [x] 3.2 `tests/unit/server/search-morphology.test.ts` — el banco entero, un caso por par.
      **9 rojos antes, 28 verdes después.**
- [x] 3.3 No-regresión de plurales, diacríticos, prefijo y frase exacta, en el mismo fichero.
- [x] 3.4 **Las tres suites, ejecutadas de verdad.** Cifras abajo, en «Las tres suites». La
      nota original de esta tarea —que integración y e2e no se podían ejecutar aquí— **ya no
      vale**: se ejecutan contra un `nuxt build` + `node .output/server/index.mjs`, que no
      sufre la doble evaluación de módulos del SSR de Vite en dev. Se conserva el texto
      original debajo porque el diagnóstico que hacía sigue siendo cierto para `nuxt dev`.
      Texto original: **`tests/integration/` y `tests/e2e/` NO se
      han podido ejecutar en esta máquina, y no por este cambio.** `nuxt dev` no arranca aquí:
      el worker de Nitro muere al cargar `onnxruntime-node`
      (`Module did not self-register: node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node`),
      así que todo responde HTTP 500 y las dos suites necesitan el servidor en el 3333.
      **Comprobado que es del entorno, no del cambio, por tres vías**: (1) pasa con una base
      de datos RECIÉN creada, sin nada que migrar; (2) pasa con el backfill vectorial
      desactivado; y (3) —la decisiva— pasa **igual con mi trabajo en `git stash`**, sobre el
      árbol limpio de `master`, con el mismo mensaje. Encaja con lo ya anotado del entorno:
      este `node_modules` está compilado desde Windows y el binario nativo no se registra en
      un worker thread de WSL2. La suite de integración de este cambio
      (`search-secret-leak.test.ts`) queda escrita y lista; **hay que ejecutarla en una
      máquina donde `nuxt dev` arranque, antes de desplegar.**
- [x] 3.5 `tests/integration/search-secret-leak.test.ts` — la misma fuga contra un jugador y
      un editor REALES (cuentas que se unieron a la campaña), no `preview_as`.

## 4. Cerrar

- [x] 4.1 `aleph search` gana `--preview-as <role>`; `docs/claude-skill.md` (1.9 → 1.10) y
      `.claude/skills/aleph-cli/SKILL.md` (3.19 → 3.20) actualizados **a la vez**.
- [x] 4.2 **No empujado.** Rama `master`, sin push.
- [x] 4.3 Qué comprobar en producción, en orden — ver "Verificación en producción" abajo.
- [x] 4.4 Premisas contradichas por la medición — ver abajo.

## Segunda pasada: la integración SÍ se ejecutó, y encontró una fuga de verdad

`tests/integration/search-secret-leak.test.ts` falló 3 de 7 la primera vez que llegó a
correr, en los tres casos que importan (jugador, editor, DJ previsualizando). El extracto
salía limpio —solo el nombre— pero **el resultado existía**, que es exactamente la fuga de
existencia que este cambio dice cerrar.

**No lo era.** Medido, no razonado:

- La pista era la puntuación, `0.0163…` = `1/(60+1)`: un solo brazo, primer puesto. Y el
  extracto era **idéntico al nombre**, que es la firma de `searchEntitiesFuzzy`, no de un
  `snippet()` sobre `body`.
- La prueba construía la aguja como `sacrificaran${ts}` y la ficha como
  `Casa de los Aguirre ${ts}`, con **el mismo timestamp de 13 cifras en las dos**. Overlap
  medido: **11 trigramas compartidos**, contra un `FUZZY_MIN_OVERLAP` de 2. El brazo difuso
  —que indexa `name`/`aliases` y **nunca** el cuerpo, y es por tanto incapaz de filtrar un
  secreto— coincidía por el NOMBRE.
- Contraste decisivo contra `HEAD`, misma prueba: antes del cambio el jugador recibía un
  extracto que **citaba el texto secreto** (`...El ritual exige q…`); después, el índice
  primario no devuelve nada y lo único que queda es la coincidencia por nombre. Y con un
  nombre sin las cifras compartidas, el jugador recibe `[]` en las dos mitades del cambio.
- El mismo defecto de la prueba hacía pasar `the player still finds the sheet by its public
text` **por el motivo equivocado**: ese acierto era también el nombre.

Arreglado en la prueba, no en el código: la aguja lleva ahora el mismo timestamp **escrito en
letras** (overlap 0, verificado), y cada aserción de "cero resultados" va emparejada con un
control positivo sobre la MISMA clave, porque `toEqual([])` pasa igual de contento si la
ficha nunca se indexó. Y el hallazgo queda fijado donde cuesta milisegundos comprobarlo:
`tests/unit/server/search-secrets.test.ts` tiene una prueba que exige que una consulta
parecida al NOMBRE siga acertando y que su extracto sea el nombre, sin nada del cuerpo.

### Pero el brazo semántico SÍ tenía una fuga, y la tenía la propia migración

`backfillFilteredVectors` fallaba **ABIERTO**. Cuando no podía leer el texto de origen, caía
en la misma rama que "no había nada que quitar" y **copiaba el vector SIN FILTRAR** a la tabla
filtrada: una incrustación del texto secreto, entregada al brazo semántico de cualquier
jugador, por la migración que existe para quitársela.

No es una rama hipotética. `entities.file_path` guarda una ruta ABSOLUTA de la máquina que
escribió la fila (`/var/www/aleph/content/...`), así que sobre una copia de la base real
**4.507 de 4.601 entidades no resuelven a ningún fichero local** y todas ellas la tomaban.

Arreglado en tres partes:

1. **La fuente pasa a ser el índice léxico, no el disco.** Cada punto de llamada empareja
   `indexEntity(..., name, …, body)` con `indexEntityEmbedding(..., name, body)` sobre los
   mismos dos valores, así que `entities_fts` ES el texto que produjo el vector y
   `entities_fts_filtered.body` ya es su `stripSecretBlocks`, calculado por la migración
   léxica que termina ANTES. Es además lo que el propio delta pedía con todas las letras: la
   reconstrucción «SHALL NOT be reconstructed from the filesystem when the stored index
   already holds the same text».
2. **Falla CERRADO.** Sin texto de origen, la entidad se queda FUERA de la tabla filtrada y se
   cuenta (`skipped`), nunca se le da el vector completo como sucedáneo. Cuesta alcance
   semántico en esa ficha; la alternativa cuesta el secreto. Al quedar pendiente,
   `countMissingFilteredVectors` sigue por encima de cero y el arranque siguiente lo reintenta.
3. **Tres pruebas donde no había ninguna** (`tests/unit/server/embeddings.test.ts`).
   Mutación comprobada: restaurada la rama original, la prueba se pone roja **y lo hace por la
   propiedad correcta** — `AssertionError: expected [ 'e1' ] to not include 'e1'`, es decir, la
   búsqueda semántica de un JUGADOR devolviendo la ficha cuya única relevancia es su secreto.

Medido sobre la base real, ejecutando la migración de verdad:

```
needsFilteredBackfill: true   missing: 4512
BACKFILL RESULT {"copied":4441,"reEmbedded":71,"skipped":0,"failed":0} in 35.7 s
missing after: 0     vector parity gaps: []     lexical parity gaps: []
```

**71 reembebidas** — exactamente las 71 entidades de la base que llevan un bloque
`:::secret`, contadas aparte. Con el código anterior las 71 se habrían COPIADO. `skipped: 0`:
el índice léxico respondió por todas, el disco no hizo falta ni una vez.

### Prueba de contenido del índice filtrado, sobre las 4.605 filas reales

No por muestreo de palabras —que da falsos positivos, ver abajo— sino comparando el contenido
almacenado con lo que debería ser:

| Comprobación                                            | Resultado      |
| ------------------------------------------------------- | -------------- |
| `filtered.body != stripSecretBlocks(full.body)`         | **0** de 4.605 |
| `filtered.stems != stemSpanishText(columnas filtradas)` | **0** de 4.605 |
| valla `:::secret` que sobreviva en el cuerpo filtrado   | **0** de 71    |
| prosa del bloque que sobreviva en el cuerpo filtrado    | **0** de 71    |

Un sondeo por palabras da 91 «alcanzables por un jugador» de 2.336, y **las 91 son falsos
positivos del sondeo**: el criterio ingenuo («la palabra literal no está en el texto público»)
ignora que el índice acierta por prefijo y por raíz. Comprobado una a una reconstruyendo un
índice de UNA fila **solo con el texto público** y repitiendo la consulta: `vampírica`,
`glasklare`, `mortales`, `contrató`, `camarilla`, `vampírico`, `presentaciones` — las siete
siguen acertando sobre texto público solo. Es la morfología funcionando, no una fuga.

### Morfología y no-regresión, contra el corpus real (3.098 entidades)

| Consulta                      | DJ      | Jugador |
| ----------------------------- | ------- | ------- |
| `asesinar` / `asesinó`        | 11 / 11 | 11 / 11 |
| `correr` / `corriendo`        | 10 / 10 | 10 / 10 |
| `asesina` / `asesino`         | 11 / 11 | 11 / 11 |
| `desaparecer` / `desapareció` | 20 / 20 | 20 / 20 |
| `investigar` / `investigó`    | 20 / 20 | 20 / 20 |
| `muerto` / `muertos`          | 20 / 20 | 20 / 20 |
| `anciana` / `ancianas`        | 20 / 20 | 20 / 20 |
| `Ines` / `Inés`               | 20 / 20 | 20 / 20 |

Las multipalabra (`casa abandonada`, `ritual de sangre`, `el asesino del puerto`) devuelven
11/16/15 y no cero, que es la regresión del `AND` explícito vigilada.

**Un falso hallazgo que conviene dejar escrito**: `Nicolás` devuelve 0 donde `Nicolas`
devuelve 1, y NO es una regresión de diacríticos. Medido: la consulta primaria devuelve **0
para las dos grafías** (`"Nicolas"*` cruda = 0 filas), el nombre no está en el corpus; el
único acierto viene del brazo de trigramas, que —a diferencia de `unicode61`— **no pliega
acentos**, porque `toTrigrams` solo hace `toLowerCase()`. Preexistente, sin tocar en este
cambio, y anotado como observación, no como defecto de aquí.

### El entorno, con precisión

`nuxt dev` arranca y la migración léxica corre bien contra la base real
(`Migrated the lexical index to the role-scoped schema {"migrated":4605}`, y en el segundo
arranque **ninguna línea de migración**, que es la idempotencia que pide el delta). Pero toda
petición devuelve HTTP 500 con
`Module did not self-register: onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node`.
**No es de este cambio y no es «WSL2 no puede»**: medido, `onnxruntime-node` carga sin
problema en Node a pelo, en hilo principal, en worker, y en worker después del principal. Es
una doble evaluación del módulo por parte del SSR de Vite en modo dev: el plugin lo carga
bien (`Vector search index initialized`) y la petición lo vuelve a cargar en otro registro,
que es cuando `dlopen` falla. Ocurre igual con el backfill ya completo, es decir, sin que
nada llame a `embedText`.

## Las tres suites, con cifras reales

Ejecutadas el 2026-08-24 sobre la copia limpia de la base de producción. **Las de integración
y e2e necesitan un servidor CONSTRUIDO** (`npx nuxt build` y `node .output/server/index.mjs`
en el 3333), no `nuxt dev`: en dev toda petición devuelve 500 por la doble carga de
`onnxruntime-node`, que no es de este cambio (ver «El entorno, con precisión» arriba). Un
detalle del empaquetado que hay que arreglar a mano: el build deja
`.output/server/node_modules/sqlite-vec-linux-x64/` **sin el binario `vec0.so`** y
`sqlite-vec` lo busca además como `vec0.so.so`; sin copiarlo, `initVecTable` revienta el
plugin entero y el arranque se queda a medias.

| Suite                                                            | Resultado                                                | Nota                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/`                                                    | **138 de 140 ficheros, 1.706 de 1.708 pruebas**          | Los 2 fallos son `collaboration-service` y `markdown-editor`, ambos «Tiptap» y ambos por **timeout bajo carga**: en aislado los dos ficheros dan **22/22 en 12,6 s** frente a los 23-24 s por prueba que tardan dentro de la suite completa. Nada que ver con la búsqueda.                                                             |
| `tests/integration/`                                             | **98 de 105 ficheros, 885 de 947 pruebas** (30 saltadas) | **`search-secret-leak.test.ts`: 7/7.** Los 7 ficheros rojos son de CLI/websocket y ninguno toca la búsqueda.                                                                                                                                                                                                                           |
| `tests/e2e/` (los 9 ficheros que mencionan búsqueda, 41 pruebas) | **38 de 41**                                             | Los 3 fallos son aserciones de MAYÚSCULAS (`toContainText('npc')` contra una interfaz que pinta `NPC`, ídem `'planned'`/`Planned`) más un borrado en el panel de relaciones. Este cambio **no toca un solo fichero de interfaz** (`git diff --stat`: solo `server/`, `cli/`, `openspec/` y `tests/`), así que no pueden venir de aquí. |

Sobre los fallos de CLI en integración: **no son flakes de carga**, fallan igual en aislado, y
la causa está medida — `node cli/bin/aleph.js --version` tarda **4,65 s** en este sistema de
ficheros (`/mnt/c`, 9p), contra un presupuesto de 5.000 ms por prueba, y cada una lanza el CLI
una o dos veces. Es velocidad del entorno, no lógica.

Y para poder ejecutar e2e hubo que instalar el navegador: el `@playwright/test` del repo
(1.60.0) pide `chromium_headless_shell-1223` y la caché de la máquina solo tenía la `-1228`,
así que las 41 fallaban con `Executable doesn't exist` antes de arrancar ninguna.

### Los tres pasos de la verificación en producción que SÍ se pudieron hacer aquí

Contra la copia real, no contra una base de prueba:

1. `Migrated the lexical index to the role-scoped schema {"migrated":4605}` — N igual a las
   filas del índice anterior. En el **segundo** arranque, **ninguna línea de migración**
   (`FTS5 search index initialized` a secas), que es la idempotencia que pide el delta.
2. **`Search index parity broken` NO aparece**, ni la versión vectorial, ni ningún
   `unhandledRejection`. `findIndexParityGaps` y `findVectorParityGaps` devuelven `[]`
   consultados directamente contra la base migrada.
3. El sitio responde desde el primer momento: `/api/campaigns` → **401** en cuanto el proceso
   levanta, no 500.

Los pasos 3-5 (jugador/DJ contra una palabra secreta real) se han hecho con más fuerza que lo
que pedía la lista: no con una palabra elegida a mano, sino comparando el contenido
almacenado de las **4.605** filas del índice filtrado contra `stripSecretBlocks` — cero
discrepancias — y sondeando **2.336** palabras que solo viven dentro de un bloque secreto.

## Verificación en producción (D5: el cambio no está hecho hasta esto)

El índice se migra al arrancar, en `server/plugins/watcher.ts`. **Medido contra una COPIA de la
base de datos real de este proyecto (1.495 entidades, 1.383 indexadas, 379 MB):**

| Paso                                                                        | Coste medido | ¿Bloquea el arranque? |
| --------------------------------------------------------------------------- | ------------ | --------------------- |
| `initFTS5` migra las 1.383 filas a las dos copias, con la columna `stems`   | **146 ms**   | Sí, a propósito       |
| `backfillFilteredVectors` (594 vectores copiados, 18 reembebidos, 0 fallos) | **69 s**     | **No**, va suelto     |

Re-medido después contra la copia LIMPIA de producción (4.601 entidades, 4.605 filas de
índice, 4.514 vectores): la migración léxica de las **4.605** filas ocurre en el arranque sin
que el sitio deje de responder, y el backfill vectorial —ya con la fuente corregida al índice
léxico— es **`{"copied":4441,"reEmbedded":71,"skipped":0,"failed":0}` en 35,7 s**. Las 71
reembebidas son exactamente las 71 entidades con bloque secreto.
| Segundo arranque (ya migrado) | **0 ms** | — |

Los dos números anteriores son de arranques REALES contra esta base de datos, no estimaciones.

**El reparto entre síncrono y suelto es la parte que importa.** La migración léxica es la
mitad crítica para la seguridad y es barata, así que va antes de que Nitro acepte la primera
petición: ninguna consulta llega nunca a un índice a medio migrar. El backfill vectorial es
una migración de datos de una sola vez, cuesta 69 s medidos, y **todo `await` en un plugin de
Nitro corre antes de que el servidor sirva**: la primera versión lo esperaba y el resultado
fue el sitio devolviendo HTTP 500 durante más de un minuto en cada arranque, observado tres
veces seguidas antes de entender por qué. Soltarlo es seguro en la dirección que importa:
mientras corre, la tabla filtrada está a medias, así que el brazo semántico de un jugador
devuelve MENOS resultados, nunca más.

Y el número que justifica todo el diseño de la migración: la versión obvia —tirar los índices
y dejar que el backfill los reconstruya leyendo ficheros y reembebiendo— son **~7 minutos**
(1.495 entidades × 284 ms por embedding, medido). En su lugar, el índice léxico se reconstruye
**de su propio texto ya almacenado**, sin tocar el disco, y del lado vectorial solo se
reembeben las entidades cuyo cuerpo cambia al filtrar: **41 de 1.383** llevan un bloque
secreto. Para las demás el vector filtrado es BIT A BIT el que ya había, así que se copia el
blob; no es una aproximación.

Qué comprobar, en orden:

1. En el log de arranque: `Migrated the lexical index to the role-scoped schema {"migrated":N}`
   con N == filas del índice anterior, y —hasta un par de minutos DESPUÉS, porque va suelto—
   `Filtered vector backfill complete` con `failed: 0` **y `skipped: 0`** — un `skipped` por
   encima de cero significa que esa entidad se ha quedado FUERA del índice filtrado a
   propósito (no se pudo recuperar su texto) y que el arranque siguiente lo reintentará. Ambos deben aparecer UNA sola vez; en
   el siguiente reinicio, ninguno. **El sitio debe responder desde el primer momento**: si
   devuelve 500 durante el arranque, algo se está esperando que no debería.
2. **`Search index parity broken` NO debe aparecer.** Si aparece, los dos índices no tienen
   las mismas entidades y el arreglo no está puesto del todo.
3. Con una cuenta de JUGADOR real, buscar una palabra que solo exista dentro de un
   `:::secret{.dm}` de la campaña en curso: **cero resultados**. No "resultado con el
   extracto limpio" — cero.
4. La misma palabra con la cuenta del DJ: **la ficha aparece**.
5. Una palabra pública de esa misma ficha, con la cuenta del jugador: **la ficha aparece**.
6. Un verbo del banco contra el corpus real: `desaparecer`, `asesinar`, `investigar`.
7. Un nombre con tilde escrito sin ella (`Ines`, `Nicolas`): sigue encontrando la ficha.

## Premisas de la propuesta que la medición contradice

1. **Dos de los cinco fallos de morfología no existen en producción.** La propuesta midió
   contra FTS5 con `MATCH 'término'` a secas. El código real pasa por `buildFtsQuery`, que
   añade `*` a cada término, y con esa consulta `desaparecer`/`desapareció` y
   `sangre`/`sangrienta` YA funcionaban: porter recorta `-er` y la `-e` final, y el prefijo
   alcanza el resto. Los fallos reales eran **tres**: `asesinar`/`asesinó`,
   `correr`/`corriendo`, `asesina`/`asesino`. Sigue siendo el mismo defecto — no hay
   morfología verbal española — pero el banco de la propuesta lo sobreestimaba.
2. **`entity_trigrams` no estaba infrautilizada** (D3 sugería que podía estarlo). Está
   acotada a propósito a `name`/`aliases` y solo actúa por debajo de 3 resultados. Extenderla
   al cuerpo habría cambiado la precisión, no la morfología.
3. **La opción 2 no obliga a mantener dos copias a mano**, que era el precio que D2 le
   ponía. Con un solo rowid, una sola derivación y una sola DDL, la divergencia no es algo
   que haya que recordar evitar: no hay camino de código que la produzca. El guard existe
   igual, para el día en que alguien añada ese camino.
4. **`editor` está por debajo del umbral, confirmado en el código**, no solo por convención:
   `ROLE_HIERARCHY` da `co_dm` 4 y `editor` 3, y `stripSecretBlocks` devuelve el contenido
   intacto solo a partir de 4. Un editor va al índice filtrado, igual que ya recibe prosa
   filtrada en todos los demás endpoints.
5. **La reindexación NO obliga a un re-embebido completo, pero mi primer diseño sí lo hacía.**
   La propuesta no menciona el coste del reíndice; medido, tirar los índices y reconstruirlos
   desde los ficheros son **~7 minutos con Nitro sin servir**. Corregido dentro de este mismo
   cambio: migración en sitio (146 ms) y copia de vector salvo para las 41 entidades que de
   verdad llevan un bloque secreto (10,8 s en total).
6. **Un `await` en un plugin de Nitro es tiempo de caída.** No lo dice la propuesta ni el
   diseño, y es la trampa más cara de este cambio: el backfill vectorial esperado dejaba el
   sitio en HTTP 500 durante 69 s en cada arranque. Se ve tres veces seguidas antes de que
   uno se dé cuenta de que no es un fallo de compilación.
7. **`repairIndexParity` existe porque la migración no era atómica y se notó a la mala.**
   Matar el servidor a media migración dejó **1.383 entidades mapeadas contra 113 filas
   indexadas**, y nada lo habría arreglado en reinicios sucesivos: el backfill de arranque
   salta todo lo que ya está en `entities_fts_map`. Ahora el DROP + CREATE + relleno van en
   UNA transacción (SQLite hace la DDL transaccional), así que una interrupción vuelve al
   índice viejo intacto; y para los estados que una transacción no cubre hay una reparación
   que reconstruye desde la copia que aún tenga el texto, y **declara** las entidades que no
   puede recuperar en vez de inventarlas.
8. **FTS5 rechaza la concatenación implícita después de un paréntesis.** `"a"* "b"*` vale;
   `("a"* OR "x") "b"*` es `fts5: syntax error near "b"`. Y `searchEntities` captura el error
   y devuelve lista vacía, así que la primera versión de la cláusula de raíces habría dejado
   **toda consulta de varias palabras con un término derivable devolviendo cero**, con pinta
   de "no hay resultados". Lo cazó una prueba ajena (`watcher.test.ts`). Arreglado con `AND`
   explícito, más una prueba de regresión y un `logger.warn` en ese `catch`, porque el
   silencio es lo que lo escondió.
