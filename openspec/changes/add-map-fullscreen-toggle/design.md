## Contexto

`MapViewer.client.vue` monta Leaflet sobre un `div` cuya altura la fija la página
(`:height="600"`). El componente ya tiene tres controles propios posicionados en absoluto
sobre el mapa (candado de pines abajo a la izquierda, capas arriba a la derecha, grupos arriba
a la izquierda), así que un cuarto no introduce un patrón nuevo.

Dos hechos del componente condicionan todo lo que sigue:

1. **El mapa de Leaflet se crea una sola vez, en `onMounted`, sobre `mapContainer`.** Todo el
   componente está construido alrededor de no destruirlo: los pines se re-escalan con
   `setIcon` en vez de re-renderizarse, un movimiento correcto no dispara re-render, y hay una
   bandera (`suppressNextPinsRender`) cuyo único fin es evitar que un cambio en `props.pins`
   reconstruya los marcadores. Un cambio de tamaño que desmonte y remonte el mapa iría contra
   todo eso.
2. **Leaflet guarda el tamaño del contenedor en caché.** `Map.getSize()` solo vuelve a leer
   `clientWidth`/`clientHeight` si `_sizeChanged` es `true`, y quien pone esa bandera es
   `invalidateSize()` (o el escuchador de `resize` de la ventana, que un contenedor que crece
   no dispara).

## Decisiones

### D1. `position: fixed`, no `element.requestFullscreen()`

Se ocupa la ventana con CSS. Razones, en orden de peso:

- **La API del navegador saca el mapa de la aplicación.** Un elemento en pantalla completa se
  pinta en la capa superior y solo, así que desaparecen la barra lateral, la ruta de migas y
  el panel de entidades desde el que se arrastran pines. Con `fixed` el mapa sigue siendo un
  nodo de la página: los popups de Leaflet, el candado y el arrastre funcionan sin tocar nada.
- **Puede fallar sin dejar rastro.** `requestFullscreen()` solo se concede dentro de un gesto
  del usuario y devuelve una promesa rechazable (política de permisos, iframes). El control
  podría no hacer NADA y el botón no tendría forma de saberlo. `fixed` no puede fallar.
- **Hay dos estados que sincronizar.** El usuario puede salir de la pantalla completa del
  navegador por caminos que no pasan por el botón (F11, cambio de pestaña, `Escape` nativo),
  así que haría falta escuchar `fullscreenchange` y reconciliar. Con `fixed` el estado del
  componente es el único que hay.
- Y es trivial de revertir: una clase.

Lo que se pierde: no se oculta la barra del navegador. Es aceptable -- lo que se pedía era que
el mapa dejara de estar constreñido por la página, y eso se consigue.

### D2. El estado vive en un módulo sin dependencias, no en el componente

`app/utils/mapViewport.ts`, igual que `mapPinGeometry.ts` y `pinFocusQueue.ts`: el componente
solo lo conecta al DOM. La razón no es la simetría, es que la regla que importa se puede
enunciar sola y probar sola:

> Cada transición avisa exactamente una vez, y ninguna no-transición avisa.

Ese aviso es donde el componente llama a `invalidateSize()`. Que el cambio de estado y el
aviso sean UNA operación (`set()` escribe y notifica) es lo que impide que se separen: no hay
forma de expandir sin avisar, porque no hay un `setter` público que no notifique.

La no-transición importa: `collapse()` con el mapa ya reducido no debe avisar. Un
`invalidateSize()` gratuito hace un `_rawPanBy` y dispara `move`/`resize`, y el escuchador de
`zoomend` de este componente re-escala los pines.

### D3. Las clases del contenedor se devuelven enteras por estado

`relative` y `fixed` son la MISMA propiedad CSS. Un `:class="{ fixed: expanded }"` sobre un
elemento que ya lleva `relative` deja el resultado a merced del orden en que Tailwind genere
las dos reglas, no del orden del atributo. `mapViewportWrapperClass(expanded)` devuelve la
cadena completa para cada estado y no hay apuesta que perder.

