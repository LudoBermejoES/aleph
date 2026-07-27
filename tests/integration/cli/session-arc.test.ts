/// <reference types="node" />
/**
 * CLI arc/chapter support (integration).
 *
 * Requires a dev server on TEST_BASE_URL (default http://localhost:3333) — run it via
 * `npm run test:integration`. Drives the real `aleph` binary, so it exercises the flags,
 * the query params, and the printed output, not just the source text.
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

describe('CLI arc/chapter/session commands (integration)', () => {
  const email = `cli-arc-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let cliEnv: Record<string, string>
  let sessionSlug = ''

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Arc Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const sessionCookie = (login.headers.get('set-cookie') || '').match(
      /better-auth\.session_token=([^;]+)/,
    )
    const bare = sessionCookie ? `better-auth.session_token=${sessionCookie[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: bare } })
    csrfToken = (campList.headers.get('set-cookie') || '').match(/csrf_token=([^;]+)/)?.[1] || ''
    cookie = csrfToken ? `${bare}; csrf_token=${csrfToken}` : bare

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `CLI Arc Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const keyRes = await api('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'cli-arc-test' },
    })
    cliEnv = { ALEPH_URL: BASE_URL, ALEPH_TOKEN: (await keyRes.json()).key }

    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { title: 'Session 5', scheduledDate: '2026-05-05' },
    })
    sessionSlug = (await sess.json()).slug
  })

  // ─── arc / chapter sort order and creation output ────────────────────────────

  it('arc create prints the real slug, not (undefined)', () => {
    const { stdout, code } = cliExec(`arc create --campaign ${campaignId} --name "Act I"`, cliEnv)
    expect(code).toBe(0)
    expect(stdout).toContain('act-i')
    expect(stdout).not.toContain('undefined')
  })

  it('arc create --sort-order sets sortOrder as a number', () => {
    const { code } = cliExec(
      `arc create --campaign ${campaignId} --name "Act II" --sort-order 3`,
      cliEnv,
    )
    expect(code).toBe(0)
    const { stdout } = cliExec(`arc list --campaign ${campaignId} --json`, cliEnv)
    const arcs = JSON.parse(stdout) as Array<{ slug: string; sortOrder: number }>
    expect(arcs.find((a) => a.slug === 'act-ii')?.sortOrder).toBe(3)
  })

  it('arc list shows a sortOrder column in the table', () => {
    const { stdout } = cliExec(`arc list --campaign ${campaignId}`, cliEnv)
    expect(stdout).toContain('sortOrder')
  })

  it('arc update --sort-order reorders an existing arc', () => {
    const { code } = cliExec(
      `arc update --campaign ${campaignId} --slug act-i --sort-order 1`,
      cliEnv,
    )
    expect(code).toBe(0)
    const { stdout } = cliExec(`arc list --campaign ${campaignId} --json`, cliEnv)
    const arcs = JSON.parse(stdout) as Array<{ slug: string; sortOrder: number }>
    expect(arcs.find((a) => a.slug === 'act-i')?.sortOrder).toBe(1)
  })

  it('rejects a non-numeric --sort-order locally without sending a request', () => {
    const { stderr, code } = cliExec(
      `arc create --campaign ${campaignId} --name "Act V" --sort-order abc`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toContain('--sort-order must be a number')
  })

  it('chapter create resolves --arc by slug and prints the real slug', () => {
    const { stdout, code } = cliExec(
      `chapter create --campaign ${campaignId} --name "The Market" --arc act-i`,
      cliEnv,
    )
    expect(code).toBe(0)
    expect(stdout).toContain('the-market')
    expect(stdout).not.toContain('undefined')
  })

  it('chapter create still accepts a raw arc id', () => {
    const { stdout: arcsJson } = cliExec(`arc list --campaign ${campaignId} --json`, cliEnv)
    const arcId = (JSON.parse(arcsJson) as Array<{ slug: string; id: string }>).find(
      (a) => a.slug === 'act-ii',
    )!.id
    const { code } = cliExec(
      `chapter create --campaign ${campaignId} --name "The Fall" --arc ${arcId}`,
      cliEnv,
    )
    expect(code).toBe(0)
  })

  it('chapter create with an unknown arc reference fails', () => {
    const { stderr, code } = cliExec(
      `chapter create --campaign ${campaignId} --name "Nowhere" --arc nope`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr.toLowerCase()).toContain('not found')
  })

  it('chapter list works campaign-wide (no arc_id 400) and shows the arc name', () => {
    const { stdout, stderr, code } = cliExec(`chapter list --campaign ${campaignId}`, cliEnv)
    expect(code).toBe(0)
    expect(stderr).not.toContain('arc_id')
    expect(stdout).toContain('the-market')
    expect(stdout).toContain('Act I')
  })

  it('chapter list --arc narrows to one arc', () => {
    const { stdout } = cliExec(`chapter list --campaign ${campaignId} --arc act-i`, cliEnv)
    expect(stdout).toContain('the-market')
    expect(stdout).not.toContain('the-fall')
  })

  it('chapter update --sort-order reorders within the arc', () => {
    const { code } = cliExec(
      `chapter update --campaign ${campaignId} --slug the-market --sort-order 2`,
      cliEnv,
    )
    expect(code).toBe(0)
    const { stdout } = cliExec(`chapter list --campaign ${campaignId} --arc act-i --json`, cliEnv)
    const rows = JSON.parse(stdout) as Array<{ slug: string; sortOrder: number }>
    expect(rows.find((c) => c.slug === 'the-market')?.sortOrder).toBe(2)
  })

  // ─── session arc/chapter assignment ─────────────────────────────────────────

  it('session update --arc assigns the session to an arc', () => {
    const { code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --arc act-i`,
      cliEnv,
    )
    expect(code).toBe(0)
    const { stdout } = cliExec(`session list --campaign ${campaignId} --arc act-i --json`, cliEnv)
    const body = JSON.parse(stdout)
    const rows = (Array.isArray(body) ? body : body.data) as Array<{
      slug: string
      arcName: string
    }>
    expect(rows.map((s) => s.slug)).toContain(sessionSlug)
    expect(rows.find((s) => s.slug === sessionSlug)?.arcName).toBe('Act I')
  })

  it('--arc alone satisfies the at-least-one-field guard', () => {
    const { stderr } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --arc act-i`,
      cliEnv,
    )
    expect(stderr).not.toContain('at least one field')
  })

  it('session update --chapter alone derives the arc from the chapter', () => {
    const { code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --chapter the-market`,
      cliEnv,
    )
    expect(code).toBe(0)
    const { stdout } = cliExec(`session show ${sessionSlug} --campaign ${campaignId}`, cliEnv)
    expect(stdout).toContain('Act I')
    expect(stdout).toContain('The Market')
  })

  it('session list shows arc and chapter names, never UUIDs', () => {
    const { stdout } = cliExec(`session list --campaign ${campaignId}`, cliEnv)
    expect(stdout).toContain('arc')
    expect(stdout).toContain('chapter')
    expect(stdout).toContain('Act I')
    expect(stdout).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it("session update --chapter '' unsets only the chapter", () => {
    const { code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --chapter ""`,
      cliEnv,
    )
    expect(code).toBe(0)
    const { stdout } = cliExec(`session list --campaign ${campaignId} --arc act-i --json`, cliEnv)
    const body = JSON.parse(stdout)
    const rows = (Array.isArray(body) ? body : body.data) as Array<{
      slug: string
      arcId: string | null
      chapterId: string | null
    }>
    const row = rows.find((s) => s.slug === sessionSlug)!
    expect(row.arcId).toBeTruthy()
    expect(row.chapterId).toBeNull()
  })

  it("session update --arc '' unsets the arc (and the chapter with it)", () => {
    const { code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --chapter the-market`,
      cliEnv,
    )
    expect(code).toBe(0)
    const cleared = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --arc ""`,
      cliEnv,
    )
    expect(cleared.code).toBe(0)
    const { stdout } = cliExec(
      `session show ${sessionSlug} --campaign ${campaignId} --json`,
      cliEnv,
    )
    const data = JSON.parse(stdout) as { arcId: string | null; chapterId: string | null }
    expect(data.arcId).toBeNull()
    expect(data.chapterId).toBeNull()
  })

  it('an unknown arc slug on write reports the server message and exits non-zero', () => {
    const { stderr, code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --arc nonexistent`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toContain('not found')
    expect(stderr).toContain('nonexistent')
  })

  it('an unknown arc slug on read is an empty list, not an error', () => {
    const { stdout, code } = cliExec(
      `session list --campaign ${campaignId} --arc nonexistent --json`,
      cliEnv,
    )
    expect(code).toBe(0)
    const body = JSON.parse(stdout)
    const rows = Array.isArray(body) ? body : body.data
    expect(rows).toEqual([])
  })

  it('an inconsistent arc/chapter pair is refused with both slugs named', () => {
    const { stderr, code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --arc act-ii --chapter the-market`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toContain('the-market')
    expect(stderr).toContain('act-ii')
  })

  it('session create --arc creates the session already in the arc', () => {
    const { stdout, code } = cliExec(
      `session create --campaign ${campaignId} --title "Session 9" --arc act-i --json`,
      cliEnv,
    )
    expect(code).toBe(0)
    const created = JSON.parse(stdout) as { slug: string }
    const list = cliExec(`session list --campaign ${campaignId} --arc act-i --json`, cliEnv)
    const body = JSON.parse(list.stdout)
    const rows = (Array.isArray(body) ? body : body.data) as Array<{ slug: string }>
    expect(rows.map((s) => s.slug)).toContain(created.slug)
  })

  it('the arc filter composes with --group and pagination', () => {
    const { stdout, code } = cliExec(
      `session list --campaign ${campaignId} --arc act-i --group nope --page 1 --limit 10 --json`,
      cliEnv,
    )
    expect(code).toBe(0)
    const body = JSON.parse(stdout)
    const rows = Array.isArray(body) ? body : body.data
    expect(rows).toEqual([])
  })

  it('an unauthenticated arc assignment is refused', () => {
    const { stderr, code } = cliExec(
      `session update ${sessionSlug} --campaign ${campaignId} --arc act-i`,
      { ALEPH_URL: BASE_URL, ALEPH_TOKEN: 'aleph_deadbeef' },
    )
    expect(code).not.toBe(0)
    expect(stderr.length).toBeGreaterThan(0)
  })
})
