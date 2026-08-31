import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { registerAndLogin, createCampaign, apiFetch } from './helpers'

const uid = () => Date.now().toString(36).slice(-4)

/**
 * Ver el mapa a ventana completa.
 *
 * La prueba que de verdad importa aquí no es que el contenedor crezca -- eso es CSS y falla
 * a la vista -- sino que los PINES NO SE DESPLACEN al crecer. Leaflet guarda el tamaño de su
 * contenedor en caché y traduce coordenadas a píxeles con ese valor; si el contenedor cambia
 * de tamaño y nadie llama a `invalidateSize()`, no salta ningún error: el mapa simplemente
 * queda descuadrado, con los pines lejos de donde el puntero dice que están.
 *
 * Se mide sin acceso al objeto `map` de Leaflet, que no está expuesto en `window`, y sin
 * capturas: cada mapa se crea con UN pin colocado exactamente en el centro que ese mapa
 * declara, así que la posición correcta de su marcador es, por definición, el centro del
 * contenedor. Basta con comparar dos cajas del DOM. Con el aviso de tamaño puesto, el desfase
 * es de un pixel; sin él es de cientos.
 */

/** Desfase, en píxeles, entre el centro del marcador y el centro del contenedor del mapa. */
async function pinOffsetFromCentre(page: Page) {
  const container = await page.locator('.leaflet-container').boundingBox()
  const pin = await page.locator('.custom-pin').first().boundingBox()
  expect(container, 'no se encontró el contenedor del mapa').not.toBeNull()
  expect(pin, 'no se encontró el marcador del pin').not.toBeNull()
  return {
    dx: pin!.x + pin!.width / 2 - (container!.x + container!.width / 2),
    dy: pin!.y + pin!.height / 2 - (container!.y + container!.height / 2),
    container: container!,
  }
}

/** Un pin bien colocado cae en el centro; el margen cubre el redondeo a píxel entero. */
const TOLERANCE = 3

async function expectPinCentred(page: Page, when: string) {
  await expect
    .poll(
      async () => {
        const { dx, dy } = await pinOffsetFromCentre(page)
        return Math.round(Math.max(Math.abs(dx), Math.abs(dy)))
      },
      {
        message: `el pin del centro del mapa está descuadrado ${when}`,
        timeout: 5000,
      },
    )
    .toBeLessThanOrEqual(TOLERANCE)
}

async function openMapWithCentredPin(
  page: Page,
  opts: { name: string; body: Record<string, unknown>; pin: { lat: number; lng: number } },
) {
  const campaignId = page.url().split('/campaigns/')[1]?.split('/')[0]
  const created = (await apiFetch(page, `/api/campaigns/${campaignId}/maps`, {
    method: 'POST',
    body: { name: opts.name, ...opts.body },
  })) as { slug: string }

  await apiFetch(page, `/api/campaigns/${campaignId}/maps/${created.slug}/pins`, {
    method: 'POST',
    body: { label: 'Centro', lat: opts.pin.lat, lng: opts.pin.lng, color: '#ff0000' },
  })

  await page.goto(`/campaigns/${campaignId}/maps/${created.slug}`)
  await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.custom-pin').first()).toBeVisible({ timeout: 15000 })
  return { campaignId, slug: created.slug }
}

/**
 * Los mosaicos reales de OpenStreetMap no se piden nunca desde una prueba: su política de
 * uso lo prohíbe (misma razón que el geocodificador en `map-osm.spec.ts`) y además haría la
 * suite dependiente de la red. Que no lleguen no afecta a lo que se mide: la posición de un
 * marcador la calcula Leaflet, no el mosaico de debajo.
 */
async function stubTiles(page: Page) {
  await page.route('**/tile.openstreetmap.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }),
  )
}

/**
 * Un mapa de imagen sin imagen usa las dimensiones por defecto del visor (1024x768) y
 * encuadra la imagen entera, así que su centro es el píxel (512, 384) -- ahí va el pin.
 * Un mapa `osm` declara su propio centro y el pin va en esas mismas coordenadas.
 */
const MAPS = [
  {
    kind: 'image (CRS.Simple, coordenadas en píxeles)',
    body: {},
    pin: { lat: 384, lng: 512 },
  },
  {
    kind: 'osm (WGS84, mosaicos reales)',
    body: { type: 'osm', centerLat: 52.52, centerLng: 13.405, defaultZoom: 12 },
    pin: { lat: 52.52, lng: 13.405 },
  },
]

for (const { kind, body, pin } of MAPS) {
  /**
   * Un solo test por tipo de mapa, y no uno por aserción, a propósito: cada uno arranca con
   * un registro + una campaña + un mapa, y multiplicar esa preparación por seis fue lo que
   * hizo la primera versión de esta suite inestable en un servidor de desarrollo compartido.
   * Lo que se comprueba es el RECORRIDO completo, que además es como se usa.
   */
  test(`expandir, volver, y el pin sigue en su sitio — ${kind}`, async ({ page }) => {
    await stubTiles(page)
    await registerAndLogin(page, 'Fullscreen Map')
    await createCampaign(page, `FS Camp ${uid()}`)
    await openMapWithCentredPin(page, { name: `FS Map ${uid()}`, body, pin })

    const viewport = page.locator('[data-testid="map-viewport"]')
    const toggle = page.locator('[data-testid="map-viewport-toggle"]')
    const hint = page.locator('[data-testid="map-viewport-hint"]')

    // ── El estado inicial, que es el único con el que se abre un mapa ──
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(viewport).toHaveAttribute('data-expanded', 'false')
    // El aviso de «pulsa Esc» solo cuando hay algo de lo que salir.
    await expect(hint).toHaveCount(0)

    const inlineBox = (await pinOffsetFromCentre(page)).container
    await expectPinCentred(page, 'antes de expandir')

    // ── Expandir, con el teclado: el control tiene que ser alcanzable sin ratón ──
    await toggle.focus()
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(viewport).toHaveAttribute('data-expanded', 'true')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(hint).toBeVisible()

    const size = page.viewportSize()!
    const expandedBox = (await pinOffsetFromCentre(page)).container
    expect(expandedBox.width, 'el mapa expandido debe ser más ancho').toBeGreaterThan(
      inlineBox.width,
    )
    expect(
      expandedBox.height,
      'el mapa expandido debe ocupar el alto de la ventana',
    ).toBeGreaterThan(size.height - 20)
    // La comprobación de verdad: con el contenedor ya crecido, ¿sigue el pin en su sitio?
    await expectPinCentred(page, 'con el mapa expandido')

    // ── Volver con Escape ──
    await page.keyboard.press('Escape')
    await expect(viewport).toHaveAttribute('data-expanded', 'false')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(hint).toHaveCount(0)

    const backBox = (await pinOffsetFromCentre(page)).container
    expect(Math.round(backBox.width)).toBe(Math.round(inlineBox.width))
    expect(Math.round(backBox.height)).toBe(Math.round(inlineBox.height))
    await expectPinCentred(page, 'después de volver con Escape')

    // ── Y el botón también reduce, no solo expande ──
    await toggle.click()
    await expect(viewport).toHaveAttribute('data-expanded', 'true')
    await toggle.click()
    await expect(viewport).toHaveAttribute('data-expanded', 'false')
    await expectPinCentred(page, 'después de reducir con el botón')
  })
}