Lo mismo con la altura: expandido NO se declara `height`, porque `inset-0` ya la da. Dejar los
600 px de la vista reducida convertiría la «ventana completa» en una banda de 600 px, que es
exactamente el fallo que este control existe para evitar. De ahí que
`mapViewportWrapperStyle(true, 600)` devuelva `{}`.

### D4. El aviso a Leaflet va tras `nextTick()`, y repone la vista

```
onChange -> ref = expanded -> nextTick() -> invalidateSize() -> setView(centro, zoom)
```

`nextTick()` y no `setTimeout`: cuando resuelve, Vue ya ha escrito la clase en el DOM, e
`invalidateSize()` lee `clientWidth`/`clientHeight`, que fuerzan el cálculo de estilo en ese
mismo instante. Por eso tampoco hay transición CSS sobre el tamaño del contenedor: la haría
medir a mitad de camino.

El centro y el zoom se capturan ANTES de esperar y se reponen DESPUÉS de `invalidateSize()`.
Honestamente: `invalidateSize()` ya conserva el centro, porque su opción `pan` vale `true` por
defecto y hace `_rawPanBy(mitadVieja - mitadNueva)`. Se comprobó: quitar el `setView` y medir
en un navegador real deja el pin igual de centrado. Se mantiene porque la regla «se vuelve al
mismo sitio» no debe depender del valor por defecto de una opción ajena, y porque el orden
correcto no es obvio -- reponer la vista ANTES de avisar del tamaño la repondría sobre un
encuadre viejo. Queda cubierto por la prueba de componente, no por el e2e; se dice en el
informe en vez de fingir que el e2e lo guarda.

### D5. Cómo se prueba que los pines no se desplazan

El fallo de `invalidateSize()` es mudo: no hay excepción, ni aviso en consola, ni nada que un
`expect` sobre el estado pueda ver. Y jsdom no tiene layout (`clientWidth` es 0), así que una
prueba de componente NO puede medirlo -- el Leaflet real ni llegaría a considerar que su
contenedor ha cambiado.

Así que se mide en el navegador, sin acceso al objeto `map` (que no está expuesto en `window`)
y sin capturas: **cada mapa del e2e se crea con UN pin colocado exactamente en el centro que
ese mapa declara**, de modo que la posición correcta de su marcador es, por definición, el
centro del contenedor. Comparar dos cajas del DOM basta.

- mapa `image` sin imagen: el visor usa 1024x768 y encuadra la imagen entera, así que su
  centro es el píxel (512, 384) -- ahí va el pin.
- mapa `osm`: declara `centerLat`/`centerLng`, y el pin va en esas mismas coordenadas.

Con el aviso puesto el desfase es de 0-1 px; con el aviso desactivado, **312 px** en los dos
tipos de mapa. Es la única prueba de las tres capas que ve el defecto de verdad.

### D6. Escape se escucha siempre y se consume solo si hay algo de lo que salir

El escuchador se pone en `onMounted` y se quita en `onUnmounted`, pero la decisión la toma
`viewport.handleKey`, que devuelve `false` estando reducido. Registrar el escuchador solo
mientras está expandido sería equivalente y más frágil (un `watch` más que mantener); lo que
NO es aceptable es consumir `Escape` con el mapa reducido, porque se lo robaría a un diálogo
abierto encima.

## Riesgos

- **El `z-index`.** `z-[1200]` queda por encima de la barra superior móvil (`z-40`) y de la
  lateral (`z-50`), y por debajo del `z-[9999]` del editor de Markdown. Si algún día aparece
  un elemento fijo con más de 1200 se colará por encima del mapa expandido.
- **Dos controles compartían esquina.** El conmutador va arriba a la derecha porque la
  inferior derecha es donde Leaflet pinta la atribución de los mosaicos, obligatoria en un
  mapa `osm`. Eso lo ponía justo encima del panel de capas, que ya estaba en
  `absolute top-3 right-3`: ahora los dos viven en el MISMO contenedor de flujo y se apilan,
  en vez de estar posicionados los dos en la misma esquina.
- **El bloqueo de desplazamiento del `body` es global.** Se suelta al reducir y al
  desmontarse, y solo si lo puso este componente, pero sigue siendo una escritura sobre
  `document.body` que otro componente podría estar disputando.
