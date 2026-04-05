import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function api(path: string, opts?: RequestInit & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Origin': BASE_URL, ...opts?.headers },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

async function signUpAndGetCookie(email: string, password = 'password123', name = 'Test User') {
  await api('/api/auth/sign-up/email', { method: 'POST', body: { name, email, password } })
  const res = await api('/api/auth/sign-in/email', { method: 'POST', body: { email, password } })
  const cookies = res.headers.get('set-cookie') || ''
  const match = cookies.match(/better-auth\.session_token=([^;]+)/)
  const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
  // Trigger CSRF token generation
  const getRes = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
  const setCookie = getRes.headers.get('set-cookie') || ''
  const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  return csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie
}

async function createApiKey(cookie: string, keyName = 'test-key') {
  const csrfMatch = cookie.match(/csrf_token=([^;]+)/)
  const csrfToken = csrfMatch?.[1] || ''
  const res = await api('/api/apikeys', { method: 'POST', headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken }, body: { name: keyName } })
  return res.json()
}

describe('Arc and Chapter CRUD (integration)', () => {
  const ts = Date.now()
  const email = `arc-chapter-crud-${ts}@example.com`
  let apiKey = ''
  let campaignId = ''

  beforeAll(async () => {
    const cookie = await signUpAndGetCookie(email)
    const keyData = await createApiKey(cookie, 'arc-chapter-crud-key')
    apiKey = keyData.key

    const campRes = await api('/api/campaigns', {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Arc Chapter CRUD Test ${ts}` },
    })
    const camp = await campRes.json()
    campaignId = camp.id
  })

  it('POST arc creates an arc and returns id', async () => {
    const res = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Probe Arc', status: 'planned' },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data.name).toBe('Probe Arc')
  })

  it('PUT arc updates name and GET reflects the change', async () => {
    const createRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Act One', status: 'active' },
    })
    const created = await createRes.json()
    const arcId = created.id

    // Get arc list to find slug
    const listRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcs = await listRes.json()
    const arc = arcs.find((a: any) => a.id === arcId)
    expect(arc).toBeDefined()
    const slug = arc.slug

    const putRes = await api(`/api/campaigns/${campaignId}/arcs/${slug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Updated Act One' },
    })
    expect(putRes.status).toBe(200)
    const putData = await putRes.json()
    expect(putData.success).toBe(true)

    const listRes2 = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcs2 = await listRes2.json()
    const updated = arcs2.find((a: any) => a.id === arcId)
    expect(updated?.name).toBe('Updated Act One')
  })

  it('POST chapter creates a chapter linked to an arc', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Arc For Chapter', status: 'planned' },
    })
    const arc = await arcRes.json()

    const chapterRes = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Chapter 1', arcId: arc.id },
    })
    expect(chapterRes.status).toBe(200)
    const chapter = await chapterRes.json()
    expect(chapter).toHaveProperty('id')
    expect(chapter.name).toBe('Chapter 1')
  })

  it('PUT chapter updates name', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Arc For Chapter Put', status: 'planned' },
    })
    const arc = await arcRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcFull = arcList.find((a: any) => a.id === arc.id)
    const arcSlug = arcFull.slug

    const chapterRes = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: `Original Chapter ${ts}`, arcId: arc.id },
    })
    const chapter = await chapterRes.json()
    const chapterId = chapter.id

    // Get chapter slug via arc list
    const arcListRes2 = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList2 = await arcListRes2.json()
    const arcWithChapters = arcList2.find((a: any) => a.id === arc.id)
    const chapterFull = arcWithChapters.chapters.find((c: any) => c.id === chapterId)
    const chapterSlug = chapterFull.slug

    const putRes = await api(`/api/campaigns/${campaignId}/chapters/${chapterSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Updated Chapter' },
    })
    expect(putRes.status).toBe(200)
    const putData = await putRes.json()
    expect(putData.success).toBe(true)

    const arcListRes3 = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList3 = await arcListRes3.json()
    const arcWithUpdated = arcList3.find((a: any) => a.id === arc.id)
    const updatedChapter = arcWithUpdated.chapters.find((c: any) => c.id === chapterId)
    expect(updatedChapter?.name).toBe('Updated Chapter')
  })

  it('DELETE arc nullifies session arcId', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Arc To Delete With Session', status: 'active' },
    })
    const arc = await arcRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcFull = arcList.find((a: any) => a.id === arc.id)
    const arcSlug = arcFull.slug

    const sessionRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        title: `Session Linked To Arc ${ts}`,
        scheduledDate: '2024-01-01T00:00:00.000Z',
        arcId: arc.id,
      },
    })
    expect(sessionRes.status).toBe(200)
    const session = await sessionRes.json()

    const delRes = await api(`/api/campaigns/${campaignId}/arcs/${arcSlug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    const sessionsRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      headers: { 'X-API-Key': apiKey },
    })
    const sessionsBody = await sessionsRes.json()
    const sessionsList = sessionsBody.data ?? sessionsBody
    const updatedSession = sessionsList.find((s: any) => s.id === session.id)
    expect(updatedSession?.arcId).toBeNull()
  })

  it('DELETE chapter nullifies session chapterId', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Arc For Chapter Delete Test', status: 'active' },
    })
    const arc = await arcRes.json()

    const chapterRes = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Chapter To Delete', arcId: arc.id },
    })
    const chapter = await chapterRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcWithChapters = arcList.find((a: any) => a.id === arc.id)
    const chapterFull = arcWithChapters.chapters.find((c: any) => c.id === chapter.id)
    const chapterSlug = chapterFull.slug

    const sessionRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: {
        title: `Session Linked To Chapter ${ts}`,
        scheduledDate: '2024-01-01T00:00:00.000Z',
        arcId: arc.id,
        chapterId: chapter.id,
      },
    })
    expect(sessionRes.status).toBe(200)
    const session = await sessionRes.json()

    const delRes = await api(`/api/campaigns/${campaignId}/chapters/${chapterSlug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': apiKey },
    })
    expect(delRes.status).toBe(200)

    const sessionsRes = await api(`/api/campaigns/${campaignId}/sessions`, {
      headers: { 'X-API-Key': apiKey },
    })
    const sessionsBody = await sessionsRes.json()
    const sessionsList = sessionsBody.data ?? sessionsBody
    const updatedSession = sessionsList.find((s: any) => s.id === session.id)
    expect(updatedSession?.chapterId).toBeNull()
  })

  it('PUT arc by player returns 403', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Restricted Arc', status: 'planned' },
    })
    const arc = await arcRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcFull = arcList.find((a: any) => a.id === arc.id)
    const arcSlug = arcFull.slug

    const playerEmail = `arc-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'arc-player-put-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/arcs/${arcSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE arc by player returns 403', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Delete Restricted Arc', status: 'planned' },
    })
    const arc = await arcRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcFull = arcList.find((a: any) => a.id === arc.id)
    const arcSlug = arcFull.slug

    const playerEmail = `arc-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'arc-player-del-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/arcs/${arcSlug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })

  it('PUT chapter by player returns 403', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Arc For Player Chapter Test', status: 'planned' },
    })
    const arc = await arcRes.json()

    const chapterRes = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Restricted Chapter', arcId: arc.id },
    })
    const chapter = await chapterRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcWithChapters = arcList.find((a: any) => a.id === arc.id)
    const chapterFull = arcWithChapters.chapters.find((c: any) => c.id === chapter.id)
    const chapterSlug = chapterFull.slug

    const playerEmail = `chapter-player-put-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'chapter-player-put-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/chapters/${chapterSlug}`, {
      method: 'PUT',
      headers: { 'X-API-Key': playerApiKey },
      body: { name: 'Should Fail' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE chapter by player returns 403', async () => {
    const arcRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Arc For Player Chapter Delete Test', status: 'planned' },
    })
    const arc = await arcRes.json()

    const chapterRes = await api(`/api/campaigns/${campaignId}/chapters`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { name: 'Player Delete Restricted Chapter', arcId: arc.id },
    })
    const chapter = await chapterRes.json()

    const arcListRes = await api(`/api/campaigns/${campaignId}/arcs`, {
      headers: { 'X-API-Key': apiKey },
    })
    const arcList = await arcListRes.json()
    const arcWithChapters = arcList.find((a: any) => a.id === arc.id)
    const chapterFull = arcWithChapters.chapters.find((c: any) => c.id === chapter.id)
    const chapterSlug = chapterFull.slug

    const playerEmail = `chapter-player-del-${ts}@example.com`
    const playerCookie = await signUpAndGetCookie(playerEmail)
    const playerKeyData = await createApiKey(playerCookie, 'chapter-player-del-key')
    const playerApiKey = playerKeyData.key

    const inviteRes = await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: { role: 'player' },
    })
    const invite = await inviteRes.json()
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie },
      body: { token: invite.token },
    })

    const res = await api(`/api/campaigns/${campaignId}/chapters/${chapterSlug}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': playerApiKey },
    })
    expect(res.status).toBe(403)
  })
})
