# Chapters for «Berlín en tinieblas» — proposal

## 1. Recommendation

**No chapters at all.** Leave the 73 sessions filed directly under the 11 arcs.

**Single strongest reason:** nothing in the reader-facing UI groups sessions by chapter. The
session detail page (`app/pages/campaigns/[id]/sessions/[slug]/index.vue`, 444 lines) does not
contain the string `arc` even once — it displays neither the session's arc nor its chapter,
even though the API computes `chapterName` for it. The sessions list page does not either. The
arc detail page shows chapters and sessions as **two separate, unjoined flat lists**: sessions
render as `v-for="session in linkedSessions"` with no chapter grouping, and chapters render in
their own `<section>` below. So creating 16–30 chapters would add, per arc page, a short second
list of names sitting next to an ungrouped list of sessions — a table of contents that indexes
nothing, on a page that already carries the full arc description.

Everything below is the argument, honestly made in both directions, plus a complete contingency
scheme with commands in case the recommendation is overruled.

---

## 2. The case against

### 2.1 The arcs are already the right granularity

73 sessions / 11 arcs = **6.6 sessions per arc**. Sessions are uniform in size: the whole corpus
is 37,656 words over 73 files, i.e. **~515 words and ~26 lines per session**, structured as an
H1 plus 3–4 `##` prose sections. There is no scene list and no bullet log.

That means a chapter of 2–3 sessions holds roughly **1,000–1,500 words**. It is not a book
chapter; it is a scene block. The unit that actually corresponds to "a chapter of this story" is
already the arc, and each arc already has a written description and an explicit
`## Por qué la frontera cae aquí` section doing exactly the signposting a chapter name would do —
in prose, in one place, on the same page a chapter would appear on.

Arc 08's own file already says what its three would-be chapters would say, and says it better:

> El arco más heterogéneo, y a propósito: hermandad, corporación, casi-Oráculo, túnel sumergido,
> simulacro y Príncipe son todos el mismo movimiento —conseguir palancas en el Berlín del
> presente.

Chapter names would restate that in three noun phrases. That is a downgrade, not an addition.

### 2.2 The UI does not reward them

Chapters are surfaced in exactly **two** places in the whole application:

1. **The arc detail page** (`app/pages/campaigns/[id]/arcs/[slug]/index.vue`) — a flat list of
   `chapter.name` plus an optional `chapter.description` rendered through `<MDC>`, with
   edit/delete/move-up/move-down controls for DMs. It sits in a sibling `<section>` to the
   linked-sessions list and **the two are never joined**. No session row shows its chapter; no
   chapter row shows its sessions.
2. **The session form dropdown** (`app/components/forms/SessionForm.vue`, plus the `new` and
   `edit` session pages) — a picker used at write time only.

The spec confirms the ceiling rather than raising it. `openspec/specs/arcs-chapters-ui/spec.md`
has one scenario for viewing sessions on an arc page:

> **Given** I am on the arc detail page for "Act I" / **And** sessions "Session 5" and "Session 6"
> reference this arc / **Then** I see a "Sessions" section listing "Session 5" and "Session 6"
> with links to their detail pages

Note what it does _not_ say: nothing about grouping those sessions under chapters. The spec's
chapter scenarios are all CRUD — add, edit inline, delete, reorder. Chapters are a thing you can
_manage_; they are not yet a thing that _organises_ anything a reader sees.

So the gain to a GM or reader today is: three extra words on one page. The gain to a player who
opens `session-2022-05-12` from a link is **zero** — that page will not even tell them which arc
they are in.

> **Checked against work in flight.** The arc detail page is being modified concurrently (an
> in-progress fix to how it loads sessions: it now asks the server for `arcSlug` with
> `pageSize: '0'` instead of fetching a default page of 50 and filtering client-side, which had
> been dropping every session past the 50th and hiding the earliest arcs entirely). That fix is
> real and needed for this campaign — 73 sessions, so arcs 01–02 were invisible. But it does not
> change the argument: after it, `linkedSessions` is still a flat
> `rows.filter(s => s.arcId === found.id)` with no chapter grouping. If that changes — if the
> arc page starts rendering sessions nested under their chapters — then §2.2 weakens
> substantially and this recommendation should be revisited. **That is the single condition that
> would flip it.**

### 2.3 Thirty-odd chapters is clutter, not navigation

