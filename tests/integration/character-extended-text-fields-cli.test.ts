/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import * as path from 'path'

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
  return res.status === 204 ? null : res.json()
}

async function signUpAndGetApiKey(email: string) {
  await apiRaw('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'CLI Ext Tester', email, password: 'password123' },
  })
  const loginRes = await apiRaw('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = loginRes.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const campaignsRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = campaignsRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

  const keyRes = (await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name: 'cli-ext-test' },
  })) as { key: string }
  return { apiKey: keyRes.key, cookie, csrfToken }
}

describe('character update CLI — extended text fields (integration)', () => {
  const email = `cli-ext-${Date.now()}@example.com`
  let apiKey = ''
  let campaignId = ''
  let slug = ''

  beforeAll(async () => {
    const auth = await signUpAndGetApiKey(email)
    apiKey = auth.apiKey

    const camp = (await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrfToken },
      body: { name: `CLI Ext Camp ${Date.now()}` },
    })) as { id: string }
    campaignId = camp.id

    const char = (await api(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: auth.cookie, 'X-CSRF-Token': auth.csrfToken },
      body: { name: 'Zara', characterType: 'pc' },
    })) as { slug: string }
    slug = char.slug
  })

  function cli(args: string) {
    return execSync(`${CLI} ${args}`, {
      env: { ...process.env, ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey },
    }).toString()
  }

  it('--backstory sets backstory and GET returns it', async () => {
    cli(`character update ${slug} --campaign ${campaignId} --backstory "Born in the frozen north."`)

    const data = (await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })) as { backstory: string }
    expect(data.backstory).toBe('Born in the frozen north.')
  })

  it('--history sets history and GET returns it', async () => {
    cli(
      `character update ${slug} --campaign ${campaignId} --history "Session 1: joined the group."`,
    )

    const data = (await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })) as { history: string }
    expect(data.history).toBe('Session 1: joined the group.')
  })

  it('--current-status sets currentStatus and GET returns it', async () => {
    cli(
      `character update ${slug} --campaign ${campaignId} --current-status "Healthy and well-rested."`,
    )

    const data = (await api(`/api/campaigns/${campaignId}/characters/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })) as { currentStatus: string }
    expect(data.currentStatus).toBe('Healthy and well-rested.')
  })

  it('errors on --backstory and --backstory-stdin together', () => {
    expect(() =>
      cli(`character update ${slug} --campaign ${campaignId} --backstory "x" --backstory-stdin`),
    ).toThrow()
  })
})
