/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
  return res
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await apiRaw(path, opts)
  if (!res.ok)
    throw new Error(`${opts?.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function setup() {
  const email = `subtype-${Date.now()}@example.com`
  await apiRaw('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name: 'T', email, password: 'password123' },
  })
  const lr = await apiRaw('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const sessionToken = lr.headers.get('set-cookie')!.match(/better-auth\.session_token=([^;]+)/)![1]
  const sessionCookie = `better-auth.session_token=${sessionToken}`
  // Get CSRF token
  const getRes = await apiRaw('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfToken = setCookie.match(/csrf_token=([^;]+)/)?.[1] || ''
  const fullCookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
  const { key } = await (
    await apiRaw('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: fullCookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'k' },
    })
  ).json()
  const camp = await api('/api/campaigns', {
    method: 'POST',
    headers: { 'X-API-Key': key },
    body: { name: `ST ${Date.now()}`, theme: 'default' },
  })
  return { key, campaignId: camp.id }
}

describe('Location subtype roundtrip', () => {
  let key = '',
    campaignId = ''

  beforeAll(async () => {
    ;({ key, campaignId } = await setup())
  })

  for (const subtype of [
    'country',
    'region',
    'city',
    'town',
    'village',
    'dungeon',
    'lair',
    'building',
    'room',
    'wilderness',
  ]) {
    it(`subtype "${subtype}" is preserved on detail GET`, async () => {
      const created = await api(`/api/campaigns/${campaignId}/locations`, {
        method: 'POST',
        headers: { 'X-API-Key': key },
        body: { name: `Loc ${subtype} ${Date.now()}`, subtype, visibility: 'members' },
      })
      expect(created.subtype).toBe(subtype)

      const detail = await api(`/api/campaigns/${campaignId}/locations/${created.slug}`, {
        headers: { 'X-API-Key': key },
      })
      expect(detail.subtype).toBe(subtype)
    })

    it(`subtype "${subtype}" is present on list GET`, async () => {
      const created = await api(`/api/campaigns/${campaignId}/locations`, {
        method: 'POST',
        headers: { 'X-API-Key': key },
        body: { name: `List ${subtype} ${Date.now()}`, subtype, visibility: 'members' },
      })

      const listBody = await api(`/api/campaigns/${campaignId}/locations`, {
        headers: { 'X-API-Key': key },
      })
      const list = listBody.data ?? listBody
      const item = list.find((l: Record<string, unknown>) => l.id === created.id)
      expect(item).toBeDefined()
      expect(item.subtype).toBe(subtype)
    })

    it(`subtype "${subtype}" is preserved after PUT (edit)`, async () => {
      const created = await api(`/api/campaigns/${campaignId}/locations`, {
        method: 'POST',
        headers: { 'X-API-Key': key },
        body: { name: `Edit ${subtype} ${Date.now()}`, subtype, visibility: 'members' },
      })

      const updated = await api(`/api/campaigns/${campaignId}/locations/${created.slug}`, {
        method: 'PUT',
        headers: { 'X-API-Key': key },
        body: { name: created.name + ' (edited)', subtype, visibility: 'members' },
      })
      expect(updated.subtype).toBe(subtype)

      const detail = await api(`/api/campaigns/${campaignId}/locations/${updated.slug}`, {
        headers: { 'X-API-Key': key },
      })
      expect(detail.subtype).toBe(subtype)
    })
  }

  it('subtype is present on sub-locations GET', async () => {
    const parent = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': key },
      body: { name: `Parent ${Date.now()}`, subtype: 'region', visibility: 'members' },
    })
    await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: { 'X-API-Key': key },
      body: {
        name: `Child ${Date.now()}`,
        subtype: 'dungeon',
        parentId: parent.id,
        visibility: 'members',
      },
    })

    const subsBody = await api(
      `/api/campaigns/${campaignId}/locations/${parent.slug}/sub-locations`,
      {
        headers: { 'X-API-Key': key },
      },
    )
    const subs = subsBody.data ?? subsBody
    expect(subs.length).toBeGreaterThan(0)
    expect(subs[0].subtype).toBe('dungeon')
  })
})
