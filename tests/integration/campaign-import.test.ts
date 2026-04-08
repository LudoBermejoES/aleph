/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { unzipSync } from 'fflate'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, name = 'Test User') {
  await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { name, email, password: 'password123' },
  })
  const res = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password: 'password123' },
  })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, name = 'import-test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    body: { name },
  })
  return res.json()
}

function makeMinimalExport(name = 'Import Test Campaign') {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    generator: 'aleph',
    campaign: {
      id: 'old-campaign-id-' + Date.now(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description: 'A test campaign',
      isPublic: false,
      theme: null,
      contentDir: 'content/campaigns/old',
      createdBy: 'old-user-id',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    entities: [
      {
        id: 'old-entity-1',
        campaignId: 'old-campaign-id',
        type: 'location',
        name: 'The Tavern',
        slug: 'the-tavern',
        filePath: 'entities/the-tavern.md',
        visibility: 'members',
        createdBy: 'old-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  }
}

describe('Campaign Import API (integration)', () => {
  const ts = Date.now()
  const email = `import-${ts}@example.com`
  const email2 = `import2-${ts}@example.com`
  let cookie = ''
  let csrfToken = ''
  let apiKey = ''

  beforeAll(async () => {
    cookie = await signUpAndGetCookie(email, 'Import User')
    csrfToken = cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    const keyData = await createApiKey(cookie, `import-key-${ts}`)
    apiKey = keyData.key
    await signUpAndGetCookie(email2, 'Import User 2')
  })

  it('POST /api/campaigns/import returns 201 with id, name, slug', async () => {
    const payload = makeMinimalExport(`Import Full ${ts}`)
    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: payload,
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('slug')
    expect(data.name).toBe(`Import Full ${ts}`)
  })

  it('returns 401 for unauthenticated request', async () => {
    const res = await api('/api/campaigns/import', {
      method: 'POST',
      body: makeMinimalExport('Anon Import'),
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 for unsupported version', async () => {
    const payload = { ...makeMinimalExport(), version: '2.0' }
    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: payload,
    })
    expect(res.status).toBe(422)
    const data = await res.json()
    expect(data.message ?? data.statusMessage).toMatch(/version/i)
  })

  it('returns 422 for missing version field', async () => {
    const { version: _, ...payload } = makeMinimalExport() as Record<string, unknown>
    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: payload,
    })
    expect(res.status).toBe(422)
  })

  it('returns 422 for missing campaign envelope', async () => {
    const { campaign: _, ...payload } = makeMinimalExport() as Record<string, unknown>
    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: payload,
    })
    expect(res.status).toBe(422)
  })

  it('respects ?name= query override', async () => {
    const res = await api(`/api/campaigns/import?name=My+Renamed+Campaign+${ts}`, {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: makeMinimalExport('Original Name'),
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe(`My Renamed Campaign ${ts}`)
  })

  it('appends import suffix when campaign name already exists for user', async () => {
    const name = `Duplicate Name ${ts}`
    // First import
    const res1 = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: makeMinimalExport(name),
    })
    expect(res1.status).toBe(201)

    // Second import — same name
    const res2 = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: makeMinimalExport(name),
    })
    expect(res2.status).toBe(201)
    const data = await res2.json()
    expect(data.name).toMatch(/imported \d{4}-\d{2}-\d{2}/)
  })

  it('accepts X-API-Key authentication', async () => {
    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: makeMinimalExport(`API Key Import ${ts}`),
    })
    expect(res.status).toBe(201)
  })

  it('imports organizations, organizationMembers and organizationLocations with remapped IDs', async () => {
    const oldOrgId = 'old-org-' + ts
    const oldEntityId = 'old-entity-char-' + ts
    const oldCharId = 'old-char-' + ts
    const oldLocId = 'old-entity-loc-' + ts
    const payload = {
      ...makeMinimalExport(`Org Import ${ts}`),
      entities: [
        {
          id: oldEntityId,
          campaignId: 'old-campaign-id',
          type: 'character',
          name: 'Org Char',
          slug: 'org-char',
          filePath: 'entities/org-char.md',
          visibility: 'members',
          createdBy: 'old-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: oldLocId,
          campaignId: 'old-campaign-id',
          type: 'location',
          name: 'Org HQ',
          slug: 'org-hq',
          filePath: 'entities/org-hq.md',
          visibility: 'members',
          createdBy: 'old-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      characters: [{ id: oldCharId, entityId: oldEntityId, characterType: 'npc', status: 'alive' }],
      organizations: [
        {
          id: oldOrgId,
          campaignId: 'old-campaign-id',
          name: 'Imported Guild',
          slug: 'imported-guild',
          type: 'guild',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      organizationMembers: [{ organizationId: oldOrgId, characterId: oldCharId, role: 'leader' }],
      organizationLocations: [{ organizationId: oldOrgId, locationEntityId: oldLocId }],
    }

    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: payload,
    })
    expect(res.status).toBe(201)
    const data = await res.json()

    // Now export the imported campaign and verify organizations came through
    const exportRes = await api(`/api/campaigns/${data.id}/export`, {
      headers: { Cookie: cookie },
    })
    expect(exportRes.status).toBe(200)
    const zipBuf = Buffer.from(await exportRes.arrayBuffer())
    const unzipped = unzipSync(new Uint8Array(zipBuf))
    const exported = JSON.parse(Buffer.from(unzipped['campaign.json']!).toString('utf8'))

    expect(exported.organizations).toHaveLength(1)
    expect(exported.organizations[0].name).toBe('Imported Guild')
    expect(exported.organizations[0].id).not.toBe(oldOrgId)

    expect(exported.organizationMembers).toHaveLength(1)
    expect(exported.organizationMembers[0].role).toBe('leader')
    expect(exported.organizationMembers[0].organizationId).toBe(exported.organizations[0].id)

    expect(exported.organizationLocations).toHaveLength(1)
    expect(exported.organizationLocations[0].organizationId).toBe(exported.organizations[0].id)
  })

  it('imports the full real export fixture with all resource types', async () => {
    const payload = JSON.parse(
      readFileSync(resolve(__dirname, '../fixtures/campaign-export-full.json'), 'utf-8'),
    )
    // Give it a unique name so it doesn't conflict
    payload.campaign.name = `Fixture Import ${ts}`

    const res = await api('/api/campaigns/import', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: payload,
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBeTruthy()
    expect(data.name).toBe(`Fixture Import ${ts}`)
  })
})
