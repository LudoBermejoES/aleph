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
