/**
 * The tldraw SYNC (multiplayer) path for the per-shape diagram image override, end to end
 * against the real, running dev server — no mocks, no re-implementation of the wire protocol
 * beyond what `@tldraw/sync-core` itself exports.
 *
 * Why this file exists and what it is not a duplicate of:
 *
 * `fix-diagram-image-override-autosave-race` fixed the REST (single-user) persistence path and
 * its own e2e suite (`tests/e2e/diagram-image-override.spec.ts`) proves that path thoroughly. But
 * that suite's `playwright.config.ts` runs `npx nuxt dev` with whatever `.env` is on disk, and this
 * repo's local `.env` sets `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false` — while the LIVE production
 * `.env` (read directly off the server, not assumed) has it `true`. So every scenario in that file
 * ran the REST path only, never the sync path production actually uses. That change's own design.md
 * (D4) found and named a real gap here — `server/services/tldraw-shape-schemas.ts` missing
 * `imageOverrideId` on the shapes that carry it — and judged it out of scope because it believed
 * sync mode was off in production. That belief was never checked against the live server and was
 * wrong: production's `pm2-error.log` carries 20 occurrences of exactly this validation error
 * between 07:01 and 08:49 on 2026-09-01, both before AND after that change's own fix deployed.
 *
 * The client's `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER` flag only decides whether the BROWSER opens a
 * socket (`app/pages/campaigns/[id]/diagrams/[diagramId].vue`'s `syncUri` computed) — the server's
 * `/api/tldraw-sync/[diagramId]` websocket route and the `TLSocketRoom` behind it are always live,
 * regardless of that flag. So this file talks to that route directly with the real
 * `@tldraw/sync-core` wire protocol (`connect` / `push` messages, `getTlsyncProtocolVersion()`,
 * `alephTLSchema.serialize()` — the actual server schema module, not a copy of its rules) instead
 * of driving a browser. That is deliberate: it reaches the exact validation boundary
 * (`diffAndValidateRecord`, per the production stack trace) with nothing else in the way, and it
 * runs as a normal `vitest run tests/integration/` file — which IS gated in this repo's CI
 * (`deploy: needs: [test, integration-test]`), unlike the Playwright e2e suite, which this repo's
 * `.github/workflows/deploy.yml` never invokes at all.
 *
 * Two production defects, found investigating this, both fixed and both covered here:
 *
 * 1. `imageOverrideId` was missing from four shapes' server-side schema (`npcToken`, `locationPin`,
 *    `factionCard`, `entityCard` — enumerated from the client shape files that actually declare the
 *    prop, not from memory). `T.optional`'s default `shouldAllowUnknownProperties = false` means an
 *    otherwise-valid patch throws `Unexpected property`, which `TLSyncRoom.handleMessage` turns into
 *    `rejectSession` — the room silently forgets the shape's real state and the client's local
 *    optimistic update is the only place the choice still exists, so a reload shows the OLD image.
 * 2. Independently, `wrapPeer` (`server/routes/api/tldraw-sync/[diagramId].ts`) built an object typed
 *    as `WebSocketMinimal` but never implemented `close()` — a REQUIRED member of that interface,
 *    confirmed with `tsc -p .nuxt/tsconfig.server.json` (`TS2741`, gone after the fix; this repo runs
 *    no typecheck in CI, only eslint + vitest, so that error was invisible). `TLSyncRoom.removeSession`
 *    calls `session.socket.close(code, reason)` on every fatal rejection, wrapped in a bare
 *    `try {} catch {}` — with no `close` method the call threw and was swallowed, so the underlying
 *    WebSocket to the browser stayed open with no close event, no error frame, and no way for
 *    `useSync`'s status to flip to `'error'`. That made defect #1's failure mode SILENT: the
 *    "conectado" indicator kept reading true and nothing told the user their edit hadn't survived.
 *    The `questNode` scenario below is a permanent negative control for this: it never carries
 *    `imageOverrideId` and must keep being rejected — but now the rejection is OBSERVABLE (a real
 *    close event, code 4099 `TLSyncErrorCloseEventCode`, reason `INVALID_RECORD`) rather than a
 *    connection that silently stops responding.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { getTlsyncProtocolVersion } from '@tldraw/sync-core'
import { alephTLSchema } from '../../server/services/tldraw-shape-schemas'
import { apiRaw, signUpAndLogin } from './helpers'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws')

interface AuthedCtx {
  cookie: string
  csrfToken: string
}

function headers(ctx: AuthedCtx) {
  return { Cookie: ctx.cookie, 'X-CSRF-Token': ctx.csrfToken }
}

async function api(
  url: string,
  ctx: AuthedCtx,
  opts?: Omit<RequestInit, 'body'> & { body?: unknown },
) {
  const res = await apiRaw(url, { ...opts, headers: { ...headers(ctx), ...opts?.headers } })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`)
  }
  return res.json()
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

function seedStore(campaignId: string, shape: ShapeRecord) {
  return {
    store: {
      'document:document': {
        id: 'document:document',
        typeName: 'document',
        gridSize: 10,
        name: '',
        meta: {},
      },
      'page:page': { id: 'page:page', typeName: 'page', name: 'Page 1', index: 'a1', meta: {} },
      [shape.id]: shape,
    },
    schema: { schemaVersion: 2, sequences: {} },
  }
}

/** Minimal required props per custom shape type — enumerated from `tldraw-shape-schemas.ts`. */
function minimalPropsFor(type: string, campaignId: string): Record<string, unknown> {
  const w = 140
  const h = 140
  switch (type) {
    case 'npcToken':
      return { w, h, entityId: 'ent-1', campaignId, characterName: 'Probe NPC', slug: 'probe-npc' }
    case 'locationPin':
      return { w, h, entityId: 'ent-1', campaignId, locationName: 'Probe Loc', slug: 'probe-loc' }
    case 'factionCard':
      return {
        w,
        h,
        entityId: 'ent-1',
        campaignId,
        factionName: 'Probe Faction',
        slug: 'probe-faction',
      }
    case 'entityCard':
      return {
        w,
        h,
        entityId: 'ent-1',
        campaignId,
        entityName: 'Probe Entity',
        entityType: 'item',
        slug: 'probe-entity',
      }
    case 'questNode':
      return {
        w,
        h,
        entityId: 'ent-1',
        campaignId,
        questTitle: 'Probe Quest',
        status: 'active',
        slug: 'probe-quest',
      }
    default:
      throw new Error(`no minimalPropsFor for ${type}`)
  }
}

