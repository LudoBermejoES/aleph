import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/session.js'), 'utf-8')

describe('CLI session attendance xp command', () => {
  it('declares the xp subcommand with --user, --xp, and --clear', () => {
    expect(source).toContain("'xp <slug>'")
    expect(source).toContain("'--user <userId>'")
    expect(source).toContain("'--xp <n>'")
    expect(source).toContain("'--clear'")
  })

  it('requires exactly one of --xp or --clear before calling the server', () => {
    expect(source).toContain('Error: provide --xp <n> or --clear')
    expect(source).toContain('Error: --xp and --clear are mutually exclusive')
  })

  it('validates --xp is a non-negative whole number', () => {
    expect(source).toContain('Error: --xp must be a whole number >= 0')
    expect(source).toContain('Number.isInteger(xp)')
  })

  it('sends xp: null for --clear', () => {
    expect(source).toContain('let xp = null')
  })

  it('PATCHes the per-user attendance route with { xp }', () => {
    expect(source).toContain(
      'await patch(`/api/campaigns/${opts.campaign}/sessions/${slug}/attendance/${opts.user}`',
    )
    // The xp subcommand's PATCH call is the only one that passes a bare `xp` body key.
    const xpBlockStart = source.indexOf("command('xp <slug>')")
    const xpBlock = source.slice(xpBlockStart, xpBlockStart + 1400)
    expect(xpBlock).toContain('await patch(')
    expect(xpBlock).toContain('xp,')
  })
})
