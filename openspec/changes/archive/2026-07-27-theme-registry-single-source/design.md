## Context

Three places currently claim to know the set of built-in themes:

| Source                                                          | Count             | Derived?                 | Read by any gate?                                           |
| --------------------------------------------------------------- | ----------------- | ------------------------ | ----------------------------------------------------------- |
| `app/utils/themes.ts` (`CAMPAIGN_THEMES`)                       | 12                | — (it _is_ the registry) | Yes — the picker, the layout, and `campaign-themes.test.ts` |
| `openspec/specs/campaign-themes/spec.md`, `Built-in RPG themes` | 10, under `SHALL` | No, hand-written         | **No**                                                      |
| `tests/unit/css/themes.test.ts`, `const THEMES`                 | 11, hand-written  | **No**                   | Yes, but only against itself                                |

Only the first is load-bearing. The second is prose no gate reads. The third looks like a gate
but is a hand-maintained list that happens to agree with the registry today.

### The history matters, and it decides the design

The naive read of this bug is "the spec drifted twice, so patch it and be more careful." The
history refutes that. `git show ca67667 --stat` shows one commit touching both
`app/utils/themes.ts` (`+23` lines) and
`openspec/changes/campaign-themes/specs/campaign-themes/spec.md` (`+81` lines), and its message
opens with "Implements **11** built-in themes" — naming `superhero` explicitly — while the spec
delta it carried in the same diff listed **ten**. `git log --diff-filter=A --follow` on
`openspec/specs/campaign-themes/spec.md` returns `ca67667` alone, so there is no earlier, correct
version of the list to regress from.

The enumeration therefore did not decay. **It was born wrong and has been wrong for its entire
life.** A `SHALL` that was false the moment it was written, that stayed false through an archive
and two subsequent theme additions, and that no test or CI job has ever read, is not a
requirement being violated — it is duplicated content that has never been able to defend itself.
Correcting the count would leave that structure fully intact and simply reset the clock.

## Goals / Non-Goals

**Goals**

- Leave exactly one authoritative list of themes: `app/utils/themes.ts`.
- Keep every genuinely normative statement the spec makes today.
- Make "a theme exists but isn't fully styled" a **CI failure**, not a review catch.
- Make `superhero` and `mage-ascension` correct _structurally_ — as a consequence of removing the
  duplicate, not by typing two more names into a list that will be short again next time.

**Non-Goals**

- Changing any theme, colour, font, or CSS token. The Mage theme's heading colour is being
  changed concurrently by other work and is out of scope here.
- Removing individual theme slugs from _scenarios_. See the scope line below.
- Adding a runtime validator for `campaigns.theme`. The existing `theme || 'default'` fallback and
  its spec requirement are adequate and unchanged.
- Fixing the 38 pre-existing `--all --strict` failures (missing `## Purpose` sections). Separately
  owned.

## Decisions

### 1. Demote the enumeration; keep `at least 10` as the only normative count

`SHALL provide at least 10 built-in visual themes` is kept verbatim. It is a real, checkable,
directional constraint: it prevents the catalogue from shrinking below a useful floor, and it
cannot be invalidated by _adding_ a theme — which is the only thing that has ever happened here.

The by-name list is kept as content but stripped of `SHALL`, marked explicitly non-normative, and
prefixed with a pointer to `app/utils/themes.ts` as the registry of record.