function makeShape(id: string, type: string, campaignId: string): ShapeRecord {
  return {
    id,
    typeName: 'shape',
    type,
    x: 100,
    y: 100,
    rotation: 0,
    isLocked: false,
    opacity: 1,
    meta: {},
    parentId: 'page:page',
    index: 'a1',
    props: minimalPropsFor(type, campaignId),
  }
}

/**
 * Connects to the real `/api/tldraw-sync/:diagramId` route, completes the `connect` handshake with
 * the real production schema, then pushes one `put` op for `shape` (the exact record that already
 * exists in the room's storage, so the server validates it through `diffAndValidateRecord` — the
 * function named in the production stack trace) and resolves with either the `push_result` or the
 * close event that fired instead.
 */
async function pushShapeOverSync(
  diagramId: string,
  token: string,
  shape: ShapeRecord,
): Promise<
  | { ok: true; action: unknown }
  | { ok: false; closeCode: number; closeReason: string }
  | { ok: false; timedOut: true }
> {
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
              connectRequestId: 'test-connect',
              schema: alephTLSchema.serialize(),
              protocolVersion: getTlsyncProtocolVersion(),
              lastServerClock: 0,
            }),
          )
        },
        { once: true },
      )
    })

    const outcome = await new Promise<
      | { ok: true; action: unknown }
      | { ok: false; closeCode: number; closeReason: string }
      | { ok: false; timedOut: true }
    >((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, timedOut: true }), 8000)
      const onMessage = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data as string)
        const inner: Array<Record<string, unknown>> = msg.type === 'data' ? msg.data : [msg]
        for (const m of inner) {
          if (m.type === 'push_result') {
            clearTimeout(timer)
            ws.removeEventListener('message', onMessage)
            resolve({ ok: true, action: m.action })
            return
          }
        }
      }
      ws.addEventListener('message', onMessage)
      ws.addEventListener(
        'close',
        (ev) => {
          clearTimeout(timer)
          resolve({ ok: false, closeCode: ev.code, closeReason: ev.reason })
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

    return outcome
  } finally {
    try {
      ws.close()
    } catch {
      /* already closed */
    }
  }
}