The all-arcs variant lands at **26–30 chapters**. Spread over 11 arc pages that is 2–3 rows per
page, each row a name with no session under it. It does not compress a long list into a short
one, because the long list stays exactly as long — the sessions section is unchanged. It adds a
second thing to scan. On the arcs _list_ page, the only aggregate the spec promises is a
"chapter count" badge per arc, which would change from `0` to `2`/`3` and carry no information a
reader wants.

Against that, the honest comparison: the arc README's index table already gives dates and
session counts for all 11 arcs in 13 lines, and each arc file gives an ordered session table.
Navigation is solved, in the committed source, without chapters.

### 2.4 A chapter is one more invariant to keep true

`server/utils/arc-chapter.ts` exists **only** because a session's `arcId` and `chapterId` can
disagree. Its docblock enumerates the reconciliation rules:

> `arcSlug` unset (`null`/`''`) -> clears `arcId` **and** `chapterId` […] `chapterSlug` unset ->
> clears only `chapterId`, leaving the arc. […] A non-empty `arcSlug` alone, when
> `current.chapterId` belongs to a _different_ arc -> clears that `chapterId` too.

With zero chapters that invariant **cannot be violated**, and none of that code can misfire on
this campaign. With 16–30 chapters it becomes live surface: every future `session update --arc`
on this campaign silently clears a chapter, and re-filing a session is now two facts to get
right instead of one.

There is a second, sharper hazard. `chapters/index.post.ts` computes `slug = slugify(body.name)`
and performs **no uniqueness check at all**. `slugify` strips diacritics and lowercases, so
"El regreso" in arc 06 and "El Regreso" in arc 10 produce the identical slug — and the resolver
then refuses to file sessions by slug:

> `Chapter slug "…" is ambiguous: N chapters in this campaign share it. Pass arcSlug to
disambiguate, or chapterId instead.`

The error message contemplates collisions both campaign-wide _and_ **within a single arc**. Any
chapter scheme therefore has to hand-guarantee 16–30 globally distinct slugs, forever, including
for chapters added later. That is a naming constraint the arcs never imposed.

### 2.5 The campaign is finished

All 11 arcs are `status: completed`; the last session is 2023-04-13. Chapters are a forward-looking
affordance — you create one to slot sessions you have not run yet, and the UI's inline
add/reorder controls are built for exactly that. Retro-fitting them onto a closed three-year
chronicle is archival tidying with no operational use. If the structure needs recording, the
place it is already recorded — and read — is the arc files.

### 2.6 Two arcs cannot be partitioned honestly anyway

A chapter boundary can only fall _between_ sessions. In two arcs the real seam falls **inside** a
session:

- **Arc 03** — `session-2021-01-28.md` opens by finishing the fern-creature fight carried over
  from 01-21, and the mansion only appears in its _second_ section. Whichever side you file it
  on, one session is impure.
- **Arc 07** — the return to the physical world happens in the _fourth of five_ sections of
  `session-2022-03-04.md`: "De vuelta en el mundo físico, la guarida de Peter tenía la calidez de
  los lugares donde ocurren cosas que se recuerdan." The clean date boundary leaves a
  single-session epilogue.

---

## 3. The case for

The case for is not "structure exists somewhere" — it is that **six of the eleven arcs have seams
the chronicles state out loud**, and five do not. Quoted, not asserted:

### Arc 06 «El camino hasta Oda» — the strongest seam in the campaign

The arc's final two sessions are a paid errand at a different site, with a different party
composition, and the text announces both. `session-2021-11-18.md`:

> Peter fue directo. Tenía una condición para ayudarles con Oda: a un kilómetro del lago había
> una estación abandonada que alguien estaba utilizando. No quería ese alguien cerca. El grupo
> tendría que encargarse de limpiar el lugar y, una vez limpio, traer a la muchacha a él.

> La condición era también que fueran sin los Garou. Peter fue claro en eso.

And the new theatre opens the next session, `session-2021-12-09.md`:

> Las vías llevaban veinte años en desuso. La maleza había crecido entre los raíles con esa
> paciencia de las plantas que no necesitan permiso para ocupar los lugares que los humanos
> abandonan.

The earlier seam is stated too — the objective is named at the close of `session-2021-10-28.md`:

> Un Mokoleh. […] Solo había uno en Berlín, o cerca de Berlín. Se llamaba Peter. Vivía en el Lago
> Murise.

