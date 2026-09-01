import type { Peer } from 'crossws'
import type { WebSocketMinimal } from '@tldraw/sync-core'
import { useDb } from '../../../utils/db'
import { auth } from '../../../utils/auth'
import { validateWsToken } from '../../../services/ws-token'
import { getOrCreateRoom } from '../../../services/tldraw-rooms'
import { eq, and } from 'drizzle-orm'
import { diagrams } from '../../../db/schema/diagrams'
import { campaignMembers } from '../../../db/schema/campaign-members'
import { logger } from '../../../utils/logger'

interface SessionContext {
  userId: string
  sessionId: string
  diagramId: string
  campaignId: string
  role: string
  isReadonly: boolean
}

const peerContexts = new WeakMap<Peer, SessionContext>()

/**
 * Wrap a crossws Peer as a WebSocketMinimal for TLSocketRoom.
 * We use the handleSocketMessage/handleSocketClose/handleSocketError
 * pattern (like Bun/Cloudflare) instead of addEventListener.
 *
 * `close` is NOT optional on `WebSocketMinimal` (`tsc -p .nuxt/tsconfig.server.json` reports
 * TS2741 without it — this project runs no typecheck in CI, so that error was invisible). Its
 * absence here was silent and consequential: `TLSyncRoom.removeSession` calls
 * `session.socket.close(code, reason)` on every fatal rejection (e.g. `INVALID_RECORD`, the
 * production `imageOverrideId` schema gap this room's schema used to have), wrapped in a bare
 * `try {} catch {}`. With no `close` method the call threw and was swallowed, so the room forgot
 * the session internally while the underlying WebSocket to the browser stayed open — no close
 * event, no error frame, nothing for `useSync`'s status to react to. `multiplayerActive` and the
 * "conectado" indicator kept reading true, and every future push from that tab silently went
 * nowhere: `handleMessage` looks the session up by id and does nothing when it's not found. That
 * turned an already-bad schema rejection into an invisible one — the only way anyone found out
 * their edit didn't survive was reloading the page.
 */
function wrapPeer(peer: Peer): WebSocketMinimal {
  return {
    send(data: string) {
      try {
        peer.send(data)
      } catch {
        /* peer may be closing */
      }
    },
    close(code, reason) {
      try {
        peer.close(code, reason)
      } catch {
        /* peer may already be closing */
      }
    },
    readyState: 1, // assume open when wrapping
    // No addEventListener/removeEventListener — we use direct handler methods
  }
}

async function authenticateFromCookie(cookieHeader: string): Promise<string | null> {
  if (!cookieHeader) return null
  try {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    })
    return session?.user?.id ?? null
  } catch {
    return null
  }
}

export default defineWebSocketHandler({
  async open(peer) {
    const url = new URL(peer.request?.url || '', 'http://localhost')
    const diagramId = url.pathname.split('/').pop() || ''

    if (!diagramId) {
      peer.close(4400, 'Missing diagramId')
      return
    }

    // Authenticate: try session cookie first, then WS token query param
    let userId: string | null = null

    const cookieHeader = peer.request?.headers?.get?.('cookie') || ''
    if (cookieHeader) {
      userId = await authenticateFromCookie(cookieHeader)
    }

    if (!userId) {
      const token = url.searchParams.get('token') || ''
      if (token) {
        userId = validateWsToken(token)
      }
    }

    if (!userId) {
      peer.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
      peer.close(4001, 'Unauthorized')
      return
    }

    // Look up diagram to get campaignId
    const db = useDb()
    const diagram = db
      .select({ campaignId: diagrams.campaignId })
      .from(diagrams)
      .where(eq(diagrams.id, diagramId))
      .get()

    if (!diagram) {
      peer.send(JSON.stringify({ type: 'error', message: 'Diagram not found' }))
      peer.close(4004, 'Diagram not found')
      return
    }

    // Check campaign membership
    const membership = db
      .select()
      .from(campaignMembers)
      .where(
        and(eq(campaignMembers.campaignId, diagram.campaignId), eq(campaignMembers.userId, userId)),
      )
      .get()

    if (!membership) {
      peer.send(JSON.stringify({ type: 'error', message: 'Not a campaign member' }))
      peer.close(4003, 'Not a campaign member')
      return
    }

    const editRoles = ['dm', 'co_dm', 'editor']
    const isReadonly = !editRoles.includes(membership.role)

    // Get or create the room
    const managed = getOrCreateRoom(diagramId)
    if (!managed) {
      peer.close(4004, 'Failed to create room')
      return
    }

    const sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const context: SessionContext = {
      userId,
      sessionId,
      diagramId,
      campaignId: diagram.campaignId,
      role: membership.role,
      isReadonly,
    }
    peerContexts.set(peer, context)

    // Connect to tldraw room
    managed.room.handleSocketConnect({
      sessionId,
      socket: wrapPeer(peer),
      isReadonly,
    })

    logger.debug('tldraw-sync: client connected', {
      diagramId,
      userId,
      role: membership.role,
      isReadonly,
      sessionId,
    })
  },

  message(peer, message) {
    const ctx = peerContexts.get(peer)
    if (!ctx) return

    const managed = getOrCreateRoom(ctx.diagramId)
    if (!managed) return

    const data = typeof message === 'string' ? message : message.text()
    managed.room.handleSocketMessage(ctx.sessionId, data)
  },

  close(peer) {
    const ctx = peerContexts.get(peer)
    if (!ctx) return

    const managed = getOrCreateRoom(ctx.diagramId)
    if (managed) {
      managed.room.handleSocketClose(ctx.sessionId)
    }

    logger.debug('tldraw-sync: client disconnected', {
      diagramId: ctx.diagramId,
      userId: ctx.userId,
      sessionId: ctx.sessionId,
    })
  },

  error(peer) {
    const ctx = peerContexts.get(peer)
    if (!ctx) return

    const managed = getOrCreateRoom(ctx.diagramId)
    if (managed) {
      managed.room.handleSocketError(ctx.sessionId)
    }
  },
})
