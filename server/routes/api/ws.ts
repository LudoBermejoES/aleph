import type { Peer } from 'crossws'
import { auth } from '../../utils/auth'
import { useDb } from '../../utils/db'
import { eq, and } from 'drizzle-orm'
import { campaignMembers } from '../../db/schema/campaign-members'
import { logger } from '../../utils/logger'
import { registerBroadcast } from '../../utils/broadcast'
import {
  addUserPresence,
  scheduleRemoval,
  cancelRemoval,
  getPresenceList,
} from '../../services/presence'

// --- Types ---

interface PeerContext {
  userId: string
  userName: string
  campaignId: string
  role: string
}

interface WsMessage {
  type: string
  [key: string]: unknown
}

// Peer → context mapping
const peerContexts = new WeakMap<Peer, PeerContext>()

// Active peers set (for broadcasting from outside the handler)
const activePeers = new Set<Peer>()

// Register broadcast function so API handlers can use emitCampaignNotification
registerBroadcast((campaignId: string, message: string) => {
  for (const peer of activePeers) {
    const ctx = peerContexts.get(peer)
    if (ctx?.campaignId === campaignId) {
      try { peer.send(message) } catch { /* peer may be closing */ }
    }
  }
})

// --- WebSocket Handler ---

export default defineWebSocketHandler({
  async upgrade() {
    // Authentication happens in open() since upgrade doesn't have access
    // to peer for sending error messages.
  },

  async open(peer) {
    const url = new URL(peer.request?.url || '', 'http://localhost')
    const token = url.searchParams.get('token') || ''
    const campaignId = url.searchParams.get('campaignId') || ''

    if (!token || !campaignId) {
      peer.send(JSON.stringify({ type: 'error', message: 'Missing token or campaignId' }))
      peer.close(4001, 'Missing authentication parameters')
      return
    }

    // Validate session via Better Auth
    let session
    try {
      session = await auth.api.getSession({
        headers: new Headers({ cookie: `better-auth.session_token=${token}` }),
      })
    } catch {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid session' }))
      peer.close(4001, 'Invalid session')
      return
    }

    if (!session) {
      peer.send(JSON.stringify({ type: 'error', message: 'Invalid session' }))
      peer.close(4001, 'Invalid session')
      return
    }

    // Check campaign membership
    const db = useDb()
    const membership = db.select()
      .from(campaignMembers)
      .where(and(eq(campaignMembers.campaignId, campaignId), eq(campaignMembers.userId, session.user.id)))
      .get()

    if (!membership) {
      peer.send(JSON.stringify({ type: 'error', message: 'Not a campaign member' }))
      peer.close(4003, 'Not a campaign member')
      return
    }

    // Store context on peer
    const context: PeerContext = {
      userId: session.user.id,
      userName: session.user.name,
      campaignId,
      role: membership.role,
    }
    peerContexts.set(peer, context)
    activePeers.add(peer)

    // Subscribe to campaign channel
    peer.subscribe(`campaign:${campaignId}`)

    // Add to presence (also cancels any pending removal)
    addUserPresence(campaignId, session.user.id, session.user.name, membership.role)

    // Notify others
    peer.publish(`campaign:${campaignId}`, JSON.stringify({
      type: 'presence:join',
      campaignId,
      user: { userId: session.user.id, name: session.user.name, role: membership.role },
    }))

    // Send current presence list to the connecting peer
    peer.send(JSON.stringify({
      type: 'presence:list',
      campaignId,
      users: getPresenceList(campaignId),
    }))

    logger.debug('WebSocket: user connected', { userId: session.user.id, campaignId })
  },

  message(peer, message) {
    const context = peerContexts.get(peer)
    if (!context) return

    let data: WsMessage
    try {
      data = JSON.parse(message.toString())
    } catch {
      return
    }

    switch (data.type) {
      case 'presence:list': {
        peer.send(JSON.stringify({
          type: 'presence:list',
          campaignId: context.campaignId,
          users: getPresenceList(context.campaignId),
        }))
        break
      }

      case 'notification': {
        const { type: _type, ...payload } = data
        peer.publish(`campaign:${context.campaignId}`, JSON.stringify({
          type: 'notification',
          campaignId: context.campaignId,
          from: { userId: context.userId, name: context.userName },
          ...payload,
        }))
        break
      }

      default:
        logger.debug('WebSocket: unknown message type', { type: data.type, userId: context.userId })
    }
  },

  close(peer) {
    activePeers.delete(peer)
    const context = peerContexts.get(peer)
    if (!context) return

    const { campaignId, userId, userName } = context

    // 5s grace period before removing from presence
    scheduleRemoval(campaignId, userId, 5000, () => {
      // Notify remaining users after grace period
      peer.publish(`campaign:${campaignId}`, JSON.stringify({
        type: 'presence:leave',
        campaignId,
        user: { userId, name: userName },
      }))
      logger.debug('WebSocket: user left (after grace period)', { userId, campaignId })
    })
  },

  error(peer, error) {
    const context = peerContexts.get(peer)
    logger.error('WebSocket: peer error', {
      userId: context?.userId,
      campaignId: context?.campaignId,
      error: error.message,
    })
  },
})
