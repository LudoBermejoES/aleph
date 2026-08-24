import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { initFTS5, indexEntity, searchEntities } from '../../../server/services/search'

/**
 * The hole the response-wide filter (`server/plugins/strip-secrets.ts`) cannot reach.
 *
 * That filter recognises a `:::secret` FENCE. The FTS5 snippet is a 30-token window around
 * the match, so it only ever contains a fence when the match happens to sit near one. The
 * real case is the opposite and is the one that shipped: a word that exists ONLY inside the
 * block, whose window is entirely interior to it. Nothing downstream can recognise that as
 * secret — it is ordinary prose by then.
 *
 * Two distinct leaks, and closing only the first is not enough:
 *
 *  1. **The text.** The excerpt quotes the secret.
 *  2. **Existence.** Even with a blank excerpt, a result at all says the word is in that
 *     sheet — which for `¿quién es el traidor?` is the entire secret.
 *
 * See openspec/changes/fix-campaign-search/design.md D4: if this passes on the first run it
 * is written wrong, the same methodological error as the pre-fix `backup-api.test.ts`, which
 * asserted the vulnerability as the expected behaviour.
 */

const PADDING = Array.from({ length: 60 }, (_, i) => `relleno${i}`).join(' ')

/** A word that exists ONLY inside the secret block, far from either fence. */
const NEEDLE = 'sacrificarán'

const BODY = [
  'La casa de los Aguirre es una mansión abandonada en las afueras.',
  '',
  ':::secret{.dm}',
  PADDING,
  `El ritual exige que tres inocentes se ${NEEDLE} antes del alba.`,
  PADDING,
  ':::',
  '',
  'Los vecinos dicen que nadie ha entrado desde hace veinte años.',
].join('\n')

describe('the lexical index does not hand Narrator-only content to a player', () => {
  let sqlite: Database.Database

  beforeEach(() => {
    sqlite = new Database(':memory:')
    initFTS5(sqlite)
    indexEntity(sqlite, 'e1', 'c1', 'Casa de los Aguirre', [], ['mansion'], BODY)
  })

  afterEach(() => sqlite.close())

  it('returns nothing at all for a word that only exists inside a secret block', () => {
    const results = searchEntities(sqlite, 'c1', NEEDLE, 20, 'player')
    expect(results).toEqual([])
  })

  it('leaks no part of the secret in an excerpt, whatever the query', () => {
    for (const q of [NEEDLE, 'ritual', 'inocentes', 'mansión', 'Aguirre', 'vecinos']) {
      for (const r of searchEntities(sqlite, 'c1', q, 20, 'player')) {
        expect(r.snippet).not.toContain(NEEDLE)
        expect(r.snippet).not.toContain('ritual')
        expect(r.snippet).not.toContain('inocentes')
        expect(r.snippet).not.toContain('secret')
      }
    }
  })

  it('still finds the entity by its public text', () => {
    expect(searchEntities(sqlite, 'c1', 'vecinos', 20, 'player')).toHaveLength(1)
    expect(searchEntities(sqlite, 'c1', 'Aguirre', 20, 'player')).toHaveLength(1)
  })

  it('keeps the secret searchable for the Narrator, who wrote it', () => {
    const results = searchEntities(sqlite, 'c1', NEEDLE, 20, 'dm')
    expect(results).toHaveLength(1)
    expect(searchEntities(sqlite, 'c1', NEEDLE, 20, 'co_dm')).toHaveLength(1)
  })

  it('treats an editor as below the line, exactly as stripSecretBlocks does', () => {
    // ROLE_LEVEL: dm 5 > co_dm 4 > editor 3. stripSecretBlocks returns content intact only
    // at co_dm+, so an editor already receives filtered prose everywhere else in the API;
    // the index has to agree or the two disagree about the same content.
    expect(searchEntities(sqlite, 'c1', NEEDLE, 20, 'editor')).toEqual([])
    expect(searchEntities(sqlite, 'c1', NEEDLE, 20, 'visitor')).toEqual([])
  })

  /**
   * The confound that made `tests/integration/search-secret-leak.test.ts` read as a leak,
   * pinned here where it costs milliseconds to check.
   *
   * When a query happens to RESEMBLE an entity's name, the pre-existing trigram fuzzy
   * fallback returns that entity — it runs whenever the primary index yields fewer than
   * `FUZZY_FALLBACK_THRESHOLD` hits, which is exactly what a secret word now does for a
   * player. That is not an existence leak, and the distinction is worth an assertion
   * rather than a comment: `entity_trigrams` holds trigrams of NAME and ALIASES only,
   * never the body, so a player's result set is a function of public data alone. The
   * proof of that is the second half — a fuzzy hit carries the name as its excerpt and no
   * body text whatsoever, so nothing behind the fence can ride out on it.
   *
   * The integration fixture used the same timestamp in the needle and in the entity name
   * (11 shared trigrams, threshold 2). If a future edit reintroduces that, this test says
   * what it means.
   */
  it('a query resembling the NAME still matches, and carries no body text with it', () => {
    // 'aguirres' vs 'Casa de los Aguirre': a name resemblance, and a word absent from the
    // body in either copy of the index.
    const results = searchEntities(sqlite, 'c1', 'zzaguirrezz', 20, 'player')
    expect(results).toHaveLength(1)
    // The tell: a fuzzy hit's excerpt IS the name. No window over the body, secret or not.
    expect(results[0].snippet).toBe('Casa de los Aguirre')
    expect(results[0].snippet).not.toContain(NEEDLE)
    expect(results[0].snippet).not.toContain('relleno')

    // And the same query reaches the same entity for a Narrator: the fuzzy arm reads
    // name/aliases, which are identical in both copies, so it is not a role-scoped channel.
    expect(searchEntities(sqlite, 'c1', 'zzaguirrezz', 20, 'dm').map((r) => r.entityId)).toEqual([
      'e1',
    ])
  })
})