### Arc 11 «La búsqueda de Salvador» — both seams land exactly on date boundaries

`session-2023-03-09.md` ends literally on the threshold:

> La sesión terminó en el umbral, con Salvador cruzando y sin haber llegado todavía.

and the next session changes the cast — the other players stop playing their own characters.
`session-2023-03-16.md`:

> Pau, Sugus, Xavi, Shascuas y Carlos: Pau seguía con Salvador, y los otros cuatro llegaron con
> gente nueva, porque lo que había al otro lado de la palanca no era Berlín y no admitía a nadie
> que hubiera venido de allí en su forma de siempre.

The second seam is equally clean — `session-2023-03-30.md` ends:

> Aparecieron en la ribera del Nilo, con el agua ancha y quieta a un lado y un templo delante.

### Arc 03 «Los invitados de Klinger» — three blocks, and the best seam is the return

Announced in the last line of `session-2021-02-11.md`:

> Quedaba lo que Julia necesitara hacer. Después de eso, el camino de vuelta.

Delivered in the first lines of `session-2021-02-18.md`:

> Salieron por el río. La ciudad se movía más que antes —figuras en las calles a horas en que no
> debería haberlas, patrones de movimiento que no correspondían a ninguna lógica civil.

The journey→mansion turn is real but impure (see §2.6). `session-2021-01-21.md` for the journey
mode:

> Salvador resolvió el problema del transporte con la practicidad que le caracterizaba: reparó un
> tanque.

### Arc 10 «Raíces y mecanismos» — a hard seam with no carried thread

The Madre block closes completely in `session-2022-11-03.md`:

> Roland hizo un ritual con sangre esa misma noche para plantar el esqueje en otro árbol del
> jardín. […] Roland ganó cultistas. Y ganó Arete.

and `session-2022-11-10.md` opens somewhere else, on something else, with a reduced roster:

> Volvieron a la sala del nodo nazi: Julia, Philip, Salvador y Roland. El lugar tenía la frialdad
> de los sitios que han sido diseñados para funcionar, no para ser habitados.

The arc file itself concedes the bundling is editorial: "Reúno aquí el ritual de Madre y la sala
del nodo nazi porque la segunda es el mecanismo que Salvador irá a estudiar solo en el arco
siguiente."

### Arc 08 «Los que mueven Berlín» — heterogeneous but **sequential**, so it does split

Checked against the chronicles: the six threads are a _chain_, not a braid — each session's close
names the next target, and every thread occupies a contiguous run. The strongest cut is
2022-05-12, after which the arc never returns to the criminal-economy thread.
`session-2022-05-12.md`:

> No había forma de llegar con barca sin levantar sospechas, de modo que el grupo se dividió.
> Otto, Salvador y Philip tomaron el submarino. Julia y Roland entraron al agua.

> Las esvásticas en las paredes no sorprendieron a nadie; lo que sorprendió fue lo que había
> encima de las mesas: hojas de papel cubiertos de cálculos matemáticos que no eran matemáticas
> ordinarias. Coordenadas. Dimensiones.

The money-trail pivot is set up in `session-2022-04-21.md`:

> Quince años antes: quince personas, importación y exportación de artesanía africana. Ahora:
> doscientas personas, sede principal en la zona más cara del distrito de oficinas de Berlín.

and the revelation block opens in `session-2022-06-16.md`:

> Hacía setenta y ocho años, en Berlín, un ritual de 1942 había resucitado a Tezgul. […] los
> vasanos llaman a los vasanos, y Tezgul ya tenía siete. Veintidós en total existían.

### Arc 02 «La ciudad bajo la cúpula» — mobile recon, then one building

Everything from 2020-11-22 happens inside the lonja and resolves there.
`session-2020-11-22.md`:

> Se movieron rápido y en silencio hacia la entrada de la lonja.

> El interior olía a carne vieja y a algo metálico que Roland identificó solo después: sangre
> seca en grandes cantidades, absorbida en la madera del suelo a lo largo de mucho tiempo.

### Where the case for fails

- **Arc 04 «Lo que Berlín hizo sin ellos» (4)** — organised by _thread_, not by place or
  objective, and the threads run in parallel. The only candidate cut (2021-04-29) opens from
  inside an existing thread. Reject.
