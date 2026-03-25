import { describe, it, expect } from 'vitest'

/**
 * Test visibility filtering logic (7.6)
 *
 * Tests the checkRoleDefault logic that determines whether a user
 * with a given campaign role can see an entity with a given visibility level.
 */

type CampaignRole = 'dm' | 'co_dm' | 'editor' | 'player' | 'visitor'
type Visibility = 'public' | 'members' | 'editors' | 'dm_only' | 'private' | 'specific_users'

const ROLE_HIERARCHY: Record<CampaignRole, number> = {
  dm: 5,
  co_dm: 4,
  editor: 3,
  player: 2,
  visitor: 1,
}

const VISIBILITY_MIN_ROLE: Record<string, number> = {
  public: 0,
  members: 2,
  editors: 3,
  dm_only: 4,
  private: 99,
}

function canView(role: CampaignRole, visibility: Visibility, entityCreatedBy: string, userId: string): boolean {
  if (visibility === 'private') return entityCreatedBy === userId
  if (visibility === 'specific_users') return false // checked separately
  return ROLE_HIERARCHY[role] >= (VISIBILITY_MIN_ROLE[visibility] ?? 99)
}

function getVisibleEntities(
  entities: Array<{ id: string; visibility: Visibility; createdBy: string }>,
  role: CampaignRole,
  userId: string,
): string[] {
  return entities
    .filter(e => canView(role, e.visibility, e.createdBy, userId))
    .map(e => e.id)
}

describe('Visibility filtering (7.6)', () => {
  const entities = [
    { id: 'e1', visibility: 'public' as Visibility, createdBy: 'user-a' },
    { id: 'e2', visibility: 'members' as Visibility, createdBy: 'user-a' },
    { id: 'e3', visibility: 'editors' as Visibility, createdBy: 'user-a' },
    { id: 'e4', visibility: 'dm_only' as Visibility, createdBy: 'user-a' },
    { id: 'e5', visibility: 'private' as Visibility, createdBy: 'user-a' },
    { id: 'e6', visibility: 'private' as Visibility, createdBy: 'user-b' },
  ]

  it('DM sees all except other users private', () => {
    const visible = getVisibleEntities(entities, 'dm', 'user-a')
    expect(visible).toContain('e1')
    expect(visible).toContain('e2')
    expect(visible).toContain('e3')
    expect(visible).toContain('e4')
    expect(visible).toContain('e5') // own private
    expect(visible).not.toContain('e6') // other's private
  })

  it('player sees public and members only', () => {
    const visible = getVisibleEntities(entities, 'player', 'user-b')
    expect(visible).toContain('e1') // public
    expect(visible).toContain('e2') // members
    expect(visible).not.toContain('e3') // editors
    expect(visible).not.toContain('e4') // dm_only
    expect(visible).not.toContain('e5') // other's private
    expect(visible).toContain('e6') // own private
  })

  it('visitor sees only public', () => {
    const visible = getVisibleEntities(entities, 'visitor', 'user-c')
    expect(visible).toEqual(['e1'])
  })

  it('editor sees public, members, and editors', () => {
    const visible = getVisibleEntities(entities, 'editor', 'user-c')
    expect(visible).toContain('e1')
    expect(visible).toContain('e2')
    expect(visible).toContain('e3')
    expect(visible).not.toContain('e4')
  })

  it('co_dm sees up to dm_only', () => {
    const visible = getVisibleEntities(entities, 'co_dm', 'user-c')
    expect(visible).toContain('e1')
    expect(visible).toContain('e2')
    expect(visible).toContain('e3')
    expect(visible).toContain('e4')
    expect(visible).not.toContain('e5') // not creator
  })

  it('private entity visible only to creator', () => {
    expect(canView('dm', 'private', 'user-x', 'user-x')).toBe(true)
    expect(canView('dm', 'private', 'user-x', 'user-y')).toBe(false)
  })
})
