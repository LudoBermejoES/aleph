import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/session.js'), 'utf-8')

describe('CLI session update arc/chapter flags', () => {
  it('declares --arc and --chapter options', () => {
    expect(source).toContain("'--arc <slug>'")
    expect(source).toContain("'--chapter <slug>'")
  })

  it('documents that an empty string unsets each of them', () => {
    // --arc unsets arc (and cascades to the chapter server-side)
    expect(source).toContain('Arc slug (empty string to unset, which clears the chapter too)')
    // --chapter unsets only the chapter
    expect(source).toContain('empty string to unset just the chapter')
  })

  it('maps --arc/--chapter to arcSlug/chapterSlug for server-side resolution', () => {
    expect(source).toContain('body.arcSlug = opts.arc')
    expect(source).toContain('body.chapterSlug = opts.chapter')
  })

  it("uses !== undefined so --arc '' sends an empty string rather than omitting the field", () => {
    expect(source).toContain('if (opts.arc !== undefined) body.arcSlug = opts.arc')
    expect(source).toContain('if (opts.chapter !== undefined) body.chapterSlug = opts.chapter')
  })

  it('counts --arc and --chapter in the at-least-one-field guard message', () => {
    expect(source).toContain(
      'Provide at least one field to update (--title, --date, --status, --subcampaign, --arc, --chapter)',
    )
  })

  it('supports --subcampaign with --group retained as a deprecated alias', () => {
    expect(source).toContain("'--subcampaign <slug>', 'Move to a different sub-campaign (by slug)'")
    expect(source).toContain("'--group <slug>', 'Deprecated alias for --subcampaign'")
    expect(source).toContain('const subCampaignSlug = opts.subcampaign ?? opts.group')
    expect(source).toContain(
      'if (subCampaignSlug !== undefined) body.subCampaignSlug = subCampaignSlug',
    )
  })
})

describe('CLI session create arc/chapter flags', () => {
  it('sends arcSlug and chapterSlug in the POST body', () => {
    expect(source).toContain('arcSlug: opts.arc')
    expect(source).toContain('chapterSlug: opts.chapter')
  })
})

describe('CLI session list arc filter and columns', () => {
  it('forwards --arc as the arcSlug query param', () => {
    expect(source).toContain("if (opts.arc) params.set('arcSlug', opts.arc)")
  })

  it('still forwards subCampaignSlug (via --subcampaign or the --group alias) and pagination', () => {
    expect(source).toContain("if (subCampaignSlug) params.set('subCampaignSlug', subCampaignSlug)")
    expect(source).toContain("params.set('page', opts.page)")
    expect(source).toContain("params.set('pageSize', opts.limit)")
  })

  it('shows arc and chapter names in the table, not ids', () => {
    expect(source).toContain('arc: s.arcName')
    expect(source).toContain('chapter: s.chapterName')
    expect(source).not.toContain('arc: s.arcId')
    expect(source).not.toContain('chapter: s.chapterId')
  })
})

describe('CLI session show arc/chapter display', () => {
  it('prints arc and chapter rows', () => {
    expect(source).toContain('arc: arcName')
    expect(source).toContain('chapter: chapterName')
  })

  it('prefers the server projection and only falls back to a lookup', () => {
    expect(source).toContain('session.arcName !== undefined')
  })
})
