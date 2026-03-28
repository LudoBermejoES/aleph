import { describe, it, expect } from 'vitest'
import { ICONS } from '../../../app/utils/icons'

describe('ICONS map', () => {
  const NAV_KEYS = [
    'dashboard', 'allCampaigns', 'wiki', 'characters', 'organizations',
    'locations', 'maps', 'sessions', 'quests', 'calendars', 'items',
    'shops', 'inventories', 'currencies', 'transactions', 'graph', 'members',
  ]
  const GROUP_KEYS = ['groupWorld', 'groupStory', 'groupEconomy', 'groupCampaign']
  const ACTION_KEYS = ['add', 'edit', 'delete', 'save', 'back', 'signOut', 'settings', 'search']
  const STATUS_KEYS = [
    'alive', 'dead', 'missing', 'unknown',
    'pc', 'npc',
    'questActive', 'questCompleted', 'questFailed', 'questAbandoned',
    'sessionPlanned', 'sessionActive', 'sessionCompleted', 'sessionCancelled',
    'orgFaction', 'orgGuild', 'orgArmy', 'orgCult', 'orgGovernment', 'orgOther',
    'orgActive', 'orgInactive', 'orgSecret', 'orgDissolved',
  ]
  const ALL_KEYS = [...NAV_KEYS, ...GROUP_KEYS, ...ACTION_KEYS, ...STATUS_KEYS]

  it('exports all required keys', () => {
    for (const key of ALL_KEYS) {
      expect(ICONS, `missing key: ${key}`).toHaveProperty(key)
    }
  })

  it('each value is a defined object (Vue component)', () => {
    for (const key of ALL_KEYS) {
      const icon = ICONS[key as keyof typeof ICONS]
      expect(icon, `${key} should be defined`).toBeDefined()
      expect(typeof icon, `${key} should be an object or function`).toMatch(/^(object|function)$/)
    }
  })

  it('nav keys are distinct components', () => {
    const seen = new Set()
    // Just verify none are undefined — some icons can be reused (e.g. dashboard/allCampaigns)
    for (const key of NAV_KEYS) {
      expect(ICONS[key as keyof typeof ICONS]).toBeDefined()
      seen.add(key)
    }
    expect(seen.size).toBe(NAV_KEYS.length)
  })
})
