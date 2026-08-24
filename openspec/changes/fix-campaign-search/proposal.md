# El buscador de campaña: que entienda español y que no cuente secretos

## Why

Dos defectos independientes en `server/services/search.ts`, los dos medidos el 2026-08-24.

### 1. El índice está en español y el stemmer es inglés

`search.ts:33` declara `tokenize='porter unicode61'`. Porter es un stemmer **de inglés** y
la campaña está escrita en español. Probado directamente contra FTS5, y el resultado es
mitad bueno — que es peor que malo del todo, porque parece que funciona:

```
muerto      vs muertos       ok     (el sufijo -s/-es cae por casualidad)
ancianas    vs anciana       ok
Ines        vs Inés          ok     (unicode61 sí pliega diacríticos)

asesinar    vs asesinó       FALLA
desaparecer vs desapareció   FALLA
correr      vs corriendo     FALLA
asesina     vs asesino       FALLA  ← ni el género
sangre      vs sangrienta    FALLA
```

Los plurales y los acentos funcionan, así que el buscador da resultados y nadie sospecha.
Lo que no existe para este índice es **la morfología verbal española** — en una campaña
cuyo motor argumental son desapariciones, buscar «desaparecer» no encuentra «desapareció».

El ranking, en cambio, está bien pensado y **no se toca**: `bm25(entities_fts, 10.0, 8.0,
2.0, 1.0)` pesa nombre 10, alias 8, etiquetas 2, cuerpo 1.

### 2. El índice guarda los secretos del Narrador en crudo

`indexEntity` escribe markdown sin filtrar en `entities_fts.body`, con los bloques
`:::secret{.dm}` dentro, y `search.ts:313` devuelve `snippet(entities_fts, 3, …)` — la
columna 3 **es** `body`. El filtro de respuesta que se añadió en
`fix(seguridad): filtrar los bloques :::secret en TODA respuesta` tapa el caso fácil, porque
reconoce la valla `:::secret` cuando cae dentro de la ventana del snippet. No tapa este:

```
un jugador busca una palabra que SOLO existe dentro del bloque secreto
  → 1 resultado
  → snippet: "...el ritual <mark>…</mark> exige tres sacrificios..."
```

Fuga literal del texto, **y además fuga de existencia**: aunque el snippet saliera limpio, el
propio hecho de que haya un resultado dice que la palabra está en la ficha. El brazo
semántico tiene el mismo problema — `embeddings.ts:126` embebe `name\nbody` en crudo.

## What Changes

- **El índice deja de contener secretos que un jugador pueda alcanzar.** Cuál de las tres
  salidas se toma es una decisión de mesa, no técnica, y está en `design.md` D2 — tiene
  consecuencias para el DJ y hay que elegirla a la vista de ellas, no por comodidad de
  implementación.
- **La búsqueda entiende morfología española.** Sin tocar los pesos de BM25, que están bien.
- **Una prueba que falle hoy.** El caso de la palabra que solo vive en el bloque secreto es
  el que ninguna prueba actual cubre, y es el que permitió que esto llegara a producción.

## Capabilities

- `entity-search` — el índice deja de filtrar secretos y empieza a entender el idioma en el
  que está escrito.

## Non-goals

- **No tocar los pesos de BM25.** Están medidos y son razonables; mezclarlo con esto haría
  imposible saber qué mejoró qué.
- **No reescribir el buscador semántico.** Solo cerrar su misma fuga (`embeddings.ts:126`).
  Mejorarlo es otro trabajo.
- **No el hueco de edición para el rol `editor`**, que ya está registrado aparte: un editor
  recibe el contenido filtrado y no puede editar lo que no ve. Necesita un endpoint de
  edición en crudo con su propia puerta, y no es esto.
