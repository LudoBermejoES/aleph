// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { readFileSync } from 'fs'
import { resolve } from 'path'
// `vi.mock` lo iza vitest por encima de los imports, así que el visor se carga ya con el
// doble de Leaflet puesto aunque el import esté aquí arriba.
import MapViewer from '../../../app/components/MapViewer.client.vue'

/**
 * El control de «ventana completa» del visor de mapas, montado de verdad.
 *
 * Lo que esto guarda y `tests/unit/map-viewport.test.ts` no puede guardar es el CABLEADO: que
 * cada transición termine en un `invalidateSize()` sobre el mapa. Sin él Leaflet sigue
 * traduciendo píxeles a coordenadas con el tamaño viejo del contenedor y el mapa pinta mal
 * SIN lanzar ningún error -- bandas grises y pines desplazados respecto al puntero. Un fallo
 * mudo solo lo caza una prueba que mire la llamada.
 *
 * Leaflet va sustituido por un doble porque jsdom no tiene layout: `clientWidth` es 0 y el
 * Leaflet real no llega a considerar que su contenedor haya cambiado de tamaño nunca. La
 * comprobación de que los pines NO se desplazan de verdad, con Leaflet real y píxeles reales,
 * está en `tests/e2e/map-fullscreen.spec.ts`, que es donde puede hacerse.
 */

// ─── El doble de Leaflet ─────────────────────────────────────────────────────

interface FakeMap {
  invalidateSize: ReturnType<typeof vi.fn>
  setView: ReturnType<typeof vi.fn>
  fitBounds: ReturnType<typeof vi.fn>
  getCenter: () => { lat: number; lng: number }
  getZoom: () => number
  getMinZoom: () => number
  getMaxZoom: () => number
  on: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  mouseEventToLatLng: ReturnType<typeof vi.fn>
  /** Orden de llegada de las llamadas que nos importan, para poder exigir su secuencia. */
  calls: string[]
}

let lastMap: FakeMap | null = null

function makeFakeMap(): FakeMap {
  const calls: string[] = []
  let center = { lat: 0, lng: 0 }
  let zoom = 0
  const map: FakeMap = {
    calls,
    invalidateSize: vi.fn(() => {
      calls.push('invalidateSize')
    }),
    setView: vi.fn((c: { lat: number; lng: number } | [number, number], z: number) => {
      center = Array.isArray(c) ? { lat: c[0], lng: c[1] } : { lat: c.lat, lng: c.lng }
      zoom = z
      calls.push('setView')
      return map
    }),
    fitBounds: vi.fn(() => map),
    getCenter: () => center,
    getZoom: () => zoom,
    getMinZoom: () => 0,
    getMaxZoom: () => 19,
    on: vi.fn(),
    remove: vi.fn(),
    mouseEventToLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
  }
  return map
}

vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('@geoman-io/leaflet-geoman-free', () => ({}))
vi.mock('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css', () => ({}))

vi.mock('leaflet', () => {
  const chainable = () => ({ addTo: () => chainable() })
  return {
    map: () => {
      lastMap = makeFakeMap()
      return lastMap
    },
    tileLayer: () => chainable(),
    geoJSON: () => chainable(),
    latLngBounds: () => ({ pad: () => ({}) }),
    divIcon: (o: unknown) => o,
    marker: () => {
      const m = {
        addTo: () => m,
        on: () => m,
        bindPopup: () => m,
        setIcon: () => m,
        setLatLng: () => m,
        getLatLng: () => ({ lat: 0, lng: 0 }),
        openPopup: () => m,
        getPopup: () => null,
        remove: () => m,
        dragging: { enable: () => {}, disable: () => {} },
      }
      return m
    },
    CRS: { Simple: {} },
  }
})

// Se lee el fichero, no se importa: el plugin de vite de nuxt/i18n precompila un JSON de
// locale importado a AST de mensajes, y entonces el rótulo del botón sería un objeto.
const es = JSON.parse(
  readFileSync(resolve(__dirname, '../../../i18n/locales/es.json'), 'utf-8'),
) as Record<string, Record<string, string>>

const i18n = createI18n({ legacy: false, locale: 'es', messages: { es } })

const PIN = { id: 'p1', label: 'Berghain', lat: 52.51, lng: 13.44 }

/** Los dos tipos de mapa que existen. Todo lo de aquí debe valer para los dos. */
const MAP_TYPES = [
  {
    name: 'image (CRS.Simple, coordenadas en píxeles)',
    props: { mapType: 'image' as const, imageWidth: 1024, imageHeight: 768, height: 600 },
  },
  {
    name: 'osm (WGS84, mosaicos reales)',
    props: {
      mapType: 'osm' as const,
      centerLat: 52.52,
      centerLng: 13.405,
      defaultZoom: 12,
      tileUrl: 'https://tile.example/{z}/{x}/{y}.png',
      height: 600,
    },
  },
]

async function mountViewer(extra: Record<string, unknown>) {
  const wrapper = mount(MapViewer, {
    props: { pins: [PIN], ...extra },
    global: { plugins: [i18n] },
  })
  await flushPromises()
  return wrapper
}

const viewport = (w: Awaited<ReturnType<typeof mountViewer>>) =>
  w.get('[data-testid="map-viewport"]')
const toggle = (w: Awaited<ReturnType<typeof mountViewer>>) =>
  w.get('[data-testid="map-viewport-toggle"]')

function pressEscape() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

beforeEach(() => {
  lastMap = null
  document.body.style.overflow = ''
})
afterEach(() => {
  document.body.style.overflow = ''
})

