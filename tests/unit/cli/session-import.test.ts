import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { toSpanishDate } from '../../../cli/src/lib/date-utils.js'

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
  // ─── Sub-campaign placement (session-import-subcampaign) ────────────────────────────────
  // Before this, EVERY imported session landed in the campaign's default sub-campaign and the
  // import still printed success — a Berlin "La discoteca" session was created inside the mage
  // cabal's "La capilla" with nothing reporting it. These pin the three branches that close it.

  it('has --subcampaign option, matching list/create/update', () => {
    expect(source).toContain("'--subcampaign <slug>'")
  })

  it('keeps --group as the deprecated alias, as the sibling subcommands do', () => {
    expect(source).toContain("'--group <slug>'")
    expect(source).toContain('opts.subcampaign ?? opts.group')
  })

  it('passes the slug through when CREATING the session', () => {
    // same POST `session create` already uses, so no server change was needed
    expect(source).toMatch(/scheduledDate: dateStr,[\s\S]*?subCampaignSlug,/)
  })

  it('MOVES an existing session that sits in another sub-campaign', () => {
    expect(source).toContain('session.subCampaignSlug !== subCampaignSlug')
  })

  it('moves with PUT on the bare session route, not PATCH', () => {
    // PATCH is not routed on `/sessions/:slug`: it returns the Nuxt app shell and the client then
    // fails to JSON.parse it (verified against the live server). Note the attendance endpoint DOES
    // use PATCH, so this must assert the shape of the MOVE call rather than the absence of `patch`.
    expect(source).toContain('await put(`/api/campaigns/${opts.campaign}/sessions/${session.slug}`')
  })

  it('does NOT reassign `session` from the move response', () => {
    // That response has a different shape; reassigning left `session.slug` undefined and every
    // later content PUT failed with "Session not found".
    expect(source).not.toContain('session = await put(')
    expect(source).toContain('session.subCampaignSlug = subCampaignSlug')
  })

  it('always reports the resulting placement', () => {
    expect(source).toContain('sub-campaign: ')
  })

  it('prefers the requested slug over the response when reporting', () => {
    // The create response carries no subCampaign fields, so reporting from it alone printed
    // "(default)" for a session that HAD been placed correctly — a false report, worse than none.
    expect(source).toMatch(/session\.subCampaignName \|\| subCampaignSlug/)
  })
})