**Why keep the list at all rather than delete it?** Because it is not pure duplication. The
registry carries `id`, `name`, and three hex swatches; the spec list carries the **design intent**
per theme ("sepia/tan backgrounds, terracotta and brown accents", "near-black with bone-white
text"). That intent exists nowhere else and is what a reader actually wants from the spec. Deleting
it would lose information to fix a drift problem that de-normalising already fixes.

**The tradeoff, stated honestly:** an illustrative list can still fall behind the registry. It is
listed complete and correct at twelve as of this change, and it is labelled as possibly lagging.
The difference from today is that falling behind would then be a documentation nit rather than a
spec violation, and the thing that _must_ stay in step — every theme being fully styled — moves to
a CI-enforced requirement that reads the registry directly. That is the point: put the
drift-sensitive claim where a machine checks it, and leave the human-readable colour commentary
where it can be a little loose without lying.

### 2. Scope line: enumerations get de-normalised, exemplar scenarios do not

Both specs name specific slugs inside scenarios — "Heading font applied in dark-fantasy theme",
"Card shadow applied in steampunk theme", "a DM sets their campaign theme to `dark-fantasy`".
These are **deliberately left alone.**

An enumeration claims to be _exhaustive_, so any addition falsifies it — that is the defect being
fixed. An exemplar claims only that _this_ theme behaves _this_ way, which stays true no matter
how many themes are added. Adding a theme cannot break an exemplar; only deleting the named theme
can, and in that case a failing scenario is the correct, desirable signal. Rewriting exemplars
into registry-generic language would also destroy their value as test cases, which
`openspec/config.yaml` explicitly asks scenarios to be ("each scenario is a potential test case").

The two scenarios being rewritten are rewritten precisely because they are exhaustive claims
("All 10 themes…", "all 10 theme heading and body fonts") rather than exemplars.

### 3. Split the enforcement requirement along the file boundary, not into one

Item 3 describes one gate, but it spans two CSS files that two different capabilities already own:

- `campaign-themes` → `Built-in RPG themes` already speaks about the colour tokens
  (`--background`, `--foreground`, …), which live in `main.css`.
- `immersive-campaign-themes` → `themes.css file isolates all new theme declarations` already
  states that the `--theme-*` tokens live in `themes.css` and that `main.css`'s colour blocks stay
  put.

Putting one cross-capability requirement in either spec would make that spec assert things about
the other's file. So the gate is expressed as two requirements, one per capability, each covering
its own file. Both are stated as _registry-derived_, which is the property that actually matters
and the property neither currently has.

### 4. What the enforcement requirements must specify — and the hole they close

The brief anticipated that `tests/unit/css/themes.test.ts` "iterates all twelve." **It does not.**
Verified: lines 7–19 declare a literal array of eleven strings, and `grep -rn "CAMPAIGN_THEMES"
tests/` matches only `tests/unit/components/campaign-themes.test.ts`. So the parity gate this
change is meant to _name_ does not exist yet in the form assumed, and specifying only what exists
today would specify a non-gate. Three concrete holes:

1. **The CSS list is not derived from the registry.** Adding a lucky-thirteenth theme to
   `app/utils/themes.ts` with no `themes.css` block passes `npx vitest run tests/unit/` today —
   the hardcoded array simply never asks about it. `toHaveLength(12)` in the sibling file fails,
   which is a useful tripwire, but it says "the count moved", not "the CSS is missing", and a
   developer's correct response to it is to bump the number.
2. **`main.css` is asserted by nothing at all.** `grep -rn "main.css" tests/` → no matches. The
   colour tokens are the _original_ theme mechanism and the one thing
   `Built-in RPG themes` has always been normative about, and they have no test.
3. **Token coverage is 4 of 10.** The CSS test checks `--theme-font-heading`,
   `--theme-font-body`, `--theme-bg-pattern`, `--theme-heading-decoration`. Each theme block
   actually defines ten: those four plus `--theme-font-weight-heading`, `--theme-letter-spacing`,
   `--theme-text-transform` (all three named normatively by `Theme typography tokens`) and
   `--theme-card-shadow`, `--theme-card-border`, `--theme-animation` (the first two named
   normatively by `Card and heading decoration tokens`). So three of the five tokens that
   requirement makes mandatory are unchecked.

The requirements are therefore written against the gate as it _should_ be, and `tasks.md` carries
the corresponding test work. This keeps the change honest: it is documentation-catch-up plus a
small, real test extension, and it does not pretend the enforcement already exists.

`default` stays outside the CSS parity check. It is in the registry as the picker's zero-state and
is defined by the **absence** of a `data-theme` attribute — three separate existing scenarios
require that it have no theme block, no pattern, and no decoration. The parity requirements
exclude it explicitly so they cannot be read as contradicting those.

### 5. `--theme-heading-color` is opt-in, so the gate asserts the opt-in property rather than the token

Non-goals above deferred the Mage heading colour as concurrent work. It has since landed
(`cb7c1bc`), adding a tenth `--theme-*` token that **only `mage-ascension` declares** and that the
other eleven themes deliberately omit — the wiring rule falls back to `inherit`, so omission is the
correct state, not an incomplete block.

That makes it the first token where "every theme must declare it" is the wrong rule, and it must not
join the nine mandatory tokens: doing so would fail eleven themes for being correct. But dropping it
from the gate entirely would leave the property that actually matters unchecked — that the mechanism
stays **inert** for every theme that has not opted in. A stray `--theme-heading-color` in another
theme's block is a real defect and nothing else would catch it.

So the gate holds a small `HEADING_COLOR_OPT_IN` allowlist and checks both directions: an opted-in
theme must declare the token with its expected value; every other **registry-derived** theme must not
declare it at all. This is not a re-run of the hardcoded-array problem being fixed. That array
mirrored the catalogue, so every catalogue addition silently escaped it; this allowlist enumerates
deliberate exceptions, so a catalogue addition is covered automatically — by the "must not declare
it" branch — and touching the allowlist is exactly the acknowledgement that opting a theme in should
require. The requirement is stated in `immersive-campaign-themes`, not `campaign-themes`, because
`--theme-*` tokens live in `themes.css` and that is the file-boundary split decision 3 sets up.

## Risks / Trade-offs

- **The illustrative list can still lag.** Accepted, and discussed in decision 1: it degrades from
  a false `SHALL` to an out-of-date aside, while the check that matters becomes machine-read.
- **A registry-derived CSS test fails at _theme-authoring_ time rather than at review.** That is
  the intent, but it does mean adding a theme becomes a two-file minimum (registry + `themes.css`)
  and a three-file one in practice (+ `main.css`). This is already true of the shipped code; the
  test only makes it visible.
- **Two requirements instead of one** means the gate is described in two places and could diverge.
  Mitigated by each being scoped to a single named file, with no overlap.
- **`toHaveLength(12)` stays as a deliberate tripwire.** It is a hardcoded count, which is
  arguably the same species of problem — but with the CSS checks derived from the registry, its
  role changes from "the list" to "a human confirmed this addition was intentional." Left in
  place on purpose, not overlooked.
