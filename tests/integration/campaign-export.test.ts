import { describe, it, expect, beforeAll } from 'vitest'
import { signUpAndLogin, signUpAndGetApiKey, apiRaw } from './helpers'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('Campaign Export API (integration)', () => {
  const ts = Date.now()
  let dmCookie = ''
  let dmCsrfToken = ''
  let playerCookie = ''
  let outsiderCookie = ''
  let campaignId = ''
  let campaignSlug = ''

  beforeAll(async () => {
    ;({ cookie: dmCookie, csrfToken: dmCsrfToken } = await signUpAndLogin(
      `export-dm-${ts}@example.com`,
      'password123',
      'Export DM',
    ))
    ;({ cookie: playerCookie } = await signUpAndLogin(
      `export-player-${ts}@example.com`,
      'password123',
      'Export Player',
    ))
    const playerCsrfToken = playerCookie.match(/csrf_token=([^;]+)/)?.[1] || ''
    ;({ cookie: outsiderCookie } = await signUpAndLogin(
      `export-outsider-${ts}@example.com`,
      'password123',
      'Export Outsider',
    ))

    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { name: `Export Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id
    campaignSlug = camp.slug

    // Invite and add player
    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { role: 'player' },
    })
    const { token } = await inviteRes.json()
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': playerCsrfToken },
      body: { token },
    })
  })

  it('GET /export returns 200 with valid JSON for DM', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.version).toBe('1.1')
    expect(data.generator).toBe('aleph')
    expect(data.exportedAt).toBeTruthy()
    expect(data.campaign).toMatchObject({ id: campaignId })
  })

  it('GET /export includes Content-Disposition header with correct filename', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const disposition = res.headers.get('content-disposition') || ''
    expect(disposition).toContain('attachment')
    expect(disposition).toContain(campaignSlug)
    expect(disposition).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(disposition).toContain('.json')
  })

  it('GET /export?include=entities,characters returns only those types', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export?include=entities,characters`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('campaign')
    expect(data).toHaveProperty('entities')
    expect(data).toHaveProperty('characters')
    expect(data).not.toHaveProperty('sessions')
    expect(data).not.toHaveProperty('maps')
    expect(data).not.toHaveProperty('rolls')
  })

  it('GET /export returns 403 for player role', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: playerCookie },
    })
    expect(res.status).toBe(403)
  })

  it('GET /export returns 401 for unauthenticated request', async () => {
    const res = await fetch(`${BASE_URL}/api/campaigns/${campaignId}/export`)
    expect(res.status).toBe(401)
  })

  it('GET /export returns 404 for non-existent campaign', async () => {
    const res = await apiRaw(`/api/campaigns/nonexistent-campaign-id/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(404)
  })

  it('GET /export returns 403 for non-member', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: outsiderCookie },
    })
    expect(res.status).toBe(403)
  })

  it('GET /export includes organizations in full export', async () => {
    const charRes = await apiRaw(`/api/campaigns/${campaignId}/characters`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { name: 'Org Test Char', characterType: 'npc' },
    })
    const char = await charRes.json()

    const orgRes = await apiRaw(`/api/campaigns/${campaignId}/organizations`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { name: 'Test Guild', type: 'guild' },
    })
    const org = await orgRes.json()

    await apiRaw(`/api/campaigns/${campaignId}/organizations/${org.slug}/members`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrfToken },
      body: { characterId: char.id, role: 'leader' },
    })

    const exportRes = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(exportRes.status).toBe(200)
    const data = await exportRes.json()
    expect(data.organizations).toBeDefined()
    expect(data.organizations.length).toBeGreaterThanOrEqual(1)
    const exportedOrg = data.organizations.find(
      (o: Record<string, unknown>) => o.name === 'Test Guild',
    )
    expect(exportedOrg).toBeDefined()
    expect(exportedOrg.type).toBe('guild')
    expect(data.organizationMembers).toBeDefined()
    expect(data.organizationMembers.length).toBeGreaterThanOrEqual(1)
    const exportedMember = data.organizationMembers.find(
      (m: Record<string, unknown>) => m.organizationId === exportedOrg.id,
    )
    expect(exportedMember).toBeDefined()
    expect(exportedMember.role).toBe('leader')
  })

  it('GET /export ignores invalid include keys', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export?include=entities,foobar`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('entities')
    expect(data).not.toHaveProperty('foobar')
  })
})

describe('Campaign Export Images (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campaignId = ''
  let uploadedUrl = ''

  beforeAll(async () => {
    apiKey = await signUpAndGetApiKey(
      `img-export-dm-${ts}@example.com`,
      'password123',
      'Image Export DM',
    )

    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Image Export Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id

    // Create the entity first to get its slug
    const entityRes = await apiRaw(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Image Entity', type: 'location', visibility: 'members' },
    })
    const entity = await entityRes.json()

    // Upload image to the entity via the dedicated image endpoint
    const form = new FormData()
    form.append('image', new Blob([TINY_PNG], { type: 'image/png' }), 'portrait.png')
    await fetch(`${BASE_URL}/api/campaigns/${campaignId}/entities/${entity.slug}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })

    uploadedUrl = `/api/campaigns/${campaignId}/entities/${entity.slug}/image`
  })

  it('export version is 1.1', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { 'X-API-Key': apiKey },
    })
    const data = await res.json()
    expect(data.version).toBe('1.1')
  })

  it('export images map contains the uploaded image as a base64 data URI', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { 'X-API-Key': apiKey },
    })
    const data = await res.json()
    expect(data.images).toBeDefined()
    expect(data.images[uploadedUrl]).toMatch(/^data:image\/(png|jpeg|webp|gif);base64,/)
  })

  it('export + import round-trip rewrites image URL to new campaign', async () => {
    const exportRes = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { 'X-API-Key': apiKey },
    })
    const exportData = await exportRes.json()
    expect(exportData.images[uploadedUrl]).toBeTruthy()

    const importRes = await apiRaw('/api/campaigns/import', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: exportData,
    })
    expect(importRes.status).toBe(201)
    const imported = await importRes.json()
    const newCampaignId = imported.id

    const entitiesRes = await apiRaw(`/api/campaigns/${newCampaignId}/entities`, {
      headers: { 'X-API-Key': apiKey },
    })
    const entitiesData = await entitiesRes.json()
    const imageEntity = (entitiesData.entities as Record<string, unknown>[]).find(
      (e) => e.name === 'Image Entity',
    )
    expect(imageEntity).toBeDefined()
    expect(imageEntity.imageUrl).toContain(newCampaignId)
    expect(imageEntity.imageUrl).not.toContain(campaignId)
  })

  it('import a 1.0 export (no images key) succeeds with status 201', async () => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      generator: 'aleph',
      campaign: {
        id: 'old-id',
        name: `Legacy Import ${ts}`,
        slug: `legacy-import-${ts}`,
        description: null,
        isPublic: false,
        theme: null,
        contentDir: 'content/campaigns/legacy',
        createdBy: 'someone',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
    const res = await apiRaw('/api/campaigns/import', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: payload,
    })
    expect(res.status).toBe(201)
  })

  it('import with version 1.1 succeeds', async () => {
    const exportRes = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { 'X-API-Key': apiKey },
    })
    const exportData = await exportRes.json()
    const res = await apiRaw('/api/campaigns/import', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: exportData,
    })
    expect(res.status).toBe(201)
  })

  it('import with unsupported version 2.0 returns 422', async () => {
    const res = await apiRaw('/api/campaigns/import', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { version: '2.0', campaign: { id: 'x', name: 'x' } },
    })
    expect(res.status).toBe(422)
  })
})