describe.each(MAP_TYPES)('MapViewer — ventana completa sobre un mapa $name', ({ props }) => {
  it('ofrece el control YA en el estado inicial, que es el único con el que se abre un mapa', async () => {
    const w = await mountViewer(props)
    const btn = toggle(w)
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain(es.maps.expand)
    expect(btn.attributes('aria-pressed')).toBe('false')
    expect(viewport(w).attributes('data-expanded')).toBe('false')
  })

  it('el mapa arranca reducido, ocupando el hueco que le da la página', async () => {
    const w = await mountViewer(props)
    const el = viewport(w)
    expect(el.classes()).toContain('relative')
    expect(el.classes()).not.toContain('fixed')
    expect(el.attributes('style')).toContain('height: 600px')
  })

  it('al pulsar el control el mapa pasa a ocupar la ventana entera', async () => {
    const w = await mountViewer(props)
    await toggle(w).trigger('click')

    const el = viewport(w)
    expect(el.classes()).toContain('fixed')
    expect(el.classes()).toContain('inset-0')
    expect(el.classes()).not.toContain('relative')
    // Los 600px de la vista reducida convertirían la ventana completa en una banda.
    expect(el.attributes('style') ?? '').not.toContain('height: 600px')
    expect(el.attributes('data-expanded')).toBe('true')
  })

  it('AVISA A LEAFLET del cambio de tamaño al expandir', async () => {
    const w = await mountViewer(props)
    expect(lastMap!.invalidateSize).not.toHaveBeenCalled()

    await toggle(w).trigger('click')
    await flushPromises()

    expect(lastMap!.invalidateSize).toHaveBeenCalledTimes(1)
  })

  it('AVISA A LEAFLET también al reducir: el contenedor encoge igual que crece', async () => {
    const w = await mountViewer(props)
    await toggle(w).trigger('click')
    await flushPromises()
    await toggle(w).trigger('click')
    await flushPromises()

    expect(lastMap!.invalidateSize).toHaveBeenCalledTimes(2)
    expect(viewport(w).classes()).toContain('relative')
  })

  it('devuelve al mapa el centro y el zoom que tenía, y en ese orden', async () => {
    const w = await mountViewer(props)
    const before = { ...lastMap!.getCenter(), zoom: lastMap!.getZoom() }
    lastMap!.setView.mockClear()
    lastMap!.calls.length = 0

    await toggle(w).trigger('click')
    await flushPromises()

    // Reponer la vista ANTES de avisar del tamaño la repondría sobre un encuadre viejo.
    expect(lastMap!.calls).toEqual(['invalidateSize', 'setView'])
    const [center, zoom] = lastMap!.setView.mock.calls.at(-1)!
    expect({ lat: center.lat, lng: center.lng }).toEqual({ lat: before.lat, lng: before.lng })
    expect(zoom).toBe(before.zoom)
    expect(lastMap!.getCenter()).toEqual({ lat: before.lat, lng: before.lng })
  })

  it('el rótulo y aria-pressed dicen en qué estado está', async () => {
    const w = await mountViewer(props)
    await toggle(w).trigger('click')

    const btn = toggle(w)
    expect(btn.text()).toContain(es.maps.collapse)
    expect(btn.text()).not.toContain(es.maps.expand)
    expect(btn.attributes('aria-pressed')).toBe('true')
    expect(btn.attributes('title')).toBe(es.maps.collapse)
  })

  it('es un botón real, así que se alcanza con el tabulador y responde a Intro/Espacio', async () => {
    const w = await mountViewer(props)
    const btn = toggle(w)
    expect(btn.element.tagName).toBe('BUTTON')
    expect(btn.attributes('type')).toBe('button')
    // Un elemento con `tabindex="-1"` estaría fuera del recorrido del tabulador.
    expect(btn.attributes('tabindex')).toBeUndefined()
    expect(btn.classes().join(' ')).toContain('focus-visible:ring')
  })

  it('Escape sale del modo expandido y avisa del cambio de tamaño', async () => {
    const w = await mountViewer(props)
    await toggle(w).trigger('click')
    await flushPromises()

    pressEscape()
    await flushPromises()

    expect(viewport(w).attributes('data-expanded')).toBe('false')
    expect(viewport(w).classes()).toContain('relative')
    expect(lastMap!.invalidateSize).toHaveBeenCalledTimes(2)
  })

  it('estando reducido, Escape no toca el mapa ni provoca un aviso de tamaño', async () => {
    const w = await mountViewer(props)
    pressEscape()
    await flushPromises()

    expect(viewport(w).attributes('data-expanded')).toBe('false')
    expect(lastMap!.invalidateSize).not.toHaveBeenCalled()
  })

  it('el aviso de Escape solo se muestra cuando hay algo de lo que salir', async () => {
    const w = await mountViewer(props)
    expect(w.find('[data-testid="map-viewport-hint"]').exists()).toBe(false)

    await toggle(w).trigger('click')
    expect(w.get('[data-testid="map-viewport-hint"]').text()).toBe(es.maps.collapseHint)
  })

  it('bloquea el desplazamiento de la página mientras ocupa la ventana, y lo suelta al volver', async () => {
    const w = await mountViewer(props)
    expect(document.body.style.overflow).toBe('')

    await toggle(w).trigger('click')
    expect(document.body.style.overflow).toBe('hidden')

    await toggle(w).trigger('click')
    expect(document.body.style.overflow).toBe('')
  })

  it('desmontarse estando expandido no deja la página sin desplazamiento', async () => {
    const w = await mountViewer(props)
    await toggle(w).trigger('click')
    expect(document.body.style.overflow).toBe('hidden')

    w.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('desmontado, ya no responde a Escape', async () => {
    const w = await mountViewer(props)
    w.unmount()
    // Si el escuchador siguiera puesto, esto trabajaría sobre un mapa ya destruido.
    expect(() => pressEscape()).not.toThrow()
  })
})
