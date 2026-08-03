import { describe, it, expect, beforeAll } from 'vitest'
import { unzipSync } from 'fflate'
import { signUpAndLogin, signUpAndGetApiKey, apiRaw } from './helpers'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

// Helper: fetch export, return unzipped entries + parsed campaign.json
async function fetchExportZip(path: string, headers: Record<string, string>) {
  const res = await apiRaw(path, { headers })
  const buf = Buffer.from(await res.arrayBuffer())
  const unzipped = unzipSync(new Uint8Array(buf))
  const campaignJson = JSON.parse(Buffer.from(unzipped['campaign.json']!).toString('utf8'))
  const imageMap: Record<string, string> = unzipped['image-map.json']
    ? JSON.parse(Buffer.from(unzipped['image-map.json']!).toString('utf8'))
    : {}
  return { res, unzipped, campaignJson, imageMap }
}

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

  it('GET /export returns 200 with Content-Type application/zip for DM', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/zip')
  })

  it('GET /export ZIP contains campaign.json with version 1.2', async () => {
    const { campaignJson } = await fetchExportZip(`/api/campaigns/${campaignId}/export`, {
      Cookie: dmCookie,
    })
    expect(campaignJson.version).toBe('1.2')
    expect(campaignJson.generator).toBe('aleph')
    expect(campaignJson.exportedAt).toBeTruthy()
    expect(campaignJson.campaign).toMatchObject({ id: campaignId })
  })

  it('GET /export includes Content-Disposition header with .zip filename', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { Cookie: dmCookie },
    })
    expect(res.status).toBe(200)
    const disposition = res.headers.get('content-disposition') || ''
    expect(disposition).toContain('attachment')
    expect(disposition).toContain(campaignSlug)
    expect(disposition).toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(disposition).toContain('.zip')
  })

  it('GET /export?include=entities,characters ZIP has only those types', async () => {
    const { campaignJson } = await fetchExportZip(
      `/api/campaigns/${campaignId}/export?include=entities,characters`,
      { Cookie: dmCookie },
    )
    expect(campaignJson).toHaveProperty('campaign')
    expect(campaignJson).toHaveProperty('entities')
    expect(campaignJson).toHaveProperty('characters')
    expect(campaignJson).not.toHaveProperty('sessions')
    expect(campaignJson).not.toHaveProperty('maps')
    expect(campaignJson).not.toHaveProperty('rolls')
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

    const { campaignJson } = await fetchExportZip(`/api/campaigns/${campaignId}/export`, {
      Cookie: dmCookie,
    })
    expect(campaignJson.organizations).toBeDefined()
    expect(campaignJson.organizations.length).toBeGreaterThanOrEqual(1)
    const exportedOrg = campaignJson.organizations.find(
      (o: Record<string, unknown>) => o.name === 'Test Guild',
    )
    expect(exportedOrg).toBeDefined()
    expect(exportedOrg.type).toBe('guild')
    expect(campaignJson.organizationMembers).toBeDefined()
    expect(campaignJson.organizationMembers.length).toBeGreaterThanOrEqual(1)
    const exportedMember = campaignJson.organizationMembers.find(
      (m: Record<string, unknown>) => m.organizationId === exportedOrg.id,
    )
    expect(exportedMember).toBeDefined()
    expect(exportedMember.role).toBe('leader')
  })

  it('GET /export ignores invalid include keys', async () => {
    const { campaignJson } = await fetchExportZip(
      `/api/campaigns/${campaignId}/export?include=entities,foobar`,
      { Cookie: dmCookie },
    )
    expect(campaignJson).toHaveProperty('entities')
    expect(campaignJson).not.toHaveProperty('foobar')
  })
})

describe('Campaign Export ZIP Images (integration)', () => {
  const ts = Date.now()
  let apiKey = ''
  let campaignId = ''
  let entitySlug = ''

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

    // Create entity then upload image
    const entityRes = await apiRaw(`/api/campaigns/${campaignId}/entities`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      // Deliberately NOT a location: a location's image goes through its gallery and is packed
      // under `images/location-image-*` instead (see location-images-export.test.ts). This suite
      // guards the `images/entity-*-image.*` ZIP entry that every other entity type produces.
      body: { name: 'Image Entity', type: 'item', visibility: 'members' },
    })
    const entity = await entityRes.json()
    entitySlug = entity.slug

    const form = new FormData()
    form.append('image', new Blob([TINY_PNG], { type: 'image/png' }), 'portrait.png')
    await fetch(`${BASE_URL}/api/campaigns/${campaignId}/entities/${entitySlug}/image`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })
  })

  it('export version is 1.2', async () => {
    const { campaignJson } = await fetchExportZip(`/api/campaigns/${campaignId}/export`, {
      'X-API-Key': apiKey,
    })
    expect(campaignJson.version).toBe('1.2')
  })

  it('ZIP contains image file for entity image', async () => {
    const { unzipped, imageMap } = await fetchExportZip(`/api/campaigns/${campaignId}/export`, {
      'X-API-Key': apiKey,
    })
    const oldUrl = `/api/campaigns/${campaignId}/entities/${entitySlug}/image`
    const entryName = Object.entries(imageMap).find(([, url]) => url === oldUrl)?.[0]
    expect(entryName).toBeDefined()
    expect(unzipped[entryName!]).toBeDefined()
    // Verify bytes match the uploaded PNG
    expect(Buffer.from(unzipped[entryName!]!).compare(TINY_PNG)).toBe(0)
  })

  it('ZIP export + import round-trip rewrites entity imageUrl to new campaign', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/export`, {
      headers: { 'X-API-Key': apiKey },
    })
    expect(res.status).toBe(200)
    const zipBytes = Buffer.from(await res.arrayBuffer())

    // Import via multipart
    const form = new FormData()
    form.append('file', new Blob([zipBytes], { type: 'application/zip' }), 'export.zip')
    const importRes = await fetch(`${BASE_URL}/api/campaigns/import`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
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
    expect(imageEntity!.imageUrl as string).toContain(newCampaignId)
    expect(imageEntity!.imageUrl as string).not.toContain(campaignId)
  })

  it('JSON import with version 1.0 still succeeds (backward compat)', async () => {
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

  it('JSON import with version 1.1 still succeeds (backward compat)', async () => {
    const payload = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      generator: 'aleph',
      campaign: {
        id: 'old-id-11',
        name: `Legacy 1.1 Import ${ts}`,
        slug: `legacy-11-import-${ts}`,
        description: null,
        isPublic: false,
        theme: null,
        contentDir: 'content/campaigns/legacy11',
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

  it('JSON import with version 1.2 returns 422 (wrong path)', async () => {
    const res = await apiRaw('/api/campaigns/import', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { version: '1.2', campaign: { id: 'x', name: 'x' } },
    })
    expect(res.status).toBe(422)
  })

  it('malformed ZIP returns 422', async () => {
    const form = new FormData()
    form.append(
      'file',
      new Blob([Buffer.from('not a zip')], { type: 'application/zip' }),
      'bad.zip',
    )
    const res = await fetch(`${BASE_URL}/api/campaigns/import`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })
    expect(res.status).toBe(422)
  })

  it('ZIP missing campaign.json returns 422', async () => {
    const { zipSync } = await import('fflate')
    const zipBytes = Buffer.from(zipSync({ 'other.txt': Buffer.from('hello') }))
    const form = new FormData()
    form.append('file', new Blob([zipBytes], { type: 'application/zip' }), 'empty.zip')
    const res = await fetch(`${BASE_URL}/api/campaigns/import`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: form,
    })
    expect(res.status).toBe(422)
  })
})
