import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/entity.js'), 'utf-8')

describe('entity create — type validation', () => {
  // The CLI used to write whatever string it was given. `--type npc` produced the only `npc`
  // entity in a campaign whose registered types are character/event/faction/item/location/lore/
  // note/quest/session — a record the UI could not categorise, reachable only via the generic page.

  it('fetches the campaign entity types before creating', () => {
    expect(source).toContain('/entity-types')
  })

  it('refuses a type the campaign does not declare', () => {
    expect(source).toContain('unknown entity type')
    expect(source).toContain('!valid.includes(opts.type)')
  })

  it('lists the registered types in the error, so the fix is obvious', () => {
    expect(source).toContain('Registered types:')
  })

  it('validates BEFORE the POST, so a refusal writes nothing', () => {
    const guard = source.indexOf('!valid.includes(opts.type)')
    const post = source.indexOf('await post(`/api/campaigns/${opts.campaign}/entities`')
    expect(guard).toBeGreaterThan(-1)
    expect(post).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(post)
  })

  it('exits via exitCode, not process.exit, because the guard runs after an await', () => {
    // `process.exit()` with the entity-types socket still open aborted the process with a libuv
    // assertion and exit 127 on Windows. The sibling guards exit cleanly only because they run
    // before any network call.
    const guard = source.indexOf('unknown entity type')
    const tail = source.slice(guard, guard + 600)
    expect(tail).toContain('process.exitCode = 1')
    expect(tail).not.toContain('process.exit(1)')
  })

  it('tolerates a server that reports no types rather than blocking every create', () => {
    expect(source).toContain('valid.length &&')
  })

  it('help no longer advertises npc, which is not universally registered', () => {
    expect(source).not.toContain('e.g. location, faction, npc')
  })
})
