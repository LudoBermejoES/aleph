/**
 * Server-side presence tracking for campaign WebSocket connections.
 * Pure state management — no WebSocket dependencies.
 */

export interface PresenceUser {
  name: string
  role: string
  connectedAt: number
}

// Map<campaignId, Map<userId, PresenceUser>>
const presenceMap = new Map<string, Map<string, PresenceUser>>()

// Grace period timers: Map<`${campaignId}:${userId}`, timeout>
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function getCampaignPresence(campaignId: string): Map<string, PresenceUser> {
  if (!presenceMap.has(campaignId)) {
    presenceMap.set(campaignId, new Map())
  }
  return presenceMap.get(campaignId)!
}

export function addUserPresence(campaignId: string, userId: string, name: string, role: string) {
  const users = getCampaignPresence(campaignId)
  users.set(userId, { name, role, connectedAt: Date.now() })

  // Cancel any pending disconnect timer
  const timerKey = `${campaignId}:${userId}`
  if (disconnectTimers.has(timerKey)) {
    clearTimeout(disconnectTimers.get(timerKey)!)
    disconnectTimers.delete(timerKey)
  }
}

export function removeUserPresence(campaignId: string, userId: string) {
  const users = getCampaignPresence(campaignId)
  users.delete(userId)

  // Clean up empty campaigns
  if (users.size === 0) {
    presenceMap.delete(campaignId)
  }
}

export function scheduleRemoval(
  campaignId: string,
  userId: string,
  gracePeriodMs: number,
  onRemoved?: () => void,
) {
  const timerKey = `${campaignId}:${userId}`
  disconnectTimers.set(timerKey, setTimeout(() => {
    removeUserPresence(campaignId, userId)
    disconnectTimers.delete(timerKey)
    onRemoved?.()
  }, gracePeriodMs))
}

export function cancelRemoval(campaignId: string, userId: string): boolean {
  const timerKey = `${campaignId}:${userId}`
  if (disconnectTimers.has(timerKey)) {
    clearTimeout(disconnectTimers.get(timerKey)!)
    disconnectTimers.delete(timerKey)
    return true
  }
  return false
}

export function getPresenceList(campaignId: string) {
  const users = getCampaignPresence(campaignId)
  return Array.from(users.entries()).map(([userId, info]) => ({
    userId,
    name: info.name,
    role: info.role,
  }))
}

export function clearAllPresence() {
  for (const timer of disconnectTimers.values()) {
    clearTimeout(timer)
  }
  disconnectTimers.clear()
  presenceMap.clear()
}
