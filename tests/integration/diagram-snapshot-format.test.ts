/**
 * `GET /api/campaigns/:id/diagrams/:diagramId/snapshot` against a diagram whose latest snapshot
 * was persisted by the REAL-TIME SYNC ROOM, not by the REST autosave `PUT`.
 *
 * Why this file exists and is not a duplicate of `tests/integration/diagram-api.test.ts`'s own
 * "view-time visibility filtering" describe block: every scenario there PUTs the seed snapshot
 * directly in the already-canonical `{schema, store}` shape — which is neither of the two shapes a
 * real browser ever actually produces (`TLEditorSnapshot` for REST autosave,
 * `getSnapshot(editor.store)`; `RoomSnapshot` for sync, `TLSocketRoom.getCurrentSnapshot()`). That
 * coincidence is exactly the kind of test-environment gap this project has hit before (the sync
 * websocket route does not care what shape a *test* PUTs, only what a *browser* actually sends) —
 * so a green run of the existing tests proved nothing about either real client shape.
 *
 * `openspec/changes/normalize-diagram-rest-snapshot-format/design.md` (D1/D2) measured that once a
 * diagram is edited through the real sync websocket its persisted row is `RoomSnapshot`-shaped —
 * `{documents: [{state, lastChangedClock}], tombstones, schema}` — and that 8 of 9 snapshotted
 * diagrams in production are already in that state. `filterSnapshotByVisibility` only defends
 * against a MISSING `.store`, so before this change a `RoomSnapshot` (which has no `.store` either,
 * but is not malformed) went out UNFILTERED. This file drives the real
 * `/api/tldraw-sync/:diagramId` websocket with the real `@tldraw/sync-core` wire protocol — the
 * same technique already proven in `tests/integration/tldraw-sync-image-override.test.ts` — to
 * produce a genuine `RoomSnapshot` row, then asserts the REST GET endpoint against it. This route
 * does not check `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` (only the browser's `[diagramId].vue` does), so
 * no `.env` change is needed to reach it — see design.md D6 for why a Playwright-only suite could
 * not have reached this at all.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { getTlsyncProtocolVersion } from '@tldraw/sync-core'
import { alephTLSchema } from '../../server/services/tldraw-shape-schemas'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws')

interface ApiOpts extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function apiRaw(url: string, opts?: ApiOpts) {
  const { body, ...rest } = opts ?? {}
  return fetch(`${BASE_URL}${url}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...rest?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function api(url: string, opts?: ApiOpts) {
  const res = await apiRaw(url, opts)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndLogin(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  return { cookie, csrfToken }
}

function headersFor(ctx: { cookie: string; csrfToken: string }) {
  return { Cookie: ctx.cookie, 'X-CSRF-Token': ctx.csrfToken }
}

interface ShapeRecord {
  id: string
  typeName: 'shape'
  type: string
  x: number
  y: number
  rotation: number
  isLocked: boolean
  opacity: number
  meta: Record<string, never>
  parentId: string
  index: string
  props: Record<string, unknown>
}

function makeEntityCardShape(id: string, entityId: string, campaignId: string): ShapeRecord {
  return {
    id,
    typeName: 'shape',
    type: 'entityCard',
    x: 100,
    y: 100,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    parentId: 'page:page',
    index: 'a1',
    props: {
      w: 140,
      h: 140,
      entityId,
      campaignId,
      entityName: 'Probe Entity',
      entityType: 'item',
      slug: `probe-${id.replace(/[^a-z0-9]/gi, '-')}`,
    },
  }
}

/** Pushes one `put` op over the real sync socket and waits for the push_result / close. */
async function pushShapeOverSync(
  diagramId: string,
  token: string,
  shape: ShapeRecord,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ws = new WebSocket(`${WS_BASE_URL}/api/tldraw-sync/${diagramId}?token=${token}`)
  try {
    await new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data as string)
        if (msg.type === 'connect') {
          ws.removeEventListener('message', onMessage)
          resolve()
        }
      }
      ws.addEventListener('message', onMessage)
      ws.addEventListener(
        'close',
        (ev) => reject(new Error(`closed before connect ack: ${ev.code} ${ev.reason}`)),
        { once: true },
      )
      ws.addEventListener(
        'open',
        () => {
          ws.send(
            JSON.stringify({
              type: 'connect',
              connectRequestId: `probe-connect-${shape.id}`,
              schema: alephTLSchema.serialize(),
              protocolVersion: getTlsyncProtocolVersion(),
              lastServerClock: 0,
            }),
          )
        },
        { once: true },
      )
    })

    return await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, reason: 'timed out' }), 8000)
      const onMessage = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data as string)
        const inner: Array<Record<string, unknown>> = msg.type === 'data' ? msg.data : [msg]
        for (const m of inner) {
          if (m.type === 'push_result') {
            clearTimeout(timer)
            ws.removeEventListener('message', onMessage)
            resolve({ ok: true })
            return
          }
        }
      }
      ws.addEventListener('message', onMessage)
      ws.addEventListener(
        'close',
        (ev) => {
          clearTimeout(timer)
          resolve({ ok: false, reason: `closed: ${ev.code} ${ev.reason}` })
        },
        { once: true },
      )
      ws.send(
        JSON.stringify({
          type: 'push',
          clientClock: 1,
          diff: { [shape.id]: ['put', shape] },
        }),
      )
    })
  } finally {
    try {
      ws.close()
    } catch {
      /* already closed */
    }
  }
}

