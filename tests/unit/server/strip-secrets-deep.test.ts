import { describe, it, expect } from 'vitest'
import { stripSecretBlocksDeep } from '../../../server/services/content'

const PUBLIC = 'Public text.'
const NEEDLE = 'DM-ONLY-NEEDLE'
const SECRET = `${PUBLIC}\n\n:::secret{.dm}\n${NEEDLE}\n:::\n`

describe('stripSecretBlocksDeep — the walk', () => {
  it('strips a bare string', () => {
    expect(stripSecretBlocksDeep(SECRET, 'player')).not.toContain(NEEDLE)
    expect(stripSecretBlocksDeep(SECRET, 'player')).toContain(PUBLIC)
  })

  it('strips every string in an object, named or not', () => {
    const out = stripSecretBlocksDeep(
      { backstory: SECRET, history: SECRET, aFieldNobodyThoughtOf: SECRET, name: 'Aria' },
      'player',
    )
    expect(out.backstory).not.toContain(NEEDLE)
    expect(out.history).not.toContain(NEEDLE)
    expect(out.aFieldNobodyThoughtOf).not.toContain(NEEDLE)
    expect(out.name).toBe('Aria')
  })

  it('reaches arbitrarily deep — arrays inside objects inside arrays', () => {
    const out = stripSecretBlocksDeep({ sessions: [{ notes: [{ body: SECRET }] }] }, 'player')
    expect(JSON.stringify(out)).not.toContain(NEEDLE)
  })

  it('leaves non-string scalars alone', () => {
    const input = { n: 3, b: true, nul: null, u: undefined }
    expect(stripSecretBlocksDeep(input, 'player')).toEqual(input)
  })

  it('does not rebuild Dates or Buffers', () => {
    const date = new Date('2020-01-01')
    const buf = Buffer.from('x')
    const out = stripSecretBlocksDeep({ date, buf }, 'player')
    expect(out.date).toBe(date)
    expect(out.buf).toBe(buf)
  })

  it('returns the SAME object when nothing needed stripping', () => {
    const input = { name: 'Aria', tags: ['pc'] }
    expect(stripSecretBlocksDeep(input, 'player')).toBe(input)
  })

  it('survives a cycle instead of hanging', () => {
    const a: Record<string, unknown> = { text: SECRET }
    a.self = a
    const out = stripSecretBlocksDeep(a, 'player') as Record<string, unknown>
    expect(out.text).not.toContain(NEEDLE)
  })
})

describe('stripSecretBlocksDeep — roles', () => {
  it('returns the payload untouched, by identity, for dm and co_dm', () => {
    const input = { backstory: SECRET }
    expect(stripSecretBlocksDeep(input, 'dm')).toBe(input)
    expect(stripSecretBlocksDeep(input, 'co_dm')).toBe(input)
    expect(stripSecretBlocksDeep(input, 'dm').backstory).toContain(':::secret')
  })

  it('strips for editor, player and visitor — editor is BELOW co_dm', () => {
    for (const role of ['editor', 'player', 'visitor']) {
      expect(stripSecretBlocksDeep({ x: SECRET }, role).x, role).not.toContain(NEEDLE)
    }
  })

  it('an unknown role is treated as the least privileged, not as a DM', () => {
    expect(stripSecretBlocksDeep({ x: SECRET }, 'nonsense').x).not.toContain(NEEDLE)
  })

  it('honours a role-scoped block: an editor keeps :::secret{.editor}', () => {
    const editorBlock = `${PUBLIC}\n\n:::secret{.editor}\nEditor notes.\n:::\n`
    expect(stripSecretBlocksDeep({ x: editorBlock }, 'editor').x).toContain('Editor notes.')
    expect(stripSecretBlocksDeep({ x: editorBlock }, 'player').x).not.toContain('Editor notes.')
  })
})

describe('stripSecretBlocksDeep — safe to run over already-filtered output', () => {
  /**
   * The response hook runs after handlers that already stripped. Both properties below are
   * what make that a no-op rather than a second, wrong decision.
   */
  it('is idempotent at the same role', () => {
    const once = stripSecretBlocksDeep({ x: SECRET }, 'player')
    expect(stripSecretBlocksDeep(once, 'player')).toEqual(once)
  })

  it('cannot re-hide a revealed block, because a reveal removes the wrapper', () => {
    const withId = `${PUBLIC}\n\n:::secret{.dm #blk1}\n${NEEDLE}\n:::\n`
    const revealed = stripSecretBlocksDeep({ x: withId }, 'player', new Set(['blk1']))
    expect(revealed.x).toContain(NEEDLE)
    // Second pass, no reveal set at all — the wrapper is gone, so there is nothing to strip.
    expect(stripSecretBlocksDeep(revealed, 'player').x).toContain(NEEDLE)
  })
})
