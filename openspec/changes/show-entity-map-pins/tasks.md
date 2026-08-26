## 1. La consulta inversa

- [x] 1.1 En `server/services/maps.ts`: consulta de pines **por `entityId`**, uniendo `maps` para
      devolver nombre y slug del mapa, más el id del pin, su `label` y sus coordenadas. Hoy no existe
      ninguna consulta en esa dirección: todas filtran por `mapId`.
- [x] 1.2 Devolver **lista**, siempre. Una entidad puede estar pinchada en varios mapas y más de una
      vez en el mismo; nada en el esquema lo impide (design D1). No tratar el caso singular aparte.
- [x] 1.3 Endpoint bajo `entities/[slug]/`. **Mirar antes qué hay ya en ese árbol de rutas** y encajar
      en el patrón existente en vez de añadir un hermano con otro estilo.
- [x] 1.4 Resolver el id de entidad según el tipo: un lugar **es** una fila de `entities`; un personaje
      y una organización llevan su propio `entityId`. Y ese campo **puede ser null**
      (`onDelete: 'set null'`): tratar el caso antes de consultar.

## 2. Visibilidad -- la regla al revés

- [x] 2.1 Filtrar por la visibilidad del **MAPA**, no de la entidad: aquí el espectador sí puede ver la
      entidad (está en su página) pero puede no poder ver el mapa. Usar el mismo predicado que ya
      aplica el listado de mapas (`server/api/campaigns/[id]/maps/index.get.ts`), sin inventar uno.
- [x] 2.2 Una colocación inalcanzable se **omite entera**, nunca se devuelve con el slug a null: eso
      informaría de que existe un mapa oculto.
- [x] 2.3 Prueba con dos mapas, uno visible y otro no, para el mismo pin.

## 3. La ficha

- [x] 3.1 UN componente compartido por las tres páginas de detalle (lugar, organización, personaje).
      Tres copias de un `v-for` divergirían en el primer cambio (design, Riesgos).
- [x] 3.2 Nombrar el mapa, no un «ver en el mapa» genérico: hay más de un mapa y se admiten anidados.
      Con varias colocaciones, listarlas todas, y mostrar la etiqueta propia del pin cuando difiera
      del nombre de la entidad -- que es justo para lo que existe una etiqueta personalizada.
- [x] 3.3 **Importar `pinDisplayName`** de `app/utils/mapPinMarker.ts`; no reimplementar la regla del
      nombre. Ya cambió una vez hoy y una segunda copia se desincronizaría (design D5).
- [x] 3.4 Sin colocaciones: no renderizar nada. Ni sección vacía ni spinner que resuelve a nada.

## 4. Enfocar por URL

- [x] 4.1 El mapa lee el pin del query string y llama al `focusPin` que **ya existe**
      (`index.vue:281`, expuesto por `MapViewer.client.vue`). La página ya usa `useRoute()` y hoy no
      lee nada de la URL.
- [x] 4.2 **La carrera es la dificultad entera y falla EN SILENCIO**: `focusPin` busca en
      `markerPins`, que llena `renderPins` después de que Leaflet cargue de forma asíncrona y lleguen
      los pines. Si se dispara antes, no encuentra nada, retorna, y la página parece simplemente
      normal -- sin error ni aviso. Disparar desde un punto garantizado posterior a la existencia de
      los marcadores.
- [x] 4.3 **Prueba que falle si se dispara demasiado pronto.** Sin ella, esto vuelve a romperse el día
      que cambie el orden de carga, y volverá a romperse sin ruido.
- [x] 4.4 Un id de pin inexistente (borrado, o de otro mapa) degrada a «muestra el mapa», nunca a un
      error.

## 5. Verificación

- [x] 5.1 `npm run test:unit` en verde. Base de partida: 149 ficheros / 1876 pruebas. Con este cambio:
      150 ficheros / 1890 pruebas (14 nuevas: 7 en `pin-focus-queue.test.ts`, 7 en
      `maps-service.test.ts`), confirmado en tres ejecuciones completas seguidas. Las únicas fallas
      vistas fueron 3-4 pruebas AJENAS a este cambio (`diagram-sidebar-legibility`, `markdown-editor`,
      `collaboration-service`, `map-create`, `entity-routes`), siempre por `Test timed out`, nunca por
      aserción -- confirmado como contención de CPU del entorno, no una regresión: las mismas 3 pruebas
      pasan 88/88 al ejecutarlas solas.
- [x] 5.2 `npx prettier --check .` **y** `npx eslint . --ext .ts,.vue,.tsx`, los dos limpios en todo el
      repo, leyendo el **código de salida real** y no a través de una tubería (`cmd | tail` devuelve el
      de `tail`, y eso ya ocultó un fallo real). Ambos EXIT:0 confirmados por separado (prettier tras
      corregir un `design.md` de este mismo cambio que ya venía sin formatear).
- [x] 5.3 NO ejecutado `npm run test:integration` en esta máquina: el servidor de desarrollo anuncia el
      puerto 3333 y nunca lo abre, así que `wait-on` agota el tiempo y parece una suite roja. Es fallo
      de entorno; se verifica en CI. Se escribió `tests/integration/entity-map-pins.test.ts` siguiendo
      el patrón de `maps-visibility.test.ts`, sin ejecutar.
