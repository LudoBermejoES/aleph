/**
 * Composable for campaign-scoped WebSocket connection.
 * Handles presence tracking and live notifications.
 */

interface PresenceUser {
  userId: string
  name: string
  role: string
}

interface CampaignNotification {
  id: string
  type: string
  message: string
  from?: { userId: string; name: string }
  timestamp: number
}

type SecretEventHandler = (data: { entityId: string; entitySlug: string; blockId: string }) => void

export function useCampaignSocket(campaignId: Ref<string | undefined>) {
  const presenceUsers = ref<PresenceUser[]>([])
  const notifications = ref<CampaignNotification[]>([])
  const connected = ref(false)
  const secretEventHandlers = new Set<{ event: string; handler: SecretEventHandler }>()

  let ws: WebSocket | null = null

  async function connect() {
    if (!campaignId.value || ws) return

    // Fetch a short-lived WS token via HTTP (HttpOnly session cookie sent automatically)
    let wsToken: string
    try {
      const res = await fetch('/api/ws/token', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      wsToken = data.token
    } catch (e) {
      if (import.meta.dev) console.warn('[useCampaignSocket] Failed to fetch WS token:', e)
      return
    }

    if (!wsToken) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/ws?token=${encodeURIComponent(wsToken)}&campaignId=${encodeURIComponent(campaignId.value)}`

    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
    }

    ws.onmessage = (event) => {
      let data
      try {
        data = JSON.parse(event.data)
      } catch (e) {
        if (import.meta.dev) console.warn('[useCampaignSocket] Failed to parse WS message:', e)
        return
      }

      switch (data.type) {
        case 'presence:list':
          presenceUsers.value = data.users || []
          break

        case 'presence:join': {
          const user = data.user as PresenceUser
          if (!presenceUsers.value.find((u) => u.userId === user.userId)) {
            presenceUsers.value = [...presenceUsers.value, user]
          }
          break
        }

        case 'presence:leave': {
          const userId = data.user?.userId
          presenceUsers.value = presenceUsers.value.filter((u) => u.userId !== userId)
          break
        }

        case 'notification': {
          const notification: CampaignNotification = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: data.notificationType || 'info',
            message: data.message || '',
            from: data.from,
            timestamp: Date.now(),
          }
          notifications.value = [notification, ...notifications.value].slice(0, 50) // Keep last 50
          break
        }

        case 'secret:reveal':
        case 'secret:unreveal': {
          for (const entry of secretEventHandlers) {
            if (entry.event === data.type) {
              entry.handler({
                entityId: data.entityId,
                entitySlug: data.entitySlug,
                blockId: data.blockId,
              })
            }
          }
          break
        }

        case 'error':
          console.error('[Aleph:WS] Server error:', data.message)
          break
      }
    }

    ws.onclose = () => {
      connected.value = false
      ws = null
      // Reconnect after 3s if campaign is still active
      if (campaignId.value) {
        setTimeout(() => connect(), 3000)
      }
    }

    ws.onerror = () => {
      // onclose will fire after this
    }
  }

  function disconnect() {
    if (ws) {
      ws.close()
      ws = null
    }
    connected.value = false
    presenceUsers.value = []
  }

  function sendNotification(message: string, notificationType = 'info') {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(
      JSON.stringify({
        type: 'notification',
        notificationType,
        message,
      }),
    )
  }

  function dismissNotification(id: string) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  function onSecretEvent(event: 'secret:reveal' | 'secret:unreveal', handler: SecretEventHandler) {
    const entry = { event, handler }
    secretEventHandlers.add(entry)
    return () => secretEventHandlers.delete(entry)
  }

  // Auto-connect/disconnect when campaignId changes
  watch(
    campaignId,
    (newId, oldId) => {
      if (oldId) disconnect()
      if (newId) connect()
    },
    { immediate: true },
  )

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    presenceUsers: readonly(presenceUsers),
    notifications: readonly(notifications),
    connected: readonly(connected),
    sendNotification,
    dismissNotification,
    onSecretEvent,
  }
}