- **Arc 09 «La casa de las mil puertas» (6)** — sessions 2–5 are one continuous crawl through one
  building toward one objective. The four-sphere goal is stated inside 08-18 and paid off in
  09-08, so cutting between them would split a single objective. Only a 197-word prologue and an
  epilogue are separable, and a 1-session chapter is not a grouping.
- **Arc 07 «El hotel de Oda» (7)** — its own file is right: "Es el arco más cerrado de la
  campaña: un solo escenario, un solo objetivo." What looks like structure (floors, cherubs,
  objects) is escalation. Best available split is 6+1.
- **Arc 05 «El Edificio Leeren» (8)** — objective declared in the first paragraph of the first
  session and never changes; the one strong seam (outside→inside, 2021-05-20) yields a lopsided
  **1+7**.
- **Arc 01 «Fuego en las vías» (5)** — a moderate 2+3 seam at 2020-06-06, but the video arrives in
  that session's _second_ section, and 5 sessions do not need subdividing.

---

## 4. Contingency scheme — **not recommended**, provided so the cost is falsifiable

If chapters are adopted anyway, adopt them **only in the six arcs whose seams the text states**
(§3) and leave arcs 01, 04, 05, 07, 09 with no chapters. Sessions in those five arcs stay filed
directly under their arc, which the model permits.

Names are Spanish, in the register of the arc descriptions. `sortOrder` is 0-based within its
arc, matching what the UI's own `addChapter` does (`const sortOrder = arc.value.chapters?.length ?? 0`).
Slugs are `slugify(name)` — diacritics stripped, lowercased, non-alphanumerics to `-` — and all
16 are globally distinct, per §2.4.

### Arc 02 — `la-ciudad-bajo-la-cupula` (7 sessions)

| sortOrder | Chapter                       | Slug                            | Sessions                                                                                          |
| --------- | ----------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0         | Las leyes de la ciudad muerta | `las-leyes-de-la-ciudad-muerta` | `al-otro-lado-del-umbral`, `berlin-bajo-otra-ley`, `la-manta-y-la-cupula`, `el-vigilante-del-rio` |
| 1         | La lonja                      | `la-lonja`                      | `lo-que-come-en-la-lonja`, `zarcillos-en-el-espiritu`, `la-fuga-y-el-fuego`                       |

Arithmetic: 4 + 3 = **7** ✓ (arc total 7)

### Arc 03 — `los-invitados-de-klinger` (7 sessions)

| sortOrder | Chapter                    | Slug                         | Sessions                                                                                                               |
| --------- | -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0         | Atravesar la ciudad muerta | `atravesar-la-ciudad-muerta` | `sombras-sobre-el-zoologico-en-ruinas`, `el-tanque-silencioso-y-el-oso-de-helechos`                                    |
| 1         | La mansión de Klinger      | `la-mansion-de-klinger`      | `la-mansion-al-final-del-parque`, `las-cartas-que-mueven-el-destino`, `naranjas-de-quintaesencia-y-la-sombra-de-simon` |
| 2         | El camino de vuelta        | `el-camino-de-vuelta`        | `la-serpiente-negra-de-las-alcantarillas`, `el-portal-y-el-alivio-de-la-capilla`                                       |

Arithmetic: 2 + 3 + 2 = **7** ✓ (arc total 7)
Impure: `la-mansion-al-final-del-parque` opens with the previous session's fight (§2.6).

### Arc 06 — `el-camino-hasta-oda` (8 sessions)

| sortOrder | Chapter                | Slug                     | Sessions                                                                                  |
| --------- | ---------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| 0         | El consejo y la espera | `el-consejo-y-la-espera` | `el-consejo-de-los-maestros`, `el-huerto-y-los-planes`                                    |
| 1         | Entre los cambiaformas | `entre-los-cambiaformas` | `las-manos-en-la-tierra`, `humo-y-alta-umbra`, `la-niebla-del-lago`, `el-hombre-del-lago` |
| 2         | El precio de Peter     | `el-precio-de-peter`     | `el-canturreo-en-frances`, `la-caseta-de-los-muertos`                                     |

Arithmetic: 2 + 4 + 2 = **8** ✓ (arc total 8)
Impure: `las-manos-en-la-tierra` closes the Rafaella business before crossing into Garou society.

### Arc 08 — `los-que-mueven-berlin` (9 sessions)

