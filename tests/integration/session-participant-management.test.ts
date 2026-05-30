/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'

async function apiRaw(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  const res = await apiRaw(path, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${opts?.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
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

function getCsrf(cookie: string) {
  return cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
}

describe('Session Participant Management (integration)', () => {
  const suffix = Date.now()
  const dmEmail = `spm-dm-${suffix}@example.com`
  const playerEmail = `spm-pl-${suffix}@example.com`
  const outsiderEmail = `spm-out-${suffix}@example.com`

  let dmCookie = ''
  let playerCookie = ''
  let _outsiderCookie = ''
  let campaignId = ''
  let sessionSlug = ''
  let playerUserId = ''

  beforeAll(async () => {
    dmCookie = await signUpAndGetCookie(dmEmail, 'password123', 'SPM DM')
    playerCookie = await signUpAndGetCookie(playerEmail, 'password123', 'SPM Player')
    _outsiderCookie = await signUpAndGetCookie(outsiderEmail, 'password123', 'SPM Outsider')

    // Get player userId
    const playerRes = await apiRaw('/api/auth/get-session', { headers: { Cookie: playerCookie } })
    const playerData = await playerRes.json()
    playerUserId = playerData.user.id

    // DM creates campaign
    const campaign = (await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { name: `SPM Camp ${suffix}` },
    })) as { id: string; slug: string }
    campaignId = campaign.id

    // Invite and join player
    const invite = (await api(`/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { role: 'player' },
    })) as { token: string }
    await api(`/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': getCsrf(playerCookie) },
      body: { token: invite.token },
    })

    // Create a session
    const session = (await api(`/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { title: `SPM Session ${suffix}` },
    })) as { slug: string }
    sessionSlug = session.slug
  })

  const addUrl = () => `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance`
  const removeUrl = (userId: string) =>
    `/api/campaigns/${campaignId}/sessions/${sessionSlug}/attendance/${userId}`

  // ─── Add participant ───────────────────────────────────────────────────────

  it('3.1 DM can add a campaign member as participant', async () => {
    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: playerUserId },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify via session detail
    const session = (await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { Cookie: dmCookie },
    })) as { attendance: { userId: string }[] }
    expect(session.attendance.some((a) => a.userId === playerUserId)).toBe(true)
  })

  it('3.2 Add with explicit rsvpStatus updates the row', async () => {
    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: playerUserId, rsvpStatus: 'accepted' },
    })
    expect(res.status).toBe(200)

    const session = (await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { Cookie: dmCookie },
    })) as { attendance: { userId: string; rsvpStatus: string }[] }
    const row = session.attendance.find((a) => a.userId === playerUserId)
    expect(row?.rsvpStatus).toBe('accepted')
  })

  it('3.3 Re-adding an existing participant is idempotent (no duplicate)', async () => {
    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: playerUserId },
    })
    expect(res.status).toBe(200)

    const session = (await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { Cookie: dmCookie },
    })) as { attendance: { userId: string }[] }
    const rows = session.attendance.filter((a) => a.userId === playerUserId)
    expect(rows).toHaveLength(1)
  })

  it('3.4 Player cannot add participants (403)', async () => {
    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': getCsrf(playerCookie) },
      body: { userId: playerUserId },
    })
    expect(res.status).toBe(403)
  })

  it('3.5 Adding a non-member userId returns 404', async () => {
    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: 'non-existent-user-id' },
    })
    expect(res.status).toBe(404)
  })

  it('3.6 Missing userId in body returns 422', async () => {
    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { rsvpStatus: 'accepted' },
    })
    expect(res.status).toBe(422)
  })

  it('3.7 characterId from another campaign returns 422', async () => {
    // Create another campaign with a character
    const otherCamp = (await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { name: `Other Camp ${suffix}` },
    })) as { id: string }
    const char = (await api(`/api/campaigns/${otherCamp.id}/characters`, {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { name: 'Other Char', characterType: 'npc' },
    })) as { id: string }

    const res = await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: playerUserId, characterId: char.id },
    })
    expect(res.status).toBe(422)
  })

  it('3.8 Adding to unknown session slug returns 404', async () => {
    const res = await apiRaw(
      `/api/campaigns/${campaignId}/sessions/no-such-session-xyz/attendance`,
      {
        method: 'POST',
        headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
        body: { userId: playerUserId },
      },
    )
    expect(res.status).toBe(404)
  })

  // ─── Remove participant ────────────────────────────────────────────────────

  it('3.9 DM can remove a participant', async () => {
    // Ensure player is in attendance first
    await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: playerUserId },
    })

    const res = await apiRaw(removeUrl(playerUserId), {
      method: 'DELETE',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    const session = (await api(`/api/campaigns/${campaignId}/sessions/${sessionSlug}`, {
      headers: { Cookie: dmCookie },
    })) as { attendance: { userId: string }[] }
    expect(session.attendance.some((a) => a.userId === playerUserId)).toBe(false)
  })

  it('3.10 Removing a non-participant returns 404', async () => {
    const res = await apiRaw(removeUrl(playerUserId), {
      method: 'DELETE',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
    })
    // player was removed in previous test
    expect(res.status).toBe(404)
  })

  it('3.11 Player cannot remove participants (403)', async () => {
    // Add player back so remove logic is reached if permission check fails
    await apiRaw(addUrl(), {
      method: 'POST',
      headers: { Cookie: dmCookie, 'X-CSRF-Token': getCsrf(dmCookie) },
      body: { userId: playerUserId },
    })
    const res = await apiRaw(removeUrl(playerUserId), {
      method: 'DELETE',
      headers: { Cookie: playerCookie, 'X-CSRF-Token': getCsrf(playerCookie) },
    })
    expect(res.status).toBe(403)
  })
})
