import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { parseSortOrder, sortOrderOrExit } from '../../../cli/src/lib/arcs.js'

const arcSource = readFileSync(resolve(__dirname, '../../../cli/src/commands/arc.js'), 'utf-8')
const chapterSource = readFileSync(
  resolve(__dirname, '../../../cli/src/commands/chapter.js'),
  'utf-8',
)

describe('parseSortOrder', () => {
  it('returns undefined when the flag was not supplied', () => {
    expect(parseSortOrder(undefined)).toBeUndefined()
  })

  it('parses a numeric string into a number (the API schema is z.number())', () => {
    expect(parseSortOrder('3')).toBe(3)
    expect(typeof parseSortOrder('3')).toBe('number')
  })

  it('accepts 0 and negative values', () => {
    expect(parseSortOrder('0')).toBe(0)
    expect(parseSortOrder('-2')).toBe(-2)
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseSortOrder(' 7 ')).toBe(7)
  })

  it('rejects a non-numeric value instead of sending NaN', () => {
    expect(() => parseSortOrder('abc')).toThrow(/--sort-order must be a number/)
  })

  it('rejects an empty value', () => {
    expect(() => parseSortOrder('')).toThrow(/--sort-order must be a number/)
  })

  it('rejects Infinity', () => {
    expect(() => parseSortOrder('Infinity')).toThrow(/--sort-order must be a number/)
  })
})

describe('sortOrderOrExit', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the number for a valid value', () => {
    expect(sortOrderOrExit('4')).toBe(4)
  })

  it('writes to stderr and exits non-zero for an invalid value', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    sortOrderOrExit('abc')
    expect(write).toHaveBeenCalledWith(expect.stringContaining('--sort-order must be a number'))
    expect(exit).toHaveBeenCalledWith(1)
  })
})

describe('arc command --sort-order wiring', () => {
  it('arc create and arc update both declare --sort-order', () => {
    const occurrences = arcSource.match(/'--sort-order <n>'/g) ?? []
    expect(occurrences.length).toBe(2)
  })

  it('parses the flag before sending it as sortOrder', () => {
    const matches = arcSource.match(/body\.sortOrder = sortOrderOrExit\(opts\.sortOrder\)/g) ?? []
    expect(matches.length).toBe(2)
  })

  it('arc list shows the sort order column', () => {
    expect(arcSource).toContain('sortOrder: a.sortOrder ?? 0')
  })

  it('arc create prints the slug from the response, with a lookup fallback', () => {
    expect(arcSource).toContain('data.slug ?? (await lookupArcSlug(opts.campaign, data.id))')
    expect(arcSource).not.toContain('(${data.slug})')
  })
})

describe('chapter command --sort-order wiring', () => {
  it('chapter create and chapter update both declare --sort-order', () => {
    const occurrences = chapterSource.match(/'--sort-order <n>'/g) ?? []
    expect(occurrences.length).toBe(2)
  })

  it('parses the flag before sending it as sortOrder', () => {
    const matches =
      chapterSource.match(/body\.sortOrder = sortOrderOrExit\(opts\.sortOrder\)/g) ?? []
    expect(matches.length).toBe(2)
  })

  it('chapter create prints the slug from the response, with a lookup fallback', () => {
    expect(chapterSource).toContain(
      'data.slug ?? (await lookupChapterSlug(opts.campaign, data.id))',
    )
  })
})
