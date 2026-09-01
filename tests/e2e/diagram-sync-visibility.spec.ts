/**
 * Entity-visibility filtering for a diagram snapshot persisted by the REAL-TIME SYNC ROOM,
 * driven from a real browser — the one scenario in this project's e2e suite that deliberately does
 * NOT use `playwright.config.ts`'s shared dev server.
 *
 * Why this file manages its own server instead of joining the shared suite: this repo's local
 * `.env` sets `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=false`, and `playwright.config.ts`'s `webServer`
 * inherits whatever `.env` is on disk. A scenario that needs sync mode genuinely active would
 * silently never exercise it under the shared config — exactly the gap that let
 * `fix-diagram-image-override-autosave-race`'s own e2e suite ship two real production defects
 * without ever seeing them (its design.md, D6). So this file starts its own `nuxt dev` with
 * `NUXT_PUBLIC_DIAGRAM_MULTIPLAYER=true` explicitly set, on its own port (3001 — one of the three
 * ports better-auth trusts, per `server/utils/auth.ts`, and distinct from the shared suite's 3333
 * so the two can coexist), against its own throwaway database, and tears both down afterward.
 *
 * What it proves, matching `openspec/changes/normalize-diagram-rest-snapshot-format/design.md`
 * D4: before that change's fix, a diagram edited through the sync websocket persisted a
 * `RoomSnapshot`-shaped row that `filterSnapshotByVisibility` could not recognize and returned
 * UNFILTERED — so a `dm_only` character's shape reached a player's own browser in the network
 * response for `GET .../snapshot`, even though the diagram page's canvas happens not to render it
 * in sync mode. This test intercepts that exact network response in the player's real browser
 * session and asserts the hidden shape's id is genuinely absent from the parsed JSON body, not
 * merely unrendered.
 *
 * The shapes are seeded over the real sync websocket from Node (the same wire-protocol technique
 * proven in `tests/integration/tldraw-sync-image-override.test.ts` and
 * `tests/integration/diagram-snapshot-format.test.ts`) rather than by driving drag-and-drop in the
 * UI — deterministic, and the UI placement mechanics are already covered elsewhere
 * (`tests/e2e/diagram-enhancements.spec.ts` et al.); what is unique to THIS file is the real
 * browser + real network response + sync mode genuinely on.
 */
import { test, expect, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getTlsyncProtocolVersion } from '@tldraw/sync-core'
import { alephTLSchema } from '../../server/services/tldraw-shape-schemas'

const PORT = 3001
const BASE = `http://localhost:${PORT}`
const WS_BASE = BASE.replace(/^http/, 'ws')

let serverProcess: ChildProcess | null = null
let tmpDir: string

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

async function waitForHealth(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.status === 200) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`server on ${BASE} did not become healthy within ${timeoutMs}ms`)
}

test.beforeAll(async () => {
  test.setTimeout(150_000) // matches waitForHealth's own 120s budget for a cold Nuxt dev boot
  tmpDir = mkdtempSync(join(tmpdir(), 'aleph-e2e-sync-visibility-'))
  const dbPath = join(tmpDir, 'aleph.db')

  // Spawn the `nuxt` bin DIRECTLY with `node`, not via `npx nuxt dev`: `npx` interposes its own
  // process, and killing that wrapper in `afterAll` does not reliably kill the real nuxt process
  // underneath it — measured here as an orphaned, still-listening dev server left behind (adopted
  // by init) after the first version of this file's own test run finished. Spawning the resolved
  // bin script directly means `serverProcess.pid` IS the real process, and `detached: true` (own
  // process group) plus a negative-pid kill in `afterAll` cleans up any children it forks too.
  const nuxtBin = join(REPO_ROOT, 'node_modules', '.bin', 'nuxt')
  serverProcess = spawn(process.execPath, [nuxtBin, 'dev', '--port', String(PORT)], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NITRO_PORT: String(PORT),
      NITRO_HOST: '0.0.0.0',
      ALEPH_DB_PATH: dbPath,
      STARTUP_BACKFILLS_ENABLED: 'false',
      BETTER_AUTH_URL: BASE,
      // The one thing this whole file exists to set — see the header comment.
      NUXT_PUBLIC_DIAGRAM_MULTIPLAYER: 'true',
      // Nuxt refuses a second concurrent `nuxt dev` in the same checkout regardless of port
      // ("Another Nuxt dev server is already running") — this file's whole point is running
      // alongside `playwright.config.ts`'s own shared server (or a developer's manual one) on a
      // different port, so it must bypass that per-checkout lock explicitly.
      NUXT_IGNORE_LOCK: '1',
    },
    stdio: 'ignore',
    detached: true,
  })

  await waitForHealth(120_000) // first Nuxt build/compile can be slow, matches playwright.config.ts
})

test.afterAll(async () => {
  if (serverProcess?.pid) {
    try {
      process.kill(-serverProcess.pid, 'SIGTERM') // negative pid: whole process group
    } catch {
      serverProcess.kill('SIGTERM')
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  try {
    rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    /* best effort */
  }
})

interface ApiOpts extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function apiRaw(url: string, opts?: ApiOpts) {
  const { body, ...rest } = opts ?? {}
  return fetch(`${BASE}${url}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', Origin: BASE, ...rest?.headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

async function api(url: string, opts?: ApiOpts) {
  const res = await apiRaw(url, opts)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} -> ${res.status}: ${t}`)
  }
  return res.json()
}

async function signUpAndLogin(email: string, password = 'password123', name = 'E2E Sync User') {
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
  return { cookie, csrfToken, email, password }
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
      entityName: 'E2E Probe Entity',
      entityType: 'item',
      slug: `e2e-probe-${id.replace(/[^a-z0-9]/gi, '-')}`,
    },
  }
}