| sortOrder | Chapter                | Slug                     | Sessions                                                                               |
| --------- | ---------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| 0         | Los Osmanen            | `los-osmanen`            | `senales-en-el-horizonte`, `el-almacen`, `la-nave-y-la-hermandad`, `la-dama-de-hierro` |
| 1         | Quién mueve el dinero  | `quien-mueve-el-dinero`  | `el-casi-oraculo`, `el-tunel-subacuatico`                                              |
| 2         | La escala del problema | `la-escala-del-problema` | `el-simulacro`, `las-cartas-se-reconocen`, `la-principe-de-berlin`                     |

Arithmetic: 4 + 2 + 3 = **9** ✓ (arc total 9)

### Arc 10 — `raices-y-mecanismos` (7 sessions)

| sortOrder | Chapter              | Slug                   | Sessions                                                                                    |
| --------- | -------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| 0         | El traslado de Madre | `el-traslado-de-madre` | `el-ritual-de-madre`, `las-esferas-del-norte`, `en-la-muerte-esta-la-vida`                  |
| 1         | La sala del nodo     | `la-sala-del-nodo`     | `la-secuencia-incorrecta`, `continuidad`, `el-regreso-tras-el-silencio`, `la-cuarta-esfera` |

Arithmetic: 3 + 4 = **7** ✓ (arc total 7)
Thin: the four sessions of `la-sala-del-nodo` total roughly 660 words between them (see §6).

### Arc 11 — `la-busqueda-de-salvador` (5 sessions)

| sortOrder | Chapter                | Slug                     | Sessions                                                                          |
| --------- | ---------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| 0         | Antes de la palanca    | `antes-de-la-palanca`    | `el-nodo-bajo-el-rio`                                                             |
| 1         | Los que fallaron antes | `los-que-fallaron-antes` | `la-casa-de-los-banquetes`, `el-genocidio-interrumpido`, `los-que-murieron-antes` |
| 2         | El templo y el precio  | `el-templo-y-el-precio`  | `el-templo-y-el-hueso`                                                            |

Arithmetic: 1 + 3 + 1 = **5** ✓ (arc total 5)
Two of three chapters hold one session each — but they are the two heaviest files in the campaign
(603 and 1,013 words), so they carry their weight. Chapter 0 is named "Antes de la palanca"
rather than after the session it contains, to avoid a chapter and a session with the same name.

### Totals

|                               | Count                                |
| ----------------------------- | ------------------------------------ |
| Chapters created              | **16**                               |
| Sessions assigned             | **43** (arcs 02, 03, 06, 08, 10, 11) |
| Sessions left with no chapter | **30** (arcs 01, 04, 05, 07, 09)     |
| Sum                           | 43 + 30 = **73** ✓                   |

Every chapter partitions its arc exactly: no session appears in two chapters, and within the six
chaptered arcs no session is left out.

For comparison, the **all-arcs** variant would be ~26–30 chapters and 73 session assignments,
≈ **99–103 mutating calls**, and would require inventing boundaries in the five arcs of §3's
"where the case for fails" — including the 1+7 split in arc 05 and a 1-session chapter in arc 09.

---

## 5. The exact commands — ready to run, **not run**

Campaign ID: `4b2adca6-fa7e-47b9-87f9-b0a0e9c6e1e4` (verified read-only via `aleph campaign list`).

`aleph` is not on `PATH`; invoke it as `node /Users/ludo/code/mago20/aleph/cli/bin/aleph.js`, or
alias it. `CAMPAIGN` is set once for brevity.

```bash
CAMPAIGN=4b2adca6-fa7e-47b9-87f9-b0a0e9c6e1e4
ALEPH="node /Users/ludo/code/mago20/aleph/cli/bin/aleph.js"
```

### 5a. Create the 16 chapters (16 calls)

`--sort-order` is passed explicitly on every call: the endpoint defaults it to `0`, so omitting
it would give every chapter in an arc the same order.

