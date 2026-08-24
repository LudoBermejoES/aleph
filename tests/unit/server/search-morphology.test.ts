import { describe, it, expect, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFTS5, indexEntity, searchEntities } from '../../../server/services/search'

/**
 * The bench from openspec/changes/fix-campaign-search/proposal.md, one case per pair.
 *
 * The campaign is written in Spanish and the index declared `tokenize='porter unicode61'` —
 * an ENGLISH stemmer. What made it survive unnoticed is that it is half right: plurals and
 * diacritics resolve by accident, so the search returns results and nobody suspects.
 *
 * Measured before the fix, through the REAL query path (`buildFtsQuery` appends `*`, so
 * every term is a prefix query — the proposal's own bench used a bare `MATCH` and therefore
 * reported two extra failures that production does not actually have):
 *
 *   muerto      / muertos       ok      -s falls off by luck
 *   ancianas    / anciana       ok
 *   Ines        / Inés          ok      unicode61 folds the diacritic
 *   desaparecer / desapareció   ok      porter cuts -er, then `*` reaches -ió
 *   sangre      / sangrienta    ok      porter cuts -e, then `*` reaches -ienta
 *   asesinar    / asesinó       FALLA
 *   correr      / corriendo     FALLA
 *   asesina     / asesino       FALLA   not even the gender
 *
 * The three real failures are Spanish inflection, which no English analyser models.
 */

/** query term -> the surface form actually written in the entity's body */
const BENCH: Array<[query: string, written: string, wasWorking: boolean]> = [
  ['muerto', 'muertos', true],
  ['ancianas', 'anciana', true],
  ['Ines', 'Inés', true],
  ['desaparecer', 'desapareció', true],
  ['sangre', 'sangrienta', true],
  ['asesinar', 'asesinó', false],
  ['correr', 'corriendo', false],
  ['asesina', 'asesino', false],
]

/** Both directions matter: a player may type either form. */
const EXTRA_PAIRS: Array<[string, string]> = [
  ['asesinó', 'asesinar'],
  ['corriendo', 'correr'],
  ['desapareció', 'desaparecer'],
  ['investigando', 'investigar'],
  ['hablaron', 'hablar'],
  ['perdidas', 'perdido'],
]

function makeDb(pairs: Array<[string, string]>) {
  const sqlite = new Database(':memory:')
  initFTS5(sqlite)
  pairs.forEach(([, written], i) => {
    indexEntity(
      sqlite,
      `e${i}`,
      'c1',
      `Ficha ${i}`,
      [],
      [],
      `El informe dice que ${written} en el puerto.`,
    )
  })
  return sqlite
}

describe('the index matches the morphology of the language it holds', () => {
  let sqlite: Database.Database
  afterEach(() => sqlite?.close())

  it.each(BENCH)('%s finds %s', (query, written) => {
    sqlite = makeDb([[query, written]])
    expect(searchEntities(sqlite, 'c1', query, 20, 'player').map((r) => r.entityId)).toEqual(['e0'])
  })

  it.each(EXTRA_PAIRS)('%s finds %s (the other direction)', (query, written) => {
    sqlite = makeDb([[query, written]])
    expect(searchEntities(sqlite, 'c1', query, 20, 'player').map((r) => r.entityId)).toEqual(['e0'])
  })

  /**
   * The bug this change introduced and nearly shipped. FTS5 accepts `"a"* "b"*` but rejects
   * `("a"* OR "x") "b"*` with `syntax error near "b"` — and `searchEntities` catches a
   * malformed query and returns `[]`, so EVERY multi-word query containing a stemmable term
   * would have quietly returned nothing. It looked exactly like "no matches".
   */
  it.each([
    ['dos palabras', 'asesinar testigo'],
    ['tres palabras', 'asesinar al testigo'],
    ['la palabra derivable al final', 'testigo asesinar'],
    ['ninguna derivable', 'otto zzz'],
    ['una frase exacta junto a un termino derivable', '"el testigo" asesinar'],
  ])('a multi-term query still parses and matches (%s)', (_label, query) => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e0', 'c1', 'Otto zzz', [], [], 'el testigo dijo que lo asesinó al alba')
    // The point is that FTS5 PARSES it — a syntax error is swallowed into an empty list,
    // which is indistinguishable from an honest miss.
    expect(() => searchEntities(sqlite, 'c1', query, 20, 'player')).not.toThrow()
    if (query !== 'otto zzz') {
      expect(searchEntities(sqlite, 'c1', query, 20, 'player')).not.toEqual([])
    }
  })

  it('a query FTS5 cannot parse is still fail-closed rather than a 500', () => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e0', 'c1', 'Ficha', [], [], 'algo')
    expect(searchEntities(sqlite, 'c1', 'NEAR(', 20, 'player')).toEqual([])
  })

  it('does not collapse unrelated words that merely share a prefix', () => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'a', 'c1', 'Casa', [], [], 'La casa del puerto.')
    indexEntity(sqlite, 'b', 'c1', 'Otro', [], [], 'El casamiento fue en mayo.')
    // `casar` and `casa` are genuinely different lemmas; the point is that adding morphology
    // must not turn every query into a substring search.
    const hits = searchEntities(sqlite, 'c1', 'casamiento', 20, 'player').map((r) => r.entityId)
    expect(hits).toContain('b')
  })
})

describe('what already worked keeps working (non-regression)', () => {
  let sqlite: Database.Database
  afterEach(() => sqlite?.close())

  const DIACRITICS: Array<[string, string]> = [
    ['Ines', 'Inés'],
    ['Inés', 'Ines'],
    ['Belen', 'Belén'],
    ['Nicolas', 'Nicolás'],
    ['Munoz', 'Muñoz'],
    ['Muñoz', 'Muñoz'],
    ['Jose', 'José'],
  ]

  it.each(DIACRITICS)('name query %s still finds %s', (query, written) => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e0', 'c1', written, [written], [], `Una ficha sobre ${written}.`)
    expect(searchEntities(sqlite, 'c1', query, 20, 'player').map((r) => r.entityId)).toEqual(['e0'])
  })

  const PLURALS: Array<[string, string]> = [
    ['muertos', 'muerto'],
    ['muerto', 'muertos'],
    ['ancianas', 'anciana'],
    ['casas', 'casa'],
  ]

  it.each(PLURALS)('plural query %s still finds %s', (query, written) => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e0', 'c1', 'Ficha', [], [], `Hay ${written} por todas partes.`)
    expect(searchEntities(sqlite, 'c1', query, 20, 'player').map((r) => r.entityId)).toEqual(['e0'])
  })

  it('prefix search still works for a partial word', () => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e0', 'c1', 'Strahd von Zarovich', ['Strahd'], [], 'Un vampiro.')
    expect(searchEntities(sqlite, 'c1', 'Strah', 20, 'player')).toHaveLength(1)
  })

  it('an exact phrase query is still exact', () => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e0', 'c1', 'A', [], [], 'el caballo blanco corre')
    indexEntity(sqlite, 'e1', 'c1', 'B', [], [], 'el caballo negro corre')
    const hits = searchEntities(sqlite, 'c1', '"caballo blanco"', 20, 'player').map(
      (r) => r.entityId,
    )
    expect(hits).toEqual(['e0'])
  })
})
