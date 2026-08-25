/// <reference types="node" />
/**
 * Map pin CLI (integration).
 *
 * `aleph map pin-add` was completely broken: it sent `{ label, x, y }`, while
 * `server/api/campaigns/[id]/maps/[slug]/pins/index.post.ts` requires `lat`/`lng` as
 * `z.number()` — mandatory, no default — so every single invocation failed with a 422
 * before the map slug was even looked up. Reproduced against production (see
 * `proposal.md`), not deduced.
 *
 * Requires a dev server on TEST_BASE_URL (default http://localhost:3333) — run it via
 * `npm run test:integration`, or point TEST_BASE_URL at a server started by hand. Drives the
 * real `aleph` binary end to end (flags, HTTP call, printed output, exit code), which is
 * exactly the layer the x/y-vs-lat/lng mismatch lived in and a unit test mocking `fetch`
 * cannot see: the bug was in what the command *sent*, not in what `client.js` does with a
 * body it's handed.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { resolve } from 'path'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const CLI = `node ${resolve(process.cwd(), 'cli/bin/aleph.js')}`

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

function cliExec(
  args: string,
  env?: Record<string, string>,
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', ...env },
    })
    return { stdout, stderr: '', code: 0 }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return { stdout: err.stdout || '', stderr: err.stderr || '', code: err.status ?? 1 }
  }
}

interface Pin {
  id: string
  label: string | null
  lat: number
  lng: number
}

describe('CLI map pin commands (integration)', () => {
  const ts = Date.now()
  let campaignId = ''
  let slug = ''
  let cliEnv: Record<string, string>

  beforeAll(async () => {
    const email = `cli-map-pins-${ts}@example.com`
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Map Pins Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const sessionMatch = (login.headers.get('set-cookie') || '').match(
      /better-auth\.session_token=([^;]+)/,
    )
    const bare = sessionMatch ? `better-auth.session_token=${sessionMatch[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: bare } })
    const csrfToken =
      (campList.headers.get('set-cookie') || '').match(/csrf_token=([^;]+)/)?.[1] || ''
    const cookie = csrfToken ? `${bare}; csrf_token=${csrfToken}` : bare
    const authed = { Cookie: cookie, 'X-CSRF-Token': csrfToken }

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: authed,
      body: { name: `CLI Map Pins ${ts}` },
    })
    campaignId = (await camp.json()).id

    const keyRes = await api('/api/apikeys', {
      method: 'POST',
      headers: authed,
      body: { name: `cli-map-pins-${ts}` },
    })
    cliEnv = { ALEPH_URL: BASE_URL, ALEPH_TOKEN: (await keyRes.json()).key }

    const map = await api(`/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      headers: authed,
      body: { name: `Harbour ${ts}` },
    })
    slug = (await map.json()).slug
  })

  // Spawning `node cli/bin/aleph.js` per assertion is slow on this filesystem (cold Node
  // start + ESM resolution can take several seconds), well past vitest's 5s default —
  // see the identical accommodation this repo already needs elsewhere for CLI-spawning
  // integration tests. Bump per-test, not globally, so fast CI environments are unaffected.
  const SPAWN_TIMEOUT = 20000

  it(
    "pin-add creates a pin using --lat/--lng (the endpoint's real, required contract)",
    () => {
      const { stdout, code } = cliExec(
        `map pin-add --campaign ${campaignId} --slug ${slug} --label "The Docks" --lat 41.5 --lng 2.1`,
        cliEnv,
      )
      expect(code).toBe(0)
      expect(stdout).toContain('Pin added:')
    },
    SPAWN_TIMEOUT,
  )

  it(
    'the created pin round-trips through `map pins` with lat/lng populated, not undefined',
    () => {
      const { stdout, code } = cliExec(
        `map pins --campaign ${campaignId} --slug ${slug} --json`,
        cliEnv,
      )
      expect(code).toBe(0)
      const pins = JSON.parse(stdout) as Pin[]
      expect(pins).toHaveLength(1)
      expect(pins[0]!.label).toBe('The Docks')
      expect(pins[0]!.lat).toBe(41.5)
      expect(pins[0]!.lng).toBe(2.1)
    },
    SPAWN_TIMEOUT,
  )

  it(
    'the non-JSON `map pins` table prints real lat/lng values, not blank columns',
    () => {
      const { stdout, code } = cliExec(`map pins --campaign ${campaignId} --slug ${slug}`, cliEnv)
      expect(code).toBe(0)
      expect(stdout).toContain('41.5')
      expect(stdout).toContain('2.1')
    },
    SPAWN_TIMEOUT,
  )

  it(
    'a missing --lat/--lng is rejected locally by commander, not sent to the server',
    () => {
      const { stderr, code } = cliExec(
        `map pin-add --campaign ${campaignId} --slug ${slug} --label "No Coords"`,
        cliEnv,
      )
      expect(code).not.toBe(0)
      expect(stderr).toMatch(/required option.*--lat|required option.*--lng/)
    },
    SPAWN_TIMEOUT,
  )
})