```bash
# Arc 02 — La ciudad bajo la cúpula
$ALEPH chapter create --campaign $CAMPAIGN --arc la-ciudad-bajo-la-cupula --name "Las leyes de la ciudad muerta" --sort-order 0
$ALEPH chapter create --campaign $CAMPAIGN --arc la-ciudad-bajo-la-cupula --name "La lonja" --sort-order 1

# Arc 03 — Los invitados de Klinger
$ALEPH chapter create --campaign $CAMPAIGN --arc los-invitados-de-klinger --name "Atravesar la ciudad muerta" --sort-order 0
$ALEPH chapter create --campaign $CAMPAIGN --arc los-invitados-de-klinger --name "La mansión de Klinger" --sort-order 1
$ALEPH chapter create --campaign $CAMPAIGN --arc los-invitados-de-klinger --name "El camino de vuelta" --sort-order 2

# Arc 06 — El camino hasta Oda
$ALEPH chapter create --campaign $CAMPAIGN --arc el-camino-hasta-oda --name "El consejo y la espera" --sort-order 0
$ALEPH chapter create --campaign $CAMPAIGN --arc el-camino-hasta-oda --name "Entre los cambiaformas" --sort-order 1
$ALEPH chapter create --campaign $CAMPAIGN --arc el-camino-hasta-oda --name "El precio de Peter" --sort-order 2

# Arc 08 — Los que mueven Berlín
$ALEPH chapter create --campaign $CAMPAIGN --arc los-que-mueven-berlin --name "Los Osmanen" --sort-order 0
$ALEPH chapter create --campaign $CAMPAIGN --arc los-que-mueven-berlin --name "Quién mueve el dinero" --sort-order 1
$ALEPH chapter create --campaign $CAMPAIGN --arc los-que-mueven-berlin --name "La escala del problema" --sort-order 2

# Arc 10 — Raíces y mecanismos
$ALEPH chapter create --campaign $CAMPAIGN --arc raices-y-mecanismos --name "El traslado de Madre" --sort-order 0
$ALEPH chapter create --campaign $CAMPAIGN --arc raices-y-mecanismos --name "La sala del nodo" --sort-order 1

# Arc 11 — La búsqueda de Salvador
$ALEPH chapter create --campaign $CAMPAIGN --arc la-busqueda-de-salvador --name "Antes de la palanca" --sort-order 0
$ALEPH chapter create --campaign $CAMPAIGN --arc la-busqueda-de-salvador --name "Los que fallaron antes" --sort-order 1
$ALEPH chapter create --campaign $CAMPAIGN --arc la-busqueda-de-salvador --name "El templo y el precio" --sort-order 2
```

**Before running 5b, verify the slugs actually minted:**
`$ALEPH chapter list --campaign $CAMPAIGN --json`. The slugs below are `slugify(name)` as
computed by `server/services/content.ts`, which is deterministic — but the endpoint does not
dedupe, so a pre-existing collision would silently produce a duplicate slug and 5b would then
fail with the "ambiguous" error from §2.4.

### 5b. File the 43 sessions (43 calls)

`session update --chapter <slug>` also sets the arc the chapter belongs to, so `--arc` is not
needed on any of these.

