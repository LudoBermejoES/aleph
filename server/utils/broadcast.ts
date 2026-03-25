/**
 * Broadcast a notification to all WebSocket clients in a campaign.
 * Used by API mutation handlers to emit live updates.
 *
 * Note: This relies on the CrossWS pub/sub system via the global peer registry.
 * Since we can't directly access peers from outside the WebSocket handler,
 * we store a broadcast function that the WS handler provides.
 */

type BroadcastFn = (campaignId: string, message: string) => void

let _broadcastFn: BroadcastFn | null = null

export function registerBroadcast(fn: BroadcastFn) {
  _broadcastFn = fn
}

/**
 * Emit a notification to all connected clients in a campaign.
 * Silently no-ops if no WebSocket clients are connected.
 */
export function emitCampaignNotification(
  campaignId: string,
  message: string,
  notificationType = 'info',
  actorUserId?: string,
) {
  if (!_broadcastFn) return

  _broadcastFn(campaignId, JSON.stringify({
    type: 'notification',
    campaignId,
    notificationType,
    message,
    actorUserId, // Client can filter: don't show notification to the actor
    timestamp: Date.now(),
  }))
}
