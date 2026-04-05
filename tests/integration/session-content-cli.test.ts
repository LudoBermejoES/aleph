/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const CLI = 'node /Users/ludo/code/aleph/cli/bin/aleph.js'

async function apiRaw(url: string, opts?: any) {
  return fetch(`${BASE_URL}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(url: string, opts?: any) {
  const res = await apiRaw(url, opts)
  if (!res.ok) { const t = await res.text(); throw new Error(`${opts?.method ?? 'GET'} ${url} → ${res.status}: ${t}`) }
  if (res.status === 204) return null
  return res.json()
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await apiRaw('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await apiRaw('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Get CSRF token
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await apiRaw('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name } })
  return res.json()
}

describe('Session Content CLI (integration)', () => {
  const email = `sess-content-${Date.now()}@example.com`
  let apiKey = ''
  let campaignId = ''
  let sessionSlug = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'content-test-key')
    apiKey = keyData.key

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Content CLI Test ${Date.now()}` },
    })
    campaignId = camp.id

    const sess = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { title: 'Content Test Session', status: 'planned' },
    })
    sessionSlug = sess.slug
  })

  it('session update sets title via CLI', () => {
    const output = execSync(
      `${CLI} session update ${sessionSlug} --campaign ${campaignId} --title "Updated Title"`,
      { encoding: 'utf8', env: { ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey } }
    )
    expect(output).toContain('Session updated.')
  })

  it('session update with no fields exits with error', () => {
    let threw = false
    try {
      execSync(
        `${CLI} session update ${sessionSlug} --campaign ${campaignId}`,
        { encoding: 'utf8', env: { ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey }, stdio: ['pipe', 'pipe', 'pipe'] }
      )
    } catch (e: any) {
      threw = true
      expect(e.status).toBe(1)
      expect(e.stderr).toContain('at least one field')
    }
    expect(threw).toBe(true)
  })

  it('session content set then get round-trips content', async () => {
    const testContent = `# Test Notes\n\nHello from integration test ${Date.now()}`
    const tmpFile = path.join(os.tmpdir(), `notes-${Date.now()}.md`)
    fs.writeFileSync(tmpFile, testContent)

    execSync(
      `${CLI} session content set ${sessionSlug} --campaign ${campaignId} --type manual_notes --file ${tmpFile}`,
      { encoding: 'utf8', env: { ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey } }
    )

    const output = execSync(
      `${CLI} session content get ${sessionSlug} --campaign ${campaignId} --type manual_notes`,
      { encoding: 'utf8', env: { ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey } }
    )
    expect(output.trim()).toBe(testContent)
    fs.unlinkSync(tmpFile)
  })

  it('session attendance set updates RSVP', () => {
    const output = execSync(
      `${CLI} session attendance set ${sessionSlug} --campaign ${campaignId} --status accepted`,
      { encoding: 'utf8', env: { ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey } }
    )
    expect(output).toContain('Attendance updated.')
  })
})
