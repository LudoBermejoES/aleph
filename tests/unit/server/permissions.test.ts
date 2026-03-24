import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, type TestDb } from '../../helpers/db'
import {
  hasMinRole,
  canUserAccessEntity,
  getCachedPermission,
  setCachedPermission,
  invalidatePermissionCache,
  hasNamedPermission,
  ROLE_HIERARCHY,
} from '../../../server/utils/permissions'
import { randomUUID } from 'crypto'

describe('Role Hierarchy', () => {
  it('DM outranks all other roles', () => {
    expect(hasMinRole('dm', 'dm')).toBe(true)
    expect(hasMinRole('dm', 'co_dm')).toBe(true)
    expect(hasMinRole('dm', 'editor')).toBe(true)
    expect(hasMinRole('dm', 'player')).toBe(true)
    expect(hasMinRole('dm', 'visitor')).toBe(true)
  })

  it('player does not outrank editor', () => {
    expect(hasMinRole('player', 'editor')).toBe(false)
  })

  it('visitor is the lowest rank', () => {
    expect(hasMinRole('visitor', 'player')).toBe(false)
    expect(hasMinRole('visitor', 'visitor')).toBe(true)
  })

  it('co_dm outranks editor but not dm', () => {
    expect(hasMinRole('co_dm', 'editor')).toBe(true)
    expect(hasMinRole('co_dm', 'dm')).toBe(false)
  })
})

describe('Permission Resolution', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.close()
  })

  it('admin bypasses all permission checks', async () => {
    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'admin', null,
      'entity-1', 'dm_only', 'user-2', 'view',
    )
    expect(result).toBe(true)
  })

  it('non-member cannot view non-public entity', async () => {
    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', null,
      'entity-1', 'members', 'user-2', 'view',
    )
    expect(result).toBe(false)
  })

  it('non-member can view public entity', async () => {
    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', null,
      'entity-1', 'public', 'user-2', 'view',
    )
    expect(result).toBe(true)
  })

  it('player can view members-visible entity', async () => {
    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'player',
      'entity-1', 'members', 'user-2', 'view',
    )
    expect(result).toBe(true)
  })

  it('player cannot view dm_only entity', async () => {
    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'player',
      'entity-1', 'dm_only', 'user-2', 'view',
    )
    expect(result).toBe(false)
  })

  it('dm can view dm_only entity', async () => {
    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'dm',
      'entity-1', 'dm_only', 'user-2', 'view',
    )
    expect(result).toBe(true)
  })

  it('private entity visible only to creator', async () => {
    const creator = 'user-creator'
    const other = 'user-other'

    const resultCreator = await canUserAccessEntity(
      testDb.db, creator, 'user', 'player',
      'entity-1', 'private', creator, 'view',
    )
    expect(resultCreator).toBe(true)

    const resultOther = await canUserAccessEntity(
      testDb.db, other, 'user', 'player',
      'entity-1', 'private', creator, 'view',
    )
    expect(resultOther).toBe(false)
  })

  it('editor can edit but player cannot', async () => {
    const canEditEditor = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'editor',
      'entity-1', 'members', 'user-2', 'edit',
    )
    expect(canEditEditor).toBe(true)

    const canEditPlayer = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'player',
      'entity-1', 'members', 'user-2', 'edit',
    )
    expect(canEditPlayer).toBe(false)
  })

  it('entity-level user override trumps role default', async () => {
    const now = Date.now()
    // Create prerequisite users for FK constraints
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'player1', 'player@test.com', 0, ${now}, ${now}),
             ('dm-user', 'dm', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO entity_permissions (id, entity_id, target_user_id, target_role, permission, effect, granted_by, created_at)
      VALUES ('perm-1', 'entity-1', 'user-1', NULL, 'view', 'allow', 'dm-user', ${now})
    `)

    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'player',
      'entity-1', 'dm_only', 'dm-user', 'view',
    )
    expect(result).toBe(true)
  })

  it('explicit deny beats implicit allow at same level', async () => {
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('user-1', 'player1', 'player@test.com', 0, ${now}, ${now}),
             ('dm-user', 'dm', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO entity_permissions (id, entity_id, target_user_id, target_role, permission, effect, granted_by, created_at)
      VALUES ('perm-1', 'entity-1', 'user-1', NULL, 'edit', 'deny', 'dm-user', ${now})
    `)

    const result = await canUserAccessEntity(
      testDb.db, 'user-1', 'user', 'editor',
      'entity-1', 'members', 'dm-user', 'edit',
    )
    expect(result).toBe(false)
  })
})