```bash
# Arc 02 → las-leyes-de-la-ciudad-muerta (4)
$ALEPH session update al-otro-lado-del-umbral --campaign $CAMPAIGN --chapter las-leyes-de-la-ciudad-muerta
$ALEPH session update berlin-bajo-otra-ley --campaign $CAMPAIGN --chapter las-leyes-de-la-ciudad-muerta
$ALEPH session update la-manta-y-la-cupula --campaign $CAMPAIGN --chapter las-leyes-de-la-ciudad-muerta
$ALEPH session update el-vigilante-del-rio --campaign $CAMPAIGN --chapter las-leyes-de-la-ciudad-muerta
# Arc 02 → la-lonja (3)
$ALEPH session update lo-que-come-en-la-lonja --campaign $CAMPAIGN --chapter la-lonja
$ALEPH session update zarcillos-en-el-espiritu --campaign $CAMPAIGN --chapter la-lonja
$ALEPH session update la-fuga-y-el-fuego --campaign $CAMPAIGN --chapter la-lonja

# Arc 03 → atravesar-la-ciudad-muerta (2)
$ALEPH session update sombras-sobre-el-zoologico-en-ruinas --campaign $CAMPAIGN --chapter atravesar-la-ciudad-muerta
$ALEPH session update el-tanque-silencioso-y-el-oso-de-helechos --campaign $CAMPAIGN --chapter atravesar-la-ciudad-muerta
# Arc 03 → la-mansion-de-klinger (3)
$ALEPH session update la-mansion-al-final-del-parque --campaign $CAMPAIGN --chapter la-mansion-de-klinger
$ALEPH session update las-cartas-que-mueven-el-destino --campaign $CAMPAIGN --chapter la-mansion-de-klinger
$ALEPH session update naranjas-de-quintaesencia-y-la-sombra-de-simon --campaign $CAMPAIGN --chapter la-mansion-de-klinger
# Arc 03 → el-camino-de-vuelta (2)
$ALEPH session update la-serpiente-negra-de-las-alcantarillas --campaign $CAMPAIGN --chapter el-camino-de-vuelta
$ALEPH session update el-portal-y-el-alivio-de-la-capilla --campaign $CAMPAIGN --chapter el-camino-de-vuelta

# Arc 06 → el-consejo-y-la-espera (2)
$ALEPH session update el-consejo-de-los-maestros --campaign $CAMPAIGN --chapter el-consejo-y-la-espera
$ALEPH session update el-huerto-y-los-planes --campaign $CAMPAIGN --chapter el-consejo-y-la-espera
# Arc 06 → entre-los-cambiaformas (4)
$ALEPH session update las-manos-en-la-tierra --campaign $CAMPAIGN --chapter entre-los-cambiaformas
$ALEPH session update humo-y-alta-umbra --campaign $CAMPAIGN --chapter entre-los-cambiaformas
$ALEPH session update la-niebla-del-lago --campaign $CAMPAIGN --chapter entre-los-cambiaformas
$ALEPH session update el-hombre-del-lago --campaign $CAMPAIGN --chapter entre-los-cambiaformas
# Arc 06 → el-precio-de-peter (2)
$ALEPH session update el-canturreo-en-frances --campaign $CAMPAIGN --chapter el-precio-de-peter
$ALEPH session update la-caseta-de-los-muertos --campaign $CAMPAIGN --chapter el-precio-de-peter

# Arc 08 → los-osmanen (4)
$ALEPH session update senales-en-el-horizonte --campaign $CAMPAIGN --chapter los-osmanen
$ALEPH session update el-almacen --campaign $CAMPAIGN --chapter los-osmanen
$ALEPH session update la-nave-y-la-hermandad --campaign $CAMPAIGN --chapter los-osmanen
$ALEPH session update la-dama-de-hierro --campaign $CAMPAIGN --chapter los-osmanen
# Arc 08 → quien-mueve-el-dinero (2)
$ALEPH session update el-casi-oraculo --campaign $CAMPAIGN --chapter quien-mueve-el-dinero
$ALEPH session update el-tunel-subacuatico --campaign $CAMPAIGN --chapter quien-mueve-el-dinero
# Arc 08 → la-escala-del-problema (3)
$ALEPH session update el-simulacro --campaign $CAMPAIGN --chapter la-escala-del-problema
$ALEPH session update las-cartas-se-reconocen --campaign $CAMPAIGN --chapter la-escala-del-problema
$ALEPH session update la-principe-de-berlin --campaign $CAMPAIGN --chapter la-escala-del-problema

# Arc 10 → el-traslado-de-madre (3)
$ALEPH session update el-ritual-de-madre --campaign $CAMPAIGN --chapter el-traslado-de-madre
$ALEPH session update las-esferas-del-norte --campaign $CAMPAIGN --chapter el-traslado-de-madre
$ALEPH session update en-la-muerte-esta-la-vida --campaign $CAMPAIGN --chapter el-traslado-de-madre
# Arc 10 → la-sala-del-nodo (4)
$ALEPH session update la-secuencia-incorrecta --campaign $CAMPAIGN --chapter la-sala-del-nodo
$ALEPH session update continuidad --campaign $CAMPAIGN --chapter la-sala-del-nodo
$ALEPH session update el-regreso-tras-el-silencio --campaign $CAMPAIGN --chapter la-sala-del-nodo
$ALEPH session update la-cuarta-esfera --campaign $CAMPAIGN --chapter la-sala-del-nodo

# Arc 11 → antes-de-la-palanca (1)
$ALEPH session update el-nodo-bajo-el-rio --campaign $CAMPAIGN --chapter antes-de-la-palanca
# Arc 11 → los-que-fallaron-antes (3)
$ALEPH session update la-casa-de-los-banquetes --campaign $CAMPAIGN --chapter los-que-fallaron-antes
$ALEPH session update el-genocidio-interrumpido --campaign $CAMPAIGN --chapter los-que-fallaron-antes
$ALEPH session update los-que-murieron-antes --campaign $CAMPAIGN --chapter los-que-fallaron-antes
# Arc 11 → el-templo-y-el-precio (1)
$ALEPH session update el-templo-y-el-hueso --campaign $CAMPAIGN --chapter el-templo-y-el-precio
```

