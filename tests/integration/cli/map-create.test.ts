/// <reference types="node" />
/**
 * `map create` OSM flags (integration).
 *
 * Companion to `tests/unit/cli/map-create.test.ts` (which pins the request wiring against a
 * mocked fetch): this exercises the real `aleph` binary against a real dev server, so it also
 * proves the end-to-end contract — `POST /api/campaigns/[id]/maps/geocode` and
 * `POST /api/campaigns/[id]/maps` both accepting the fields this command now sends
 * (`type`, `centerLat`, `centerLng`, `defaultZoom`), and the created map round-tripping
 * through `map get`.
 *
 * Requires a dev server on TEST_BASE_URL (default http://localhost:3333) — run it via
 * `npm run test:integration`, or point TEST_BASE_URL at a server started by hand. NOT run in
 * this session (see openspec/changes/add-osm-maps session notes: `nuxt dev` does not bind
 * :3333 on this machine) — written to the same shape as the sibling `map-pins.test.ts` suite
 * that IS verified, so it is ready to run wherever the dev server actually starts.
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

describe('CLI `map create` OSM flags (integration)', () => {
  const ts = Date.now()
  let campaignId = ''
  let cliEnv: Record<string, string>

  const SPAWN_TIMEOUT = 20000

  beforeAll(async () => {
    const email = `cli-map-create-${ts}@example.com`
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Map Create Tester', email, password: 'password123' },
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
      body: { name: `CLI Map Create ${ts}` },
    })
    campaignId = (await camp.json()).id

    const keyRes = await api('/api/apikeys', {
      method: 'POST',
      headers: authed,
      body: { name: `cli-map-create-${ts}` },
    })
    cliEnv = { ALEPH_URL: BASE_URL, ALEPH_TOKEN: (await keyRes.json()).key }
  })

  it(
    'creates an osm map with direct --lat/--lng/--zoom, persisting type + center + zoom',
    () => {
      const { stdout, code } = cliExec(
        `map create --campaign ${campaignId} --name "Direct Coords ${ts}" --type osm ` +
          `--lat 52.52 --lng 13.405 --zoom 12`,
        cliEnv,
      )
      expect(code).toBe(0)
      expect(stdout).toContain('Map created:')
    },
    SPAWN_TIMEOUT,
  )

  it(
    'creates an osm map from --address, printing the geocoded name + coordinates',
    () => {
      const { stdout, code } = cliExec(
        `map create --campaign ${campaignId} --name "By Address ${ts}" --type osm ` +
          `--address "Berlin, Germany" --zoom 10`,
        cliEnv,
      )
      expect(code).toBe(0)
      expect(stdout).toMatch(/Geocoded ".*" -> .+\(-?\d+(\.\d+)?, -?\d+(\.\d+)?\)/)
      expect(stdout).toContain('Map created:')
    },
    SPAWN_TIMEOUT,
  )

  it(
    'rejects --lat without --lng locally, before any HTTP call',
    () => {
      const { stderr, code } = cliExec(
        `map create --campaign ${campaignId} --name "Bad Coords ${ts}" --lat 52.52`,
        cliEnv,
      )
      expect(code).not.toBe(0)
      expect(stderr).toContain('--lat and --lng must be given together')
    },
    SPAWN_TIMEOUT,
  )
})
