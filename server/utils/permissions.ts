import { eq, and, or, inArray } from 'drizzle-orm'
import type { Column, SQL } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { campaignMembers, campaignMemberPermissions } from '../db/schema/campaign-members'
import { entityPermissions, entitySpecificViewers } from '../db/schema/permissions'

export type SystemRole = 'admin' | 'user'
export type CampaignRole = 'dm' | 'co_dm' | 'editor' | 'player' | 'visitor'
export type Permission = 'view' | 'edit' | 'delete'
export type PermissionEffect = 'allow' | 'deny'
export type Visibility = 'public' | 'members' | 'editors' | 'dm_only' | 'private' | 'specific_users'

export type NamedPermission =
  | 'quest_keeper'
  | 'lore_keeper'
  | 'cartographer'
  | 'shopkeeper'
  | 'chronicler'
  | 'treasurer'

export const ROLE_HIERARCHY: Record<CampaignRole, number> = {
  dm: 5,
  co_dm: 4,
  editor: 3,
  player: 2,
  visitor: 1,
}

export const ROLE_LEVEL = ROLE_HIERARCHY

export const VISIBILITY_MIN_ROLE: Record<string, number> = {
  public: 0,
  members: 2,    // player+
  editors: 3,    // editor+
  dm_only: 4,    // co_dm+
  private: 99,   // creator only
}

export interface UserContext {
  userId: string
  systemRole: SystemRole
}

export interface CampaignContext extends UserContext {
  campaignId: string
  campaignRole: CampaignRole
  namedPermissions: Set<string>
}

/**
 * Check if a campaign role has sufficient rank for an operation.
 */
export function hasMinRole(role: CampaignRole, minRole: CampaignRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}

/**
 * Append a Drizzle visibility condition to a conditions array.
 * No-op for co_dm and above (they can see everything).
 * Imported by list endpoints that build SQL WHERE conditions arrays.
 */
export function buildVisibilityFilter(
  role: CampaignRole,
  userId: string,
  conditions: SQL[],
  visibilityCol: Column,
  createdByCol: Column,
): void {
  if (hasMinRole(role, 'co_dm')) return
  const userLevel = ROLE_LEVEL[role] ?? 0
  const visibleLevels = Object.entries(VISIBILITY_MIN_ROLE)
    .filter(([, minLevel]) => userLevel >= minLevel)
    .map(([vis]) => vis)
  conditions.push(
    or(
      inArray(visibilityCol, visibleLevels),
      and(eq(visibilityCol, 'private'), eq(createdByCol, userId)),
    )!,
  )
}

/**
 * Resolve whether a user can perform an action on an entity.
 * Resolution order: entity-level user override > entity-level role override > campaign role default.
 */
export async function canUserAccessEntity(
  db: BetterSQLite3Database,
  userId: string,
  systemRole: SystemRole,
  campaignRole: CampaignRole | null,
  entityId: string,
  entityVisibility: Visibility,
  entityCreatedBy: string,
  permission: Permission,
): Promise<boolean> {
  // System admin bypasses everything
  if (systemRole === 'admin') return true

  // Not a campaign member and not public
  if (!campaignRole) {
    return permission === 'view' && entityVisibility === 'public'
  }

  // 1. Entity-level user-specific override (highest priority)
  const userOverride = db.select()
    .from(entityPermissions)
    .where(and(
      eq(entityPermissions.entityId, entityId),
      eq(entityPermissions.targetUserId, userId),
      eq(entityPermissions.permission, permission),
    ))
    .get()

  if (userOverride) {
    return userOverride.effect === 'allow'
  }

  // 2. Entity-level role override
  const roleOverride = db.select()
    .from(entityPermissions)
    .where(and(
      eq(entityPermissions.entityId, entityId),
      eq(entityPermissions.targetRole, campaignRole),
      eq(entityPermissions.permission, permission),
    ))
    .get()

  if (roleOverride) {
    return roleOverride.effect === 'allow'
  }

  // 3. Campaign role defaults
  return checkRoleDefault(campaignRole, entityVisibility, entityCreatedBy, userId, permission)
}

function checkRoleDefault(
  role: CampaignRole,
  visibility: Visibility,
  entityCreatedBy: string,
  userId: string,
  permission: Permission,
): boolean {
  if (permission === 'view') {
    if (visibility === 'private') return entityCreatedBy === userId
    if (visibility === 'specific_users') return false // checked via entity_specific_viewers separately
    return ROLE_HIERARCHY[role] >= (VISIBILITY_MIN_ROLE[visibility] ?? 99)
  }

  if (permission === 'edit') {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.editor
  }

  if (permission === 'delete') {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.co_dm
  }

  return false
}

/**
 * Check if a user has a specific named permission in a campaign.
 */
export async function hasNamedPermission(
  db: BetterSQLite3Database,
  campaignMemberId: string,
  permission: NamedPermission,
): Promise<boolean> {
  const result = db.select()
    .from(campaignMemberPermissions)
    .where(and(
      eq(campaignMemberPermissions.campaignMemberId, campaignMemberId),
      eq(campaignMemberPermissions.permission, permission),
    ))
    .get()

  return !!result
}

// --- LRU Permission Cache ---

interface CacheEntry {
  result: boolean
  expiresAt: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 1000

const cache = new Map<string, CacheEntry>()

function cacheKey(userId: string, entityId: string, permission: Permission): string {
  return `${userId}:${entityId}:${permission}`
}

export function getCachedPermission(userId: string, entityId: string, permission: Permission): boolean | null {
  const key = cacheKey(userId, entityId, permission)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.result
}

export function setCachedPermission(userId: string, entityId: string, permission: Permission, result: boolean): void {
  // Evict oldest entries if cache is full
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }

  cache.set(cacheKey(userId, entityId, permission), {
    result,
    expiresAt: Date.now() + CACHE_TTL,
  })
}

export function invalidatePermissionCache(userId?: string, entityId?: string): void {
  if (!userId && !entityId) {
    cache.clear()
    return
  }

  for (const key of cache.keys()) {
    if (userId && key.startsWith(userId + ':')) {
      cache.delete(key)
    } else if (entityId && key.includes(':' + entityId + ':')) {
      cache.delete(key)
    }
  }
}