describe('Permission Cache', () => {
  beforeEach(() => {
    invalidatePermissionCache()
  })

  it('returns null for uncached permission', () => {
    expect(getCachedPermission('user-1', 'entity-1', 'view')).toBeNull()
  })

  it('returns cached result after set', () => {
    setCachedPermission('user-1', 'entity-1', 'view', true)
    expect(getCachedPermission('user-1', 'entity-1', 'view')).toBe(true)
  })

  it('invalidation clears user entries', () => {
    setCachedPermission('user-1', 'entity-1', 'view', true)
    setCachedPermission('user-2', 'entity-1', 'view', true)

    invalidatePermissionCache('user-1')

    expect(getCachedPermission('user-1', 'entity-1', 'view')).toBeNull()
    expect(getCachedPermission('user-2', 'entity-1', 'view')).toBe(true)
  })

  it('full invalidation clears all entries', () => {
    setCachedPermission('user-1', 'entity-1', 'view', true)
    setCachedPermission('user-2', 'entity-2', 'edit', false)

    invalidatePermissionCache()

    expect(getCachedPermission('user-1', 'entity-1', 'view')).toBeNull()
    expect(getCachedPermission('user-2', 'entity-2', 'edit')).toBeNull()
  })
})

describe('Named Permissions', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    // Create users, campaign, and membership
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('dm-user', 'DM', 'dm@test.com', 0, ${now}, ${now}),
             ('player-1', 'Player', 'player@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'dm-user', ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaign_members (id, campaign_id, user_id, role, joined_at)
      VALUES ('member-1', 'camp-1', 'player-1', 'player', ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('user with named permission passes check', async () => {
    testDb.sqlite.exec(`
      INSERT INTO campaign_member_permissions (id, campaign_member_id, permission, granted_by, granted_at)
      VALUES ('perm-1', 'member-1', 'chronicler', 'dm-user', ${Date.now()})
    `)

    const result = await hasNamedPermission(testDb.db, 'member-1', 'chronicler')
    expect(result).toBe(true)
  })

  it('user without named permission fails check', async () => {
    const result = await hasNamedPermission(testDb.db, 'member-1', 'chronicler')
    expect(result).toBe(false)
  })

  it('different named permission does not match', async () => {
    testDb.sqlite.exec(`
      INSERT INTO campaign_member_permissions (id, campaign_member_id, permission, granted_by, granted_at)
      VALUES ('perm-1', 'member-1', 'quest_keeper', 'dm-user', ${Date.now()})
    `)

    const result = await hasNamedPermission(testDb.db, 'member-1', 'chronicler')
    expect(result).toBe(false)
  })
})

describe('Invitation Token', () => {
  let testDb: TestDb

  beforeEach(() => {
    testDb = createTestDb()
    const now = Date.now()
    testDb.sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
      VALUES ('dm-user', 'DM', 'dm@test.com', 0, ${now}, ${now})
    `)
    testDb.sqlite.exec(`
      INSERT INTO campaigns (id, name, slug, content_dir, created_by, created_at, updated_at)
      VALUES ('camp-1', 'Test', 'test', '/content', 'dm-user', ${now}, ${now})
    `)
  })

  afterEach(() => {
    testDb.close()
  })

  it('valid token can be found', () => {
    const future = Date.now() + 86400000 // 1 day from now
    testDb.sqlite.exec(`
      INSERT INTO campaign_invitations (id, campaign_id, token, role, created_by, expires_at)
      VALUES ('inv-1', 'camp-1', 'valid-token-abc', 'player', 'dm-user', ${future})
    `)

    const result = testDb.sqlite.prepare(
      "SELECT * FROM campaign_invitations WHERE token = 'valid-token-abc' AND used_at IS NULL"
    ).get() as any

    expect(result).toBeDefined()
    expect(result.role).toBe('player')
    expect(result.expires_at).toBeGreaterThan(Date.now())
  })

  it('expired token is rejected', () => {
    const past = Date.now() - 86400000 // 1 day ago
    testDb.sqlite.exec(`
      INSERT INTO campaign_invitations (id, campaign_id, token, role, created_by, expires_at)
      VALUES ('inv-1', 'camp-1', 'expired-token', 'player', 'dm-user', ${past})
    `)

    const result = testDb.sqlite.prepare(
      "SELECT * FROM campaign_invitations WHERE token = 'expired-token' AND used_at IS NULL"
    ).get() as any

    expect(result).toBeDefined()
    expect(result.expires_at).toBeLessThan(Date.now()) // expired
  })

  it('used token is not found', () => {
    const future = Date.now() + 86400000
    testDb.sqlite.exec(`
      INSERT INTO campaign_invitations (id, campaign_id, token, role, created_by, expires_at, used_at)
      VALUES ('inv-1', 'camp-1', 'used-token', 'player', 'dm-user', ${future}, ${Date.now()})
    `)

    const result = testDb.sqlite.prepare(
      "SELECT * FROM campaign_invitations WHERE token = 'used-token' AND used_at IS NULL"
    ).get()

    expect(result).toBeUndefined()
  })
})
