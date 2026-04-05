import { describe, it, expect, vi, beforeEach } from 'vitest'
import { canUserAccessEntity } from '../../server/utils/permissions'

// Mock the database — canUserAccessEntity does .select().from().where().get()
const mockGet = vi.fn()
const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({ get: mockGet }),
    }),
  }),
}

describe('canUserAccessEntity', () => {
  beforeEach(() => {
    mockGet.mockReset()
    // Default: no entity-level overrides
    mockGet.mockReturnValue(undefined)
  })

  it('admin bypasses all checks', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'admin',
      'player',
      'entity1',
      'dm_only',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('DM can view dm_only entity', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'dm',
      'entity1',
      'dm_only',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('co_dm can view dm_only entity', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'co_dm',
      'entity1',
      'dm_only',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('player cannot view dm_only entity', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'player',
      'entity1',
      'dm_only',
      'other-user',
      'view',
    )
    expect(result).toBe(false)
  })

  it('player can view members entity', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'player',
      'entity1',
      'members',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('visitor cannot view members entity', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'visitor',
      'entity1',
      'members',
      'other-user',
      'view',
    )
    expect(result).toBe(false)
  })

  it('private entity visible only to creator', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'player',
      'entity1',
      'private',
      'user1',
      'view',
    )
    expect(result).toBe(true)
  })

  it('private entity not visible to non-creator', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'player',
      'entity1',
      'private',
      'other-user',
      'view',
    )
    expect(result).toBe(false)
  })

  it('specific_users returns false (checked separately via entitySpecificViewers)', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'player',
      'entity1',
      'specific_users',
      'other-user',
      'view',
    )
    expect(result).toBe(false)
  })

  it('entity-level user override: allow overrides default deny', async () => {
    // First call (user override) returns an allow record
    mockGet.mockReturnValueOnce({ effect: 'allow' })
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'player',
      'entity1',
      'dm_only',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('entity-level user override: deny overrides default allow', async () => {
    mockGet.mockReturnValueOnce({ effect: 'deny' })
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'dm',
      'entity1',
      'public',
      'other-user',
      'view',
    )
    expect(result).toBe(false)
  })

  it('entity-level role override: used when no user override', async () => {
    // First call (user override) returns undefined, second (role override) returns allow
    mockGet.mockReturnValueOnce(undefined).mockReturnValueOnce({ effect: 'allow' })
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      'visitor',
      'entity1',
      'dm_only',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('non-member with no campaignRole can only view public entities', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      null,
      'entity1',
      'public',
      'other-user',
      'view',
    )
    expect(result).toBe(true)
  })

  it('non-member cannot view members entity', async () => {
    const result = await canUserAccessEntity(
      mockDb as never,
      'user1',
      'user',
      null,
      'entity1',
      'members',
      'other-user',
      'view',
    )
    expect(result).toBe(false)
  })
})
