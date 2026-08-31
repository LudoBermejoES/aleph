import { describe, it, expect, vi } from 'vitest'
import {
  createMapViewport,
  mapViewportWrapperClass,
  mapViewportWrapperStyle,
  shouldCollapseOnKey,
  MAP_VIEWPORT_ESCAPE_KEY,
} from '../../app/utils/mapViewport'

/**
 * Aserciones escritas desde la REGLA, no desde la implementación: los requisitos de
 * `openspec/changes/add-map-fullscreen-toggle/specs/maps/spec.md`.
 *
 * La regla de fondo -- y la única que rompe el mapa cuando se olvida -- es que Leaflet
 * guarda el tamaño de su contenedor en caché: si el contenedor cambia de tamaño y nadie se
 * lo dice, no lanza ningún error, simplemente pinta bandas grises y coloca los pines
 * desplazados respecto al puntero. De ahí que lo que se prueba aquí no sea «el booleano
 * cambia» sino «CADA cambio de tamaño avisa exactamente una vez, y ninguna no-transición
 * avisa».
 */

/** Un viewport con el aviso espiado, que es lo que casi todas estas pruebas miran. */
function viewportWithSpy() {
  const onChange = vi.fn()
  return { viewport: createMapViewport({ onChange }), onChange }
}

describe('createMapViewport — el estado', () => {
  it('arranca reducido: un mapa nunca se abre ocupando la ventana', () => {
    const { viewport, onChange } = viewportWithSpy()
    expect(viewport.expanded).toBe(false)
    expect(viewport.mode).toBe('inline')
    // Y construirlo no es una transición: nadie ha cambiado de tamaño todavía.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('conmuta en los dos sentidos y devuelve el estado resultante', () => {
    const { viewport } = viewportWithSpy()
    expect(viewport.toggle()).toBe(true)
    expect(viewport.mode).toBe('expanded')
    expect(viewport.toggle()).toBe(false)
    expect(viewport.mode).toBe('inline')
  })
})

describe('createMapViewport — el aviso de cambio de tamaño', () => {
  it('avisa en CADA transición, también al reducir', () => {
    const { viewport, onChange } = viewportWithSpy()
    viewport.toggle()
    viewport.toggle()
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('avisa exactamente una vez por transición', () => {
    const { viewport, onChange } = viewportWithSpy()
    viewport.expand()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('NO avisa cuando no hay transición: el contenedor no ha cambiado de tamaño', () => {
    const { viewport, onChange } = viewportWithSpy()
    viewport.collapse() // ya estaba reducido
    expect(onChange).not.toHaveBeenCalled()

    viewport.expand()
    onChange.mockClear()
    viewport.expand() // ya estaba expandido
    expect(onChange).not.toHaveBeenCalled()
  })

  it('avisa DESPUÉS de cambiar el estado, para que quien mida lea el estado nuevo', () => {
    const seen: boolean[] = []
    const viewport = createMapViewport({
      onChange: () => seen.push(viewport.expanded),
    })
    viewport.expand()
    viewport.collapse()
    expect(seen).toEqual([true, false])
  })
})

describe('shouldCollapseOnKey / handleKey — salir con Escape', () => {
  it('Escape reduce el mapa expandido', () => {
    const { viewport, onChange } = viewportWithSpy()
    viewport.expand()
    onChange.mockClear()

    expect(viewport.handleKey(MAP_VIEWPORT_ESCAPE_KEY)).toBe(true)
    expect(viewport.expanded).toBe(false)
    // Reducir es un cambio de tamaño como cualquier otro: tiene que avisar igual.
    expect(onChange.mock.calls).toEqual([[false]])
  })

  it('estando reducido, Escape NO se consume: no debe robárselo a un diálogo de encima', () => {
    const { viewport, onChange } = viewportWithSpy()
    expect(viewport.handleKey(MAP_VIEWPORT_ESCAPE_KEY)).toBe(false)
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each(['Enter', ' ', 'Esc', 'a', 'ArrowUp'])(
    'estando expandido, la tecla %j no reduce nada',
    (key) => {
      const { viewport } = viewportWithSpy()
      viewport.expand()
      expect(viewport.handleKey(key)).toBe(false)
      expect(viewport.expanded).toBe(true)
    },
  )

  it('shouldCollapseOnKey depende del estado, no solo de la tecla', () => {
    expect(shouldCollapseOnKey('Escape', true)).toBe(true)
    expect(shouldCollapseOnKey('Escape', false)).toBe(false)
    expect(shouldCollapseOnKey('Enter', true)).toBe(false)
  })
})

describe('presentación del contenedor', () => {
  it('expandido posiciona con `fixed` y reducido con `relative`, sin mezclarlos', () => {
    const inline = mapViewportWrapperClass(false)
    const expanded = mapViewportWrapperClass(true)
    // `relative` y `fixed` son la MISMA propiedad CSS: que aparezcan las dos deja el
    // resultado a merced del orden de la hoja de Tailwind.
    expect(inline.split(/\s+/)).toContain('relative')
    expect(inline.split(/\s+/)).not.toContain('fixed')
    expect(expanded.split(/\s+/)).toContain('fixed')
    expect(expanded.split(/\s+/)).not.toContain('relative')
  })

  it('expandido cubre la ventana entera', () => {
    expect(mapViewportWrapperClass(true).split(/\s+/)).toContain('inset-0')
  })

  it('expandido queda por encima de la barra lateral (z-50) y de la superior móvil (z-40)', () => {
    const z = mapViewportWrapperClass(true).match(/z-\[(\d+)\]/)
    expect(z, 'el contenedor expandido debe declarar un z-index explícito').not.toBeNull()
    expect(Number(z![1])).toBeGreaterThan(50)
  })

  it('reducido conserva la altura que le da la página', () => {
    expect(mapViewportWrapperStyle(false, 600)).toEqual({ height: '600px' })
  })

  it('expandido NO declara altura: la altura la da `inset-0`', () => {
    // Dejar los 600px de la vista reducida convertiría la «ventana completa» en una banda
    // de 600px, que es justo el problema que este control existe para resolver.
    expect(mapViewportWrapperStyle(true, 600)).toEqual({})
  })

  it('sin altura declarada no inventa una', () => {
    expect(mapViewportWrapperStyle(false, undefined)).toEqual({})
  })
})
