import { describe, it, expect } from 'vitest'
import { startupBackfillsEnabled } from '../../../server/utils/startup-backfills'

/**
 * The escape hatch that lets a developer boot `nuxt dev` (and therefore run
 * `npm run test:integration`) on a machine whose database still has thousands of entities
 * pending an embedding. The dangerous failure mode is the WRONG one being easy to hit: a
 * value that accidentally reads as "disabled" would silently turn production's one-time
 * migrations off, and nothing would fail visibly — the indexes would just stay incomplete.
 * Hence the table: only the exact string `'false'` disables it.
 */
describe('startupBackfillsEnabled', () => {
  const cases: [string, Record<string, string | undefined>, boolean][] = [
    ['unset — the default, and what production runs', {}, true],
    ['explicitly false', { STARTUP_BACKFILLS_ENABLED: 'false' }, false],
    ['explicitly true', { STARTUP_BACKFILLS_ENABLED: 'true' }, true],
    ['empty string is not "false"', { STARTUP_BACKFILLS_ENABLED: '' }, true],
    ['"0" is not "false"', { STARTUP_BACKFILLS_ENABLED: '0' }, true],
    ['"no" is not "false"', { STARTUP_BACKFILLS_ENABLED: 'no' }, true],
    ['"FALSE" is not "false" — case matters', { STARTUP_BACKFILLS_ENABLED: 'FALSE' }, true],
    ['" false" with whitespace is not "false"', { STARTUP_BACKFILLS_ENABLED: ' false' }, true],
  ]

  for (const [label, env, expected] of cases) {
    it(`${label} -> ${expected ? 'runs' : 'skips'} the backfills`, () => {
      expect(startupBackfillsEnabled(env)).toBe(expected)
    })
  }

  it('reads process.env when no environment is passed', () => {
    const previous = process.env.STARTUP_BACKFILLS_ENABLED
    try {
      delete process.env.STARTUP_BACKFILLS_ENABLED
      expect(startupBackfillsEnabled()).toBe(true)
      process.env.STARTUP_BACKFILLS_ENABLED = 'false'
      expect(startupBackfillsEnabled()).toBe(false)
    } finally {
      if (previous === undefined) delete process.env.STARTUP_BACKFILLS_ENABLED
      else process.env.STARTUP_BACKFILLS_ENABLED = previous
    }
  })
})

/**
 * The plugin has to actually CONSULT the helper, and it has to gate all three backfills
 * rather than only the loud one. A source-level assertion because the alternative is booting
 * Nitro, and because the defect this guards against is a future edit adding a fourth backfill
 * outside the gate.
 */
describe('server/plugins/watcher.ts honours the escape hatch', () => {
  it('gates every backfill call on the helper', async () => {
    const { readFileSync } = await import('fs')
    const src = readFileSync('server/plugins/watcher.ts', 'utf8')

    expect(src).toContain("from '../utils/startup-backfills'")
    expect(src).toMatch(/const runBackfills = startupBackfillsEnabled\(\)/)

    // Every backfill invocation must sit inside a `runBackfills` guard. Checked by finding
    // each call and requiring a guard between the helper's declaration and that call.
    const calls = [...src.matchAll(/backfill[A-Za-z]*\(/g)].map((m) => m.index!)
    expect(calls.length).toBeGreaterThanOrEqual(3)
    const declaration = src.indexOf('const runBackfills =')
    for (const call of calls) {
      const between = src.slice(declaration, call)
      expect(between).toMatch(/(if \(runBackfills|runBackfills &&)/)
    }
  })
})
