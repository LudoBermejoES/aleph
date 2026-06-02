# Automatic entity cross-linking

Type a character or location's name anywhere in a page and Aleph turns it into a live link — without breaking your code blocks, headings, frontmatter, or existing links. This is the autolink system (`server/services/autolink.ts` + `server/services/remark-autolink.ts`).

## What it produces

Matched names are wrapped in an `:entity-link{…}` Markdown directive:

```
The party met :entity-link{slug="gandalf" name="Gandalf"} at the gate.
```

On render this becomes a clickable link to the entity; in storage it stays plain text, so the source Markdown remains readable and portable.

## Why it's not just find-and-replace

Naive string replacement corrupts Markdown constantly. Autolinking has to **not** link inside:

- frontmatter (`---…---`)
- fenced code blocks (` ``` `) and inline code (`` ` ``)
- existing Markdown links (`[text](url)`, `@[text](path)`)
- headings (`#`–`######`)
- **existing `:entity-link{…}` directives** — or you get the infamous nested-link bug, `:entity-link{name=":entity-link{…}"}`

And when two entity names overlap (e.g. "Gandalf" and "Gandalf the Grey"), the longer match must win.

## How it works

1. **Build a matcher.** `buildAutomaton(entities)` builds a case-insensitive map of every entity name + alias → `{ entityId, originalText }`, sorted longest-first so the longest name wins.
2. **Find candidates.** `findMatches(text, automaton)` scans the text with word-boundary enforcement and records each match's position.
3. **Resolve overlaps.** `resolveOverlaps(matches)` applies longest-match-wins to drop overlapping shorter matches.
4. **Compute exclusion zones.** `computeExclusionZones(markdown)` returns the character ranges of all six protected region types listed above — including existing `:entity-link{…}` spans, which is what prevents nesting.
5. **Filter.** `filterMatchesByExclusions(matches, zones)` drops any match that falls inside a protected zone.
6. **Render.** `server/services/remark-autolink.ts` applies the surviving matches as a remark transform during Markdown rendering.

## Caching

Rebuilding the matcher for every render would be wasteful, so it's cached per campaign:

- `getCachedAutomaton(campaignId)` / `setCachedAutomaton(...)`
- `invalidateAutomatonCache(campaignId)` is called whenever a campaign's entities change (create/rename/delete), so the matcher stays correct without rebuilding on every page view.

## Lessons baked into the tests

`tests/unit/autolink.test.ts` pins the behavior that matters: longest-match-wins, every exclusion-zone type, and specifically the no-nesting rule. If you touch the exclusion logic, run these first — the nesting bug is easy to reintroduce.
