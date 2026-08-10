import { describe, it, expect } from 'vitest'
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
})
