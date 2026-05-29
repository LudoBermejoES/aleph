import { test, expect } from '@playwright/test'
import { registerAndLogin, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

test.describe('Map tiles', () => {
  test('uploaded map generates tile pyramid and renders correctly', async ({ page }) => {
    test.setTimeout(120000)

    await registerAndLogin(page, `MapTile ${uid()}`)

    // Create campaign + map via API
    const campaign = (await apiFetch(page, '/api/campaigns', {
      method: 'POST',
      body: { name: `MapTile Camp ${uid()}` },
    })) as { id: string }
    const campaignId = campaign.id

    const map = (await apiFetch(page, `/api/campaigns/${campaignId}/maps`, {
      method: 'POST',
      body: { name: 'Pyramid Test Map' },
    })) as { slug: string }

    // Navigate to map page to get CSRF cookie
    await page.goto(`/campaigns/${campaignId}/maps/${map.slug}`)
    await page.waitForLoadState('networkidle')

    // Upload a 2048x1024 test image (generates 4 zoom levels: ceil(log2(2048/256)) = 3, so levels 0-2)
    const uploadResult = await page.evaluate(
      async ({ campaignId, slug }) => {
        const canvas = document.createElement('canvas')
        canvas.width = 2048
        canvas.height = 1024
        const ctx = canvas.getContext('2d')!

        // Draw a grid pattern so tiles are visually distinct
        for (let x = 0; x < 2048; x += 256) {
          for (let y = 0; y < 1024; y += 256) {
            const r = (((x / 256) * 37) % 200) + 55
            const g = (((y / 256) * 53) % 200) + 55
            const b = ((((x + y) / 256) * 71) % 200) + 55
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(x, y, 256, 256)
            ctx.fillStyle = '#fff'
            ctx.font = '20px sans-serif'
            ctx.fillText(`${x / 256},${y / 256}`, x + 10, y + 30)
          }
        }

        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png'),
        )

        const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1] || ''
        const form = new FormData()
        form.append('image', blob, 'pyramid-test.png')

        const headers: Record<string, string> = {}
        if (csrf) headers['X-CSRF-Token'] = csrf

        const res = await fetch(`/api/campaigns/${campaignId}/maps/${slug}/upload`, {
          method: 'POST',
          credentials: 'include',
          body: form,
          headers,
        })
        return { status: res.status, ok: res.ok, body: await res.json() }
      },
      { campaignId, slug: map.slug },
    )

    expect(uploadResult.ok).toBe(true)
    expect(uploadResult.body.width).toBe(2048)
    expect(uploadResult.body.height).toBe(1024)

    // Wait for tiling to complete
    let isTiled = false
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000)
      const mapData = (await apiFetch(page, `/api/campaigns/${campaignId}/maps/${map.slug}`)) as {
        isTiled: boolean
      }
      if (mapData.isTiled) {
        isTiled = true
        break
      }
    }
    expect(isTiled).toBe(true)

    // Verify tile pyramid by fetching tiles at each zoom level directly
    // maxZoom = ceil(log2(2048/256)) = 3, so levels 0, 1, 2
    const pyramidCheck = await page.evaluate(
      async ({ campaignId, slug }) => {
        const results: {
          z: number
          tilesChecked: number
          realTiles: number
          fallbackTiles: number
        }[] = []

        for (let z = 0; z < 3; z++) {
          // At zoom z, the grid is 2^z tiles wide (for a square image)
          const cols = Math.ceil((2048 * Math.pow(2, z)) / 2048) // simplified
          const rows = Math.ceil((1024 * Math.pow(2, z)) / 2048)
          let tilesChecked = 0
          let realTiles = 0
          let fallbackTiles = 0

          // Check a few tiles at this zoom level
          for (let x = 0; x < Math.min(cols + 1, 4); x++) {
            for (let y = 0; y < Math.min(rows + 1, 4); y++) {
              const res = await fetch(
                `/api/campaigns/${campaignId}/maps/${slug}/tiles/${z}/${x}/${y}`,
                { credentials: 'include' },
              )
              const blob = await res.blob()
              tilesChecked++
              if (blob.size > 100) {
                realTiles++ // Real tile data
              } else {
                fallbackTiles++ // 1px transparent fallback
              }
            }
          }

          results.push({ z, tilesChecked, realTiles, fallbackTiles })
        }

        // Also check that zoom level beyond max returns fallback
        const outOfRange = await fetch(`/api/campaigns/${campaignId}/maps/${slug}/tiles/10/0/0`, {
          credentials: 'include',
        })
        const outBlob = await outOfRange.blob()

        return { results, outOfRangeSize: outBlob.size }
      },
      { campaignId, slug: map.slug },
    )

    // Each zoom level should have at least 1 real tile
    for (const level of pyramidCheck.results) {
      expect(level.realTiles).toBeGreaterThan(0)
    }

    // Out-of-range tile should be tiny fallback
    expect(pyramidCheck.outOfRangeSize).toBeLessThan(200)

    // Reload map page and verify Leaflet renders tiles correctly
    await page.goto(`/campaigns/${campaignId}/maps/${map.slug}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // Check rendered tiles
    const tileInfo = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.leaflet-tile') as NodeListOf<HTMLImageElement>
      return Array.from(tiles).map((t) => ({
        src: t.getAttribute('src') || '',
        naturalWidth: t.naturalWidth,
        complete: t.complete,
      }))
    })

    expect(tileInfo.length).toBeGreaterThan(0)

    // Real tiles (within image bounds) should have non-negative Y and load actual images
    const realTiles = tileInfo.filter((t) => t.naturalWidth > 1 && t.complete)
    expect(realTiles.length).toBeGreaterThan(0)

    // All real tiles should have non-negative Y coordinates
    for (const tile of realTiles) {
      const parts = tile.src.split('/')
      const y = parseInt(parts[parts.length - 1])
      expect(y).toBeGreaterThanOrEqual(0)
    }
  })
})
