import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { entityDetailPath } from '../../../app/utils/entity-routes'

describe('entityDetailPath', () => {
  const campaignId = 'c1'

  it.each([
    ['character', 'characters'],
    ['location', 'locations'],
    ['organization', 'organizations'],
    ['quest', 'quests'],
    ['session', 'sessions'],
    ['arc', 'arcs'],
  ])('routes type "%s" to /%s/:slug', (type, segment) => {
    expect(entityDetailPath(campaignId, type, 'my-slug')).toBe(
      `/campaigns/${campaignId}/${segment}/my-slug`,
    )
  })

  it('falls back to the generic entities page for a type with no dedicated page', () => {
    expect(entityDetailPath(campaignId, 'item', 'my-slug')).toBe(
      `/campaigns/${campaignId}/entities/my-slug`,
    )
  })

  it('falls back to the generic entities page when type is undefined', () => {
    expect(entityDetailPath(campaignId, undefined, 'my-slug')).toBe(
      `/campaigns/${campaignId}/entities/my-slug`,
    )
  })

  it('every entity type registered for a campaign resolves to a page that EXISTS', () => {
    // The regression this guards: `EntityRelationsPanel.vue` built the segment as `${type}s`, so
    // lore -> /lores/, note -> /notes/, event -> /events/ and faction -> /factions/ were dead
    // links. A real session page linked to /lores/la-vieja-del-maniqui and 404ed. The helper's
    // fallback is what makes all of them land somewhere real.
    const registered = [
      'character',
      'event',
      'faction',
      'item',
      'location',
      'lore',
      'note',
      'quest',
      'session',
    ]
    const pages = resolve(__dirname, '../../../app/pages/campaigns/[id]')
    const dead = registered.filter((type) => {
      const segment = entityDetailPath(campaignId, type, 'x').split('/')[3]
      return !existsSync(resolve(pages, segment))
    })
    expect(dead).toEqual([])
  })

  it('nothing in app/ builds the segment by appending s to the type', () => {
    // EntityPopover and SearchCommand already used the helper; EntityRelationsPanel was the only
    // bypass. The mapping was never missing — one component just did not use it.
    const root = resolve(__dirname, '../../../app')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = resolve(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (
          /\.(vue|ts)$/.test(e.name) &&
          /\$\{[A-Za-z.]*[Tt]ype\}s\//.test(readFileSync(p, 'utf-8'))
        )
          offenders.push(e.name)
      }
    }
    walk(root)
    expect(offenders).toEqual([])
  })
})