async function pushShapeOverSync(diagramId: string, token: string, shape: ShapeRecord) {
  const ws = new WebSocket(`${WS_BASE}/api/tldraw-sync/${diagramId}?token=${token}`)
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
              connectRequestId: `e2e-connect-${shape.id}`,
              schema: alephTLSchema.serialize(),
              protocolVersion: getTlsyncProtocolVersion(),
              lastServerClock: 0,
            }),
          )
        },
        { once: true },
      )
    })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('push timed out')), 8000)
      const onMessage = (ev: MessageEvent) => {
        const msg = JSON.parse(ev.data as string)
        const inner: Array<Record<string, unknown>> = msg.type === 'data' ? msg.data : [msg]
        for (const m of inner) {
          if (m.type === 'push_result') {
            clearTimeout(timer)
            ws.removeEventListener('message', onMessage)
            resolve()
            return
          }
        }
      }
      ws.addEventListener('message', onMessage)
      ws.addEventListener(
        'close',
        (ev) => {
          clearTimeout(timer)
          reject(new Error(`closed during push: ${ev.code} ${ev.reason}`))
        },
        { once: true },
      )
      ws.send(
        JSON.stringify({ type: 'push', clientClock: 1, diff: { [shape.id]: ['put', shape] } }),
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

/** Logs an already-registered user's session cookie into a Playwright page's browser context. */
async function loginPageAs(page: Page, ctx: { cookie: string; csrfToken: string }) {
  const sessionMatch = ctx.cookie.match(/better-auth\.session_token=([^;]+)/)
  const csrfMatch = ctx.cookie.match(/csrf_token=([^;]+)/)
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: sessionMatch![1],
      url: BASE,
    },
    ...(csrfMatch ? [{ name: 'csrf_token', value: csrfMatch[1], url: BASE }] : []),
  ])
}

test("a player's real browser session never receives a dm_only shape in the snapshot network response, for a diagram persisted by the sync room", async ({
  page,
}) => {
  test.setTimeout(120_000) // cold dev-server compile of the tldraw/React diagram page + two real websocket pushes
  const ts = Date.now()
  const dm = await signUpAndLogin(`e2e-sync-vis-dm-${ts}@example.com`)
  const camp = await api('/api/campaigns', {
    method: 'POST',
    headers: headersFor(dm),
    body: { name: `E2E Sync Visibility Camp ${ts}` },
  })
  const campaignId = camp.id as string

  const invite = await api(`/api/campaigns/${campaignId}/invite`, {
    method: 'POST',
    headers: headersFor(dm),
    body: { role: 'player' },
  })
  const player = await signUpAndLogin(`e2e-sync-vis-player-${ts}@example.com`)
  await api(`/api/campaigns/${campaignId}/join`, {
    method: 'POST',
    headers: headersFor(player),
    body: { token: invite.token },
  })

  const visibleChar = await api(`/api/campaigns/${campaignId}/characters`, {
    method: 'POST',
    headers: headersFor(dm),
    body: { name: 'E2E Sync Visible', characterType: 'npc', visibility: 'members' },
  })
  const hiddenChar = await api(`/api/campaigns/${campaignId}/characters`, {
    method: 'POST',
    headers: headersFor(dm),
    body: { name: 'E2E Sync DM-Only', characterType: 'npc', visibility: 'dm_only' },
  })

  const diagram = await api(`/api/campaigns/${campaignId}/diagrams`, {
    method: 'POST',
    headers: headersFor(dm),
    body: { title: 'E2E Sync Visibility Diagram', diagramType: 'freeform' },
  })
  const diagramId = diagram.id as string

  const visibleShape = makeEntityCardShape(
    'shape:e2e-sync-visible',
    visibleChar.entityId,
    campaignId,
  )
  const hiddenShape = makeEntityCardShape('shape:e2e-sync-hidden', hiddenChar.entityId, campaignId)

  const { token: token1 } = await api('/api/ws/token', { headers: headersFor(dm) })
  await pushShapeOverSync(diagramId, token1, visibleShape)
  const { token: token2 } = await api('/api/ws/token', { headers: headersFor(dm) })
  await pushShapeOverSync(diagramId, token2, hiddenShape)

  // Past the room's own 2000ms persist debounce (server/services/tldraw-rooms.ts).
  await new Promise((r) => setTimeout(r, 3500))

  await loginPageAs(page, player)

  // Warm-up navigation: this is the FIRST request this freshly-started, cold dev server has ever
  // served for this heavy tldraw/React page — the same "first Playwright run after a restart fails
  // on cold page compilation" trap this project's own CLAUDE.md documents for its shared server.
  // Compiling the diagram page's bundle (tldraw + its React shape components) measured well past a
  // naive 15s wait the first time; hitting `/` first lets Vite pre-bundle the common chunks before
  // the timed assertion below.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  const snapshotResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes(`/diagrams/${diagramId}/snapshot`) && res.request().method() === 'GET',
    { timeout: 60_000 },
  )
  await page.goto(`${BASE}/campaigns/${campaignId}/diagrams/${diagramId}`, {
    waitUntil: 'domcontentloaded',
  })
  const snapshotResponse = await snapshotResponsePromise
  expect(snapshotResponse.status()).toBe(200)
  const body = await snapshotResponse.json()

  // The rule this file exists to prove: the raw sync-room shape never leaves the server
  // unfiltered, and a dm_only entity's shape is genuinely absent from what the player's own
  // browser receives over the network -- not merely unrendered by the canvas.
  expect(body.snapshot.documents).toBeUndefined()
  expect(body.snapshot.store[visibleShape.id]).toBeDefined()
  expect(body.snapshot.store[hiddenShape.id]).toBeUndefined()
})
