/**
 * El estado «a ventana completa» del visor de mapas, sin Vue y sin Leaflet.
 *
 * Sigue el mismo criterio que `mapPinGeometry.ts` y `pinFocusQueue.ts`: la decisión vive
 * aquí, en un módulo sin dependencias, para poder probarla sin montar Leaflet, y el
 * componente se limita a conectarla al DOM.
 *
 * La regla que justifica que esto sea un controlador y no un `ref` suelto es una sola, y es
 * la que rompe el mapa cuando se olvida: **Leaflet no se entera de que su contenedor ha
 * cambiado de tamaño**. Guarda el tamaño en caché (`_size`) y todo lo que traduce entre
 * píxeles y coordenadas -- dónde se pinta un marcador, qué punto hay bajo el puntero -- sale
 * de esa caché. Si el contenedor crece y nadie llama a `invalidateSize()`, no hay ningún
 * error: el mapa simplemente pinta mal, con bandas grises y los pines desplazados respecto
 * al puntero. Por eso el cambio de estado y el aviso son UNA sola operación aquí, y no dos
 * cosas que hay que acordarse de hacer juntas.
 */

/** Las dos posiciones del control. Nunca hay un estado intermedio. */
export type MapViewportMode = 'inline' | 'expanded'

export interface MapViewportOptions {
  /**
   * Se invoca en CADA transición real, y DESPUÉS de que el estado haya cambiado -- de modo
   * que quien lo reciba lea ya el estado nuevo. Es el punto donde el componente aplica el
   * `invalidateSize()` de Leaflet.
   *
   * No se invoca en una no-transición (`collapse()` estando ya reducido, o `expand()`
   * estando ya expandido): el contenedor no ha cambiado de tamaño, así que avisar sería
   * mentir, y en el mapa se traduce en un `panBy` gratuito.
   */
  onChange: (expanded: boolean) => void
}

export interface MapViewport {
  /** ¿Está el mapa ocupando la ventana ahora mismo? */
  readonly expanded: boolean
  /** `'inline'` o `'expanded'`. Mismo dato que `expanded`, en la forma que usan las clases. */
  readonly mode: MapViewportMode
  /** Cambia de estado. Devuelve el estado resultante. */
  toggle(): boolean
  /** Expande. No hace nada -- y no avisa -- si ya estaba expandido. */
  expand(): boolean
  /** Reduce. No hace nada -- y no avisa -- si ya estaba reducido. */
  collapse(): boolean
  /**
   * Trata una pulsación de teclado. Devuelve `true` SOLO si la ha consumido, para que quien
   * llama sepa si debe hacer `preventDefault()`; devolver `true` sin consumirla le robaría
   * `Escape` a un diálogo abierto encima.
   */
  handleKey(key: string): boolean
}

/**
 * La tecla que sale del modo expandido. `Escape` y no `Esc`: `KeyboardEvent.key` da `'Esc'`
 * solo en IE/Edge antiguos, que este proyecto no soporta.
 */
export const MAP_VIEWPORT_ESCAPE_KEY = 'Escape'

/**
 * ¿Esta tecla debe reducir el mapa? Es una función aparte porque la respuesta depende del
 * estado: estando reducido, `Escape` NO se consume -- no hay nada de lo que salir y el
 * evento tiene que seguir llegando a quien sí lo espera.
 */
export function shouldCollapseOnKey(key: string, expanded: boolean): boolean {
  return expanded && key === MAP_VIEWPORT_ESCAPE_KEY
}

export function createMapViewport(options: MapViewportOptions): MapViewport {
  let expanded = false

  function set(next: boolean): boolean {
    if (next === expanded) return expanded
    expanded = next
    // El aviso va DESPUÉS de escribir el estado, nunca antes: quien lo recibe consulta el
    // DOM ya actualizado para medir el contenedor nuevo.
    options.onChange(expanded)
    return expanded
  }

  return {
    get expanded() {
      return expanded
    },
    get mode(): MapViewportMode {
      return expanded ? 'expanded' : 'inline'
    },
    toggle: () => set(!expanded),
    expand: () => set(true),
    collapse: () => set(false),
    handleKey(key: string) {
      if (!shouldCollapseOnKey(key, expanded)) return false
      set(false)
      return true
    },
  }
}

// ─── Presentación ────────────────────────────────────────────────────────────
//
// Las clases y el estilo del contenedor salen de aquí en vez de vivir en un `:class` del
// template por una razón concreta: `relative` y `fixed` son la MISMA propiedad CSS, y en
// Tailwind gana la que esté después en la hoja, no la que esté después en el atributo. Un
// `:class="{ fixed: expanded }"` sobre un elemento que ya lleva `relative` es una apuesta
// sobre el orden de generación de Tailwind. Devolver la cadena entera para cada estado
// elimina la apuesta.

/** Contenedor reducido: el hueco que le deja la página, con los controles posicionados dentro. */
export const MAP_VIEWPORT_INLINE_CLASS = 'relative'

/**
 * Contenedor expandido: toda la ventana (`position: fixed`, no la API de pantalla completa
 * del navegador -- ver el design del cambio). `bg-background` porque el mapa deja de tener
 * la página detrás. `z-[1200]` queda por encima de la barra superior móvil (`z-40`) y de la
 * barra lateral (`z-50`), y por debajo del `z-[9999]` del editor.
 */
export const MAP_VIEWPORT_EXPANDED_CLASS = 'fixed inset-0 z-[1200] bg-background'

export function mapViewportWrapperClass(expanded: boolean): string {
  return expanded ? MAP_VIEWPORT_EXPANDED_CLASS : MAP_VIEWPORT_INLINE_CLASS
}

/**
 * Estando expandido NO se declara altura: la da `inset-0`. Declarar los 600px de la vista
 * reducida dejaría el mapa como una banda de 600px en una ventana completa, que es
 * exactamente el fallo que este control existe para evitar.
 */
export function mapViewportWrapperStyle(
  expanded: boolean,
  height: number | undefined,
): Record<string, string> {
  if (expanded) return {}
  return Number.isFinite(height) ? { height: `${height}px` } : {}
}