/**
 * Opens a fresh connection to an already-existing room and returns the record states delivered
 * in the `connect` ack's initial diff — i.e. exactly what a reconnecting browser would render.
 * `lastServerClock: 0` asks for the full history, which for a small test document comes back as
 * `put` ops for every record (never `patch`), so `payload` here is always the full record.
 */
async function connectAndGetConnectAck(
  diagramId: string,
  token: string,
): Promise<Record<string, Record<string, unknown>>> {
  const ws = new WebSocket(`${WS_BASE_URL}/api/tldraw-sync/${diagramId}?token=${token}`)
  try {
    const diff = await new Promise<Record<string, [string, Record<string, unknown>]>>(
      (resolve, reject) => {
        const onMessage = (ev: MessageEvent) => {
          const msg = JSON.parse(ev.data as string)
          if (msg.type === 'connect') {
            ws.removeEventListener('message', onMessage)
            resolve(msg.diff ?? {})
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
                connectRequestId: 'test-reconnect',
                schema: alephTLSchema.serialize(),
                protocolVersion: getTlsyncProtocolVersion(),
                lastServerClock: 0,
              }),
            )
          },
          { once: true },
        )
      },
    )

    const records: Record<string, Record<string, unknown>> = {}
    for (const [id, op] of Object.entries(diff)) {
      const [opType, payload] = op
      if (opType === 'put') records[id] = payload
    }
    return records
  } finally {
    try {
      ws.close()
    } catch {
      /* already closed */
    }
  }
}

