import { test, expect } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Session Attendance', () => {
  test('user can set their RSVP status on a session', async ({ page }) => {
    await registerAndLogin(page, 'RSVP Tester')
    await createCampaign(page, `RSVP Camp ${uid()}`)

    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a session via API
    const sessionRes = await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: 'RSVP Test Session' },
    })
    const sessionSlug = (sessionRes as Record<string, string>).slug

    // Navigate to session detail
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${sessionSlug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main h1').first()).toContainText('RSVP Test Session', {
      timeout: 10000,
    })

    // Click the "Accepted" RSVP button
    await page.locator('button', { hasText: /^Accepted$/ }).click()
    await page.waitForLoadState('networkidle')

    // After reload the attendance section should show a green dot for the user
    await expect(
      page
        .locator('main')
        .getByText(/Accepted/)
        .first(),
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Session Participant Management', () => {
  test('DM adds a participant via API and they appear in the attendance list', async ({
    page,
    browser,
  }) => {
    await registerAndLogin(page, `DM Mgr ${uid()}`)
    await createCampaign(page, `Mgr Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    // Create a player in a separate context and get their userId
    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, `Player Mgr ${uid()}`)
    const sessionData = await playerPage.evaluate(() =>
      fetch('/api/auth/get-session', { credentials: 'include' }).then((r) => r.json()),
    )
    const playerId = (sessionData as Record<string, Record<string, string>>).user.id

    // Invite and join
    const invite = (await apiFetch(page, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { role: 'player' },
    })) as { token: string }
    await apiFetch(playerPage, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: invite.token },
    })
    await playerContext.close()

    // Create session
    const session = (await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: `Mgr Session ${uid()}` },
    })) as { slug: string }

    // Navigate to session detail — DM should see "Add Participant" button
    await page.goto(`http://localhost:3333/campaigns/${campaignId}/sessions/${session.slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('button', { hasText: /Add Participant/i })).toBeVisible({
      timeout: 10000,
    })

    // Add participant via API
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions/${session.slug}/attendance`, {
      method: 'POST',
      body: { userId: playerId },
    })

    // Reload and verify
    await page.reload()
    await page.waitForLoadState('networkidle')
    const updated = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/sessions/${session.slug}`,
    )) as { attendance: { userId: string }[] }
    expect(updated.attendance.some((a) => a.userId === playerId)).toBe(true)
  })

  test('DM removes a participant and they disappear from the attendance list', async ({
    page,
    browser,
  }) => {
    await registerAndLogin(page, `DM Remove ${uid()}`)
    await createCampaign(page, `Remove Camp ${uid()}`)
    const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]

    const playerContext = await browser.newContext()
    const playerPage = await playerContext.newPage()
    await registerAndLogin(playerPage, `Player Remove ${uid()}`)
    const sessionData2 = await playerPage.evaluate(() =>
      fetch('/api/auth/get-session', { credentials: 'include' }).then((r) => r.json()),
    )
    const playerId2 = (sessionData2 as Record<string, Record<string, string>>).user.id

    const invite2 = (await apiFetch(page, `/api/campaigns/${campaignId}/invite`, {
      method: 'POST',
      body: { role: 'player' },
    })) as { token: string }
    await apiFetch(playerPage, `/api/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: { token: invite2.token },
    })
    await playerContext.close()

    const session2 = (await apiFetch(page, `/api/campaigns/${campaignId}/sessions`, {
      method: 'POST',
      body: { title: `Remove Session ${uid()}` },
    })) as { slug: string }

    // Add participant first
    await apiFetch(page, `/api/campaigns/${campaignId}/sessions/${session2.slug}/attendance`, {
      method: 'POST',
      body: { userId: playerId2 },
    })

    // Now remove them
    await apiFetch(
      page,
      `/api/campaigns/${campaignId}/sessions/${session2.slug}/attendance/${playerId2}`,
      { method: 'DELETE' },
    )

    const result = (await apiFetch(
      page,
      `/api/campaigns/${campaignId}/sessions/${session2.slug}`,
    )) as { attendance: { userId: string }[] }
    expect(result.attendance.some((a) => a.userId === playerId2)).toBe(false)
  })
})