/** The room's own PERSIST_DEBOUNCE_MS is 2000ms (tldraw-rooms.ts) — wait comfortably past it. */
async function waitForRoomPersist() {
  await new Promise((r) => setTimeout(r, 3500))
}

describe('GET .../snapshot against a diagram persisted by the real-time sync room', () => {
  const ts = Date.now()
  let dm: { cookie: string; csrfToken: string }
  let campaignId: string

  beforeAll(async () => {
    dm = await signUpAndLogin(`diag-sync-fmt-dm-${ts}@example.com`)
    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: headersFor(dm),
      body: { name: `Diagram Sync Format Camp ${ts}` },
    })
    campaignId = camp.id
  })

  it('round-trips a shape written over the real sync socket: 200, {schema,store}, the shape recoverable by id with its original props', async () => {
    // Longer than the default 5000ms vitest timeout: this test connects a real websocket, waits
    // for a push_result, then waits past the room's own 2000ms persist debounce.
    const diagram = await api(`/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      headers: headersFor(dm),
      body: { title: 'Round-trip Diagram', diagramType: 'freeform' },
    })
    const diagramId = diagram.id as string

    const char = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: headersFor(dm),
      body: { name: 'Round-trip NPC', characterType: 'npc', visibility: 'members' },
    })

    const { token } = await api('/api/ws/token', { headers: headersFor(dm) })
    const shape = makeEntityCardShape('shape:round-trip', char.entityId, campaignId)
    const outcome = await pushShapeOverSync(diagramId, token, shape)
    expect(outcome.ok, JSON.stringify(outcome)).toBe(true)

    await waitForRoomPersist()

    const res = await apiRaw(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      headers: headersFor(dm),
    })
    expect(res.status).toBe(200)
    const body = await res.json()

    // The rule, not the pre-fix implementation: a plain {schema,store} object with the exact
    // shape recoverable by id — not the room's raw {documents:[...],tombstones,...} shape.
    expect(body.snapshot).toBeDefined()
    expect(body.snapshot.documents).toBeUndefined()
    expect(body.snapshot.store).toBeDefined()
    expect(body.snapshot.store[shape.id]).toEqual(shape)
  }, 15000)

  it('restores entity-visibility filtering for a sync-persisted snapshot: a dm_only shape is omitted for a player and kept for the DM', async () => {
    const invite = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: headersFor(dm),
      body: { role: 'player' },
    })
    const player = await signUpAndLogin(`diag-sync-fmt-player-${ts}@example.com`)
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: headersFor(player),
      body: { token: invite.token },
    })

    const visibleChar = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: headersFor(dm),
      body: { name: 'Sync Visible', characterType: 'npc', visibility: 'members' },
    })
    const hiddenChar = await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: headersFor(dm),
      body: { name: 'Sync DM-Only', characterType: 'npc', visibility: 'dm_only' },
    })

    const diagram = await api(`/api/campaigns/${campaignId}/diagrams`, {
      method: 'POST',
      headers: headersFor(dm),
      body: { title: 'Sync Visibility Diagram', diagramType: 'freeform' },
    })
    const diagramId = diagram.id as string

    const visibleShape = makeEntityCardShape('shape:sync-visible', visibleChar.entityId, campaignId)
    const hiddenShape = makeEntityCardShape('shape:sync-hidden', hiddenChar.entityId, campaignId)

    // A ws token is single-use (server/services/ws-token.ts) — each websocket connection
    // (one per pushShapeOverSync call) needs its own fresh token, not a shared one.
    const { token: token1 } = await api('/api/ws/token', { headers: headersFor(dm) })
    const outcome1 = await pushShapeOverSync(diagramId, token1, visibleShape)
    expect(outcome1.ok, JSON.stringify(outcome1)).toBe(true)
    const { token: token2 } = await api('/api/ws/token', { headers: headersFor(dm) })
    const outcome2 = await pushShapeOverSync(diagramId, token2, hiddenShape)
    expect(outcome2.ok, JSON.stringify(outcome2)).toBe(true)

    await waitForRoomPersist()

    // Confirm, as a control, that the persisted row really is RoomSnapshot-shaped and not
    // something a test coincidentally produced in the already-canonical shape.
    const dmRaw = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      headers: headersFor(dm),
    })
    expect(dmRaw.snapshot.store[visibleShape.id]).toBeDefined()
    expect(dmRaw.snapshot.store[hiddenShape.id]).toBeDefined()

    const playerView = await api(`/api/campaigns/${campaignId}/diagrams/${diagramId}/snapshot`, {
      headers: headersFor(player),
    })
    expect(playerView.snapshot.store[visibleShape.id]).toBeDefined()
    expect(playerView.snapshot.store[hiddenShape.id]).toBeUndefined()
  }, 15000)
})