describe('tldraw sync — per-shape image override, over the real production websocket path', () => {
  const ts = Date.now()
  let ctx: AuthedCtx
  let campaignId: string

  beforeAll(async () => {
    ctx = await signUpAndLogin(`tldraw-sync-${ts}@example.com`)
    const camp = await api('/api/campaigns', ctx, {
      method: 'POST',
      body: { name: `TLDraw Sync Camp ${ts}` },
    })
    campaignId = camp.id
  })

  async function seedDiagramWithShape(shape: ShapeRecord) {
    const diagram = await api(`/api/campaigns/${campaignId}/diagrams`, ctx, {
      method: 'POST',
      body: { title: `Diagram for ${shape.type}`, diagramType: 'freeform' },
    })
    await api(`/api/campaigns/${campaignId}/diagrams/${diagram.id}/snapshot`, ctx, {
      method: 'PUT',
      body: seedStore(campaignId, shape),
    })
    return diagram.id as string
  }

  async function getWsToken() {
    const { token } = await api('/api/ws/token', ctx)
    return token as string
  }

  it.each(['npcToken', 'locationPin', 'factionCard', 'entityCard'])(
    'a %s picks up imageOverrideId over the sync socket without the session being rejected',
    async (type) => {
      const shapeId = `shape:${type}-override-test`
      const baseShape = makeShape(shapeId, type, campaignId)
      const diagramId = await seedDiagramWithShape(baseShape)
      const token = await getWsToken()

      const patchedShape: ShapeRecord = {
        ...baseShape,
        props: { ...baseShape.props, imageOverrideId: 'img-override-1' },
      }

      const outcome = await pushShapeOverSync(diagramId, token, patchedShape)

      // Read this against the RULE, not the pre-fix implementation: a session being rejected
      // (closeCode/closeReason present) or the push simply never resolving both mean the server
      // is treating `imageOverrideId` as an unknown property — exactly the production defect.
      expect(
        outcome.ok,
        `push for ${type} was rejected/timed out: ${JSON.stringify(outcome)}`,
      ).toBe(true)
    },
    15000,
  )

  it(
    'a shape that never carries imageOverrideId (questNode, negative control) is still rejected — ' +
      'and the rejection is now OBSERVABLE (a real close event), not a silently hanging socket',
    async () => {
      const shapeId = 'shape:questnode-negative-control'
      const baseShape = makeShape(shapeId, 'questNode', campaignId)
      const diagramId = await seedDiagramWithShape(baseShape)
      const token = await getWsToken()

      const patchedShape: ShapeRecord = {
        ...baseShape,
        props: { ...baseShape.props, imageOverrideId: 'img-should-be-rejected' },
      }

      const outcome = await pushShapeOverSync(diagramId, token, patchedShape)

      expect(outcome.ok).toBe(false)
      if (!outcome.ok && !('timedOut' in outcome)) {
        // Before the `wrapPeer` close fix, THIS branch was unreachable: the room forgot the
        // session but never actually closed the socket, so every push after a rejection just
        // hung until the timeout below fired instead. A `timedOut` outcome here would mean that
        // regression came back.
        expect(outcome.closeCode).toBe(4099) // TLSyncErrorCloseEventCode
        expect(outcome.closeReason).toBe('INVALID_RECORD')
      } else {
        throw new Error(
          `expected an observable close event, got: ${JSON.stringify(outcome)} — the wrapPeer ` +
            `close() regression (silent, permanently hanging socket) may have come back`,
        )
      }
    },
    15000,
  )

  it(
    'the override survives what a real reload actually does in multiplayer mode: tearing down ' +
      'the socket and reconnecting to the same room, not a REST re-fetch',
    async () => {
      // Deliberately NOT reading back through `GET .../snapshot` here — see the note above
      // `pushShapeOverSync` / the file banner's item 3. `TldrawWrapperSync` (the component this
      // app actually renders once `syncUri` is set) never uses that endpoint's response for the
      // canvas; the browser's own "reload" tears down the WebSocket and opens a fresh one, and
      // the new `connect` handshake's initial diff is the ONLY thing that ends up on screen. A
      // second, independent connection to the same diagram is the faithful equivalent.
      const entity = await api(`/api/campaigns/${campaignId}/entities`, ctx, {
        method: 'POST',
        body: { name: `Sync Override Entity ${ts}`, type: 'item' },
      })

      const shapeId = 'shape:reload-through-sync'
      const baseShape = makeShape(shapeId, 'entityCard', campaignId)
      baseShape.props.entityId = entity.id
      const diagramId = await seedDiagramWithShape(baseShape)

      const firstToken = await getWsToken()
      const patchedShape: ShapeRecord = {
        ...baseShape,
        props: { ...baseShape.props, imageOverrideId: 'img-reload-check' },
      }
      const outcome = await pushShapeOverSync(diagramId, firstToken, patchedShape)
      expect(outcome.ok).toBe(true)

      // "Reload": a brand new WebSocket connection to the same diagram, exactly what the browser
      // does on F5 while multiplayer is active — `getOrCreateRoom` returns the SAME in-memory
      // room (still inside its 30s cleanup grace period), so this also covers the case where the
      // room never even touched disk yet.
      const secondToken = await getWsToken()
      const reconnected = await connectAndGetConnectAck(diagramId, secondToken)
      const reloadedShape = reconnected[shapeId] as { props?: Record<string, unknown> } | undefined
      expect(reloadedShape?.props?.imageOverrideId).toBe('img-reload-check')
    },
    15000,
  )
})
