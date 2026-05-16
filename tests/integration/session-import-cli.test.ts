/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const CLI = `node ${path.resolve(__dirname, '../../cli/bin/aleph.js')}`

async function apiRaw(url: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(url: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await apiRaw(url, opts)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

function tmpFile(name: string, content: string): string {
  const p = path.join(os.tmpdir(), name)
  fs.writeFileSync(p, content)
  return p
}

describe('session import CLI (integration)', () => {
  const email = `sess-import-${Date.now()}@example.com`
  let apiKey = ''
  let campaignId = ''
  const cliEnv = () => ({ ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey })

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'import-test-key')
    apiKey = keyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Import CLI Test ${Date.now()}` },
    })
    campaignId = camp.id
  })

  it('exits with error when neither --manual nor --ai is provided', () => {
    let threw = false
    try {
      execSync(`${CLI} session import --campaign ${campaignId}`, {
        encoding: 'utf8',
        env: cliEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (e: unknown) {
      threw = true
      expect((e as { status: number }).status).toBe(1)
      expect((e as { stderr: string }).stderr).toContain('--manual or --ai')
    }
    expect(threw).toBe(true)
  })

  it('exits with error when date cannot be parsed from filename', () => {
    const f = tmpFile('notes-no-date.md', '# notes')
    let threw = false
    try {
      execSync(`${CLI} session import --campaign ${campaignId} --manual ${f}`, {
        encoding: 'utf8',
        env: cliEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (e: unknown) {
      threw = true
      expect((e as { status: number }).status).toBe(1)
      expect((e as { stderr: string }).stderr).toContain('--date')
    }
    expect(threw).toBe(true)
  })

  it('creates session from manual notes filename date, sets manual_notes', async () => {
    const date = `2025-03-${String((Date.now() % 28) + 1).padStart(2, '0')}`
    const f = tmpFile(`session-${date}.md`, `# Notes for ${date}\n\nSome DM notes.`)

    const out = execSync(
      `${CLI} session import --campaign ${campaignId} --manual ${f} --no-summarize`,
      { encoding: 'utf8', env: cliEnv() },
    )
    expect(out).toContain('manual_notes: set')
    expect(out).toContain('import complete')

    // Verify content via API
    const sessions: { scheduledDate: string; slug: string }[] = await api(
      `/api/campaigns/${campaignId}/sessions?pageSize=0`,
      { headers: { 'X-API-Key': apiKey } },
    )
    const found = sessions.find((s) => s.scheduledDate?.startsWith(date))
    expect(found).toBeTruthy()

    const content = await api(`/api/campaigns/${campaignId}/sessions/${found!.slug}/content`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(content.manual_notes?.content).toContain('DM notes')
  })

  it('creates session from --ai file, sets ai_notes', async () => {
    const date = `2025-04-${String((Date.now() % 28) + 1).padStart(2, '0')}`
    const f = tmpFile(`session-${date}.md`, `Transcripción IA para ${date}`)

    const out = execSync(
      `${CLI} session import --campaign ${campaignId} --ai ${f} --no-summarize`,
      { encoding: 'utf8', env: cliEnv() },
    )
    expect(out).toContain('ai_notes: set')

    const sessions: { scheduledDate: string; slug: string }[] = await api(
      `/api/campaigns/${campaignId}/sessions?pageSize=0`,
      { headers: { 'X-API-Key': apiKey } },
    )
    const found = sessions.find((s) => s.scheduledDate?.startsWith(date))
    expect(found).toBeTruthy()

    const content = await api(`/api/campaigns/${campaignId}/sessions/${found!.slug}/content`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(content.ai_notes?.content).toContain('Transcripción IA')
  })

  it('sets both manual_notes and ai_notes when both files provided', async () => {
    const date = `2025-05-${String((Date.now() % 28) + 1).padStart(2, '0')}`
    const manual = tmpFile(`session-${date}.md`, `Manual notes for ${date}`)
    const ai = tmpFile(`session-${date}-ai.md`, `AI notes for ${date}`)

    const out = execSync(
      `${CLI} session import --campaign ${campaignId} --manual ${manual} --ai ${ai} --date ${date} --no-summarize`,
      { encoding: 'utf8', env: cliEnv() },
    )
    expect(out).toContain('manual_notes: set')
    expect(out).toContain('ai_notes: set')

    const sessions: { scheduledDate: string; slug: string }[] = await api(
      `/api/campaigns/${campaignId}/sessions?pageSize=0`,
      { headers: { 'X-API-Key': apiKey } },
    )
    const found = sessions.find((s) => s.scheduledDate?.startsWith(date))
    const content = await api(`/api/campaigns/${campaignId}/sessions/${found!.slug}/content`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(content.manual_notes?.content).toContain('Manual notes')
    expect(content.ai_notes?.content).toContain('AI notes')
  })

  it('reuses existing session when one already has that date', async () => {
    const date = `2025-06-${String((Date.now() % 28) + 1).padStart(2, '0')}`

    // Pre-create session
    const created = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Pre-existing session', scheduledDate: date },
    })

    const f = tmpFile(`session-${date}.md`, 'Updated manual notes')
    const out = execSync(
      `${CLI} session import --campaign ${campaignId} --manual ${f} --no-summarize`,
      { encoding: 'utf8', env: cliEnv() },
    )
    expect(out).toContain('Found session')
    expect(out).toContain(created.slug)

    // Should not have created a duplicate
    const sessions: { scheduledDate: string }[] = await api(
      `/api/campaigns/${campaignId}/sessions?pageSize=0`,
      { headers: { 'X-API-Key': apiKey } },
    )
    const matching = sessions.filter((s) => s.scheduledDate?.startsWith(date))
    expect(matching).toHaveLength(1)
  })

  it('--date override takes precedence over filename date', async () => {
    const override = `2025-07-${String((Date.now() % 28) + 1).padStart(2, '0')}`
    const f = tmpFile('session-2099-12-31.md', 'Notes with wrong filename date')

    execSync(
      `${CLI} session import --campaign ${campaignId} --manual ${f} --date ${override} --no-summarize`,
      { encoding: 'utf8', env: cliEnv() },
    )

    const sessions: { scheduledDate: string }[] = await api(
      `/api/campaigns/${campaignId}/sessions?pageSize=0`,
      { headers: { 'X-API-Key': apiKey } },
    )
    const found = sessions.find((s) => s.scheduledDate?.startsWith(override))
    expect(found).toBeTruthy()

    // The wrong date from filename should not have been used
    const wrong = sessions.find((s) => s.scheduledDate?.startsWith('2099-12-31'))
    expect(wrong).toBeFalsy()
  })

  it('session title is formatted as Spanish date', async () => {
    const date = `2025-08-${String((Date.now() % 28) + 1).padStart(2, '0')}`
    const day = parseInt(date.split('-')[2], 10)
    const f = tmpFile(`session-${date}.md`, 'Notes')

    execSync(`${CLI} session import --campaign ${campaignId} --manual ${f} --no-summarize`, {
      encoding: 'utf8',
      env: cliEnv(),
    })

    const sessions: { scheduledDate: string; title: string }[] = await api(
      `/api/campaigns/${campaignId}/sessions?pageSize=0`,
      { headers: { 'X-API-Key': apiKey } },
    )
    const found = sessions.find((s) => s.scheduledDate?.startsWith(date))
    expect(found?.title).toBe(`${day} de agosto de 2025`)
  })
})
