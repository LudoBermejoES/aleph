import { auditLogger } from './logger'
import type { H3Event } from 'h3'

export type AuditAction =
  // Auth events
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'register'
  // Permission events
  | 'role_change'
  | 'permission_grant'
  | 'permission_revoke'
  | 'visibility_change'
  // Campaign lifecycle
  | 'campaign_create'
  | 'campaign_delete'
  | 'campaign_member_join'
  | 'campaign_member_leave'
  | 'campaign_member_remove'

export interface AuditEntry {
  action: AuditAction
  userId?: string
  target?: string
  details?: Record<string, unknown>
  ip?: string
}

/**
 * Write a structured audit log entry.
 * Call from any server handler after a security-sensitive action.
 */
export function auditLog(entry: AuditEntry): void {
  auditLogger.info(entry.action, {
    userId: entry.userId ?? 'anonymous',
    action: entry.action,
    target: entry.target,
    details: entry.details,
    ip: entry.ip,
  })
}

/**
 * Write an audit log entry with IP extracted from an H3 event.
 */
export function auditLogFromEvent(event: H3Event, entry: Omit<AuditEntry, 'ip'>): void {
  const ip = getRequestHeader(event, 'x-forwarded-for')
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket?.remoteAddress
    || 'unknown'

  auditLog({ ...entry, ip })
}