### Call count

| Step                       | Calls  |
| -------------------------- | ------ |
| `chapter create`           | 16     |
| `session update --chapter` | 43     |
| **Total mutating calls**   | **59** |

Plus 1 read-only verification (`chapter list --json`) between the two steps. The all-arcs variant
would be ≈ 99–103 mutating calls.

**Nothing in this section has been executed.** Production still has 11 arcs and 0 chapters,
confirmed read-only after this document was written.

---

## 6. What I deliberately left out

**Five arcs get no chapters** — 01 «Fuego en las vías» (5 sessions, moderate seam that falls
mid-session), 04 «Lo que Berlín hizo sin ellos» (parallel threads, no seam at all), 05 «El
Edificio Leeren» (one objective throughout; best split is a lopsided 1+7), 07 «El hotel de Oda»
(escalation, not seams; best split 6+1), 09 «La casa de las mil puertas» (one continuous crawl;
only a 197-word prologue is separable). Reasons and quotes in §3.

**Sub-seams I could have used and did not:**

- **Arc 06 at 2021-11-11** (`entre-los-cambiaformas` → lake). Real change of place and
  interlocutor, but it splits a 4-session block into 2+2 of ~1,000 words each and makes arc 06 a
  four-chapter arc — finer than any other arc in the scheme, for a sub-sub-division of the same
  quest.
- **Arc 08 into six blocks**, one per named thread. Three of the six (Khayalethu, the tunnel,
  Hugo's simulacrum) are _single sessions_, so six chapters would mean three one-session
  chapters. The chain is sequential but not six-part.
- **Arc 02 at 2020-11-05 / 11-12** (the radio, the Vigilante, the boat) as an alternative 3+4.
  A defensible mode change, but the middle block would be one session.
- **Arc 05 at 2021-07-08** (explore → rescue and demolish) and **arc 09 at 2022-09-08** (crawl →
  negotiation). Both are climaxes of an objective already set, not changes of objective. A climax
  is not a seam.
- **The hiatus at 2023-01-12** as a chapter boundary in arc 10. It is a production boundary, not
  a narrative one, and the chronicle says so itself: "Los asuntos pendientes seguían pendientes."
  The arc README already made this call and it is the right one.

**No chapter descriptions.** The commands in §5 pass only `--name`. The UI renders
`chapter.description` through `<MDC>`, so a description-less chapter shows as a bare name — which
weakens the already-thin gain of §2.2. Writing 16 descriptions is 16 more paragraphs that would
restate content already in the arc files, and it is 16 more things to keep consistent with them.
That cost is real and is _not_ included in the 59-call estimate.

**Where the source material is too thin to justify a boundary:**

- **Arc 10's second chapter is built on almost nothing.** Word counts: `continuidad`
  (2022-11-17) = **129 words**, `el-regreso-tras-el-silencio` (2023-01-12) = **134**,
  `la-cuarta-esfera` (2023-01-19) = **133** — against 354–670 for the arc's other sessions. None
  of the three contains an event. `session-2022-11-17.md` says so in its own first line: "Las
  notas de esa sesión son escasas, lo que a veces dice más de una noche que cualquier crónica."
  `la-secuencia-incorrecta` is itself only 223 words. So `la-sala-del-nodo` labels four sessions
  carrying roughly one session's worth of recorded content. I kept it only because the seam at
  2022-11-10 is otherwise the hardest in the campaign; the chapter is honest about its boundary
  and dishonest about its weight.
- **Arc 03 and arc 07 have seams inside sessions, not between them** (§2.6). Any partition of
  those arcs accepts one impure session. That is a limitation of the data model, not of the
  chronicles.
- **A register inconsistency in the same thin region**, worth knowing before anyone builds
  navigation on it: 2022-11-10 and 2022-11-17 name characters (Julia, Philip, Salvador, Roland),
  while 2023-01-12 and 2023-01-19 name what appear to be _players_ (Pau, Xavi, Carlos,
  Shascuas) — and "Shascuas" also appears as an in-fiction arrival in `session-2022-09-08.md`.
  The notes degrade in register as they degrade in length.

**Not touched:** no code, no spec, no existing arc file, nothing under `summary/`, no
`../*.txt`, no git. The only file created is this one. No mutating API call was made.
