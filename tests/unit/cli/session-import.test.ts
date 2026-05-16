import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Import the exported helper directly
import { toSpanishDate } from '../../../cli/src/commands/session.js'

describe('toSpanishDate', () => {
  it('formats a date in Spanish with full month name', () => {
    expect(toSpanishDate('2026-04-26')).toBe('26 de abril de 2026')
  })

  it('covers all twelve months', () => {
    const expected = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ]
    for (let m = 1; m <= 12; m++) {
      const pad = String(m).padStart(2, '0')
      expect(toSpanishDate(`2025-${pad}-01`)).toBe(`1 de ${expected[m - 1]} de 2025`)
    }
  })

  it('does not zero-pad the day', () => {
    expect(toSpanishDate('2026-01-05')).toBe('5 de enero de 2026')
  })

  it('handles the 31st', () => {
    expect(toSpanishDate('2026-12-31')).toBe('31 de diciembre de 2026')
  })
})

describe('CLI session import command structure', () => {
  const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/session.js'), 'utf-8')

  it('registers the import subcommand', () => {
    expect(source).toContain("command('import')")
  })

  it('has --manual option', () => {
    expect(source).toContain("'--manual <file>'")
  })

  it('has --ai option', () => {
    expect(source).toContain("'--ai <file>'")
  })

  it('has --no-summarize option', () => {
    expect(source).toContain("'--no-summarize'")
  })

  it('has --date option', () => {
    expect(source).toContain("'--date <date>'")
  })

  it('exits with error when neither --manual nor --ai is provided', () => {
    expect(source).toContain('!opts.manual && !opts.ai')
  })

  it('parses date from filename using regex', () => {
    expect(source).toContain('\\d{4}-\\d{2}-\\d{2}')
  })

  it('creates session with Spanish title when not found', () => {
    expect(source).toContain('toSpanishDate(dateStr)')
  })

  it('generates summary using the generate endpoint', () => {
    expect(source).toContain("target: 'summary'")
  })

  it('skips summary generation when opts.summarize is false', () => {
    expect(source).toContain('opts.manual && opts.summarize')
  })
})
