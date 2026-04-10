import { describe, it, expect, beforeAll } from 'vitest'
import { signUpAndLogin, apiRaw } from './helpers'

describe('Direct member add (integration)', () => {
  const dmEmail = `direct-dm-${Date.now()}@example.com`
  const editorEmail = `direct-editor-${Date.now()}@example.com`
  const targetEmail = `direct-target-${Date.now()}@example.com`
  const target2Email = `direct-target2-${Date.now()}@example.com`

  let dmCookie = ''
  let dmCsrf = ''
  let editorCookie = ''
  let editorCsrf = ''
  let campaignId = ''
  let targetUserId = ''
  let target2UserId = ''

  beforeAll(async () => {
    const dm = await signUpAndLogin(dmEmail, 'password123', 'Direct DM')
    dmCookie = dm.cookie
    dmCsrf = dm.csrfToken

    // Create campaign
    const campRes = await apiRaw('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { name: `Direct Add Test ${Date.now()}` },
    })
    campaignId = (await campRes.json()).id

    // Register target user and get their ID via search
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Direct Target', email: targetEmail, password: 'password123' },
    })
    const searchRes = await apiRaw(`/api/users/search?q=${encodeURIComponent(targetEmail)}`, {
      headers: { Cookie: dmCookie },
    })
    targetUserId = (await searchRes.json())[0].id

    // Register second target user
    await apiRaw('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'Direct Target2', email: target2Email, password: 'password123' },
    })
    const search2Res = await apiRaw(`/api/users/search?q=${encodeURIComponent(target2Email)}`, {
      headers: { Cookie: dmCookie },
    })
    target2UserId = (await search2Res.json())[0].id

    // Register editor and add via invite
    const editor = await signUpAndLogin(editorEmail, 'password123', 'Direct Editor')
    editorCookie = editor.cookie
    editorCsrf = editor.csrfToken

    const inviteRes = await apiRaw(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { role: 'editor' },
    })
    const token = (await inviteRes.json()).token
    await apiRaw(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: editorCookie, 'X-CSRF-Token': editorCsrf },
      body: { token },
    })
  })

  it('DM can directly add an existing user as player', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { userId: targetUserId, role: 'player' },
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.userId).toBe(targetUserId)
    expect(data.role).toBe('player')
    expect(data.name).toBe('Direct Target')
  })

  it('returns 409 when user is already a member', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { userId: targetUserId, role: 'player' },
    })
    expect(res.status).toBe(409)
  })

  it('returns 404 when userId does not exist', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { userId: 'nonexistent-user-id', role: 'player' },
    })
    expect(res.status).toBe(404)
  })

  it('returns 403 when editor tries to add a member', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
      method: 'POST',
      headers: { Cookie: editorCookie, 'X-CSRF-Token': editorCsrf },
      body: { userId: target2UserId, role: 'player' },
    })
    expect(res.status).toBe(403)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
      method: 'POST',
      body: { userId: target2UserId, role: 'player' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 4xx for invalid role', async () => {
    const res = await apiRaw(`/api/campaigns/${campaignId}/members/direct`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': dmCsrf },
      body: { userId: target2UserId, role: 'god' },
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})
