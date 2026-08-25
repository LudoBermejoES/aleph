## 1. Endpoint para mover un pin

- [x] 1.1 `server/api/campaigns/[id]/maps/[slug]/pins/[pinId]/index.patch.ts`: acepta `{ lat, lng }`
      y **nada más**. Reutilizar la pieza de esquema que ya valida coordenadas en `index.post.ts`,
      para que un valor que el POST rechazaría no pueda entrar por aquí. Gate `editor+`, igual que el
      POST y el DELETE de al lado.
- [x] 1.2 Devolver la fila con `getPinWithEntity` — no montar la respuesta a mano. El POST y el GET
      ya se desincronizaron una vez en este mismo endpoint y costó un arreglo de servidor.
- [x] 1.3 Pruebas: coordenadas válidas persisten; un cuerpo con `label`/`color`/`entityId` no aplica
      esos campos; un rol por debajo de editor recibe rechazo; la forma devuelta coincide con la del
      listado.

## 2. Arrastrar el marcador

- [x] 2.1 `MapViewer.client.vue`, `renderPins`: `draggable` en el marcador, tomado de `canCreatePins`
      (el mismo gate que el soltar).
- [x] 2.2 Manejador de `dragend`: leer `marker.getLatLng()`, pasarlo por `leafletLatLngToPin` — **el
      mismo conversor que usa el soltar**, así que los dos tipos de mapa no necesitan código
      distinto — y emitir el movimiento a la página.
- [x] 2.3 Si la posición no ha cambiado, no enviar petición (design, Riesgos: `dragend` puede saltar
      con un clic sin desplazamiento).
- [x] 2.4 En la página: PATCH y actualizar `mapData.value.pins[i]` **en su sitio**. NO volver a
      llamar a `renderPins` — reconstruiría todos los marcadores, parpadearía y cerraría el popup
      abierto (design D1).
- [x] 2.5 Si el PATCH falla, **devolver el marcador a su posición anterior**. Capturar la posición
      previa antes del arrastre. Sin esto la pantalla muestra una posición que la base de datos no
      tiene, y `renderPins` no corre porque nada cambió en `pins`.
- [x] 2.6 Comprobar que el shift+clic para explorar un mapa anidado **sigue funcionando** en un
      marcador arrastrable.

## 3. La imagen real de la entidad

- [x] 3.1 Ampliar `getPinsWithEntity`/`getPinWithEntity` en `server/services/maps.ts` para resolver
      la imagen en el orden de design D3: (1) `entity_images.url` con `is_primary = 1`,
      (2) `characters.portrait_url` por `characters.entity_id`, (3) `organizations.image_url` por
      `organizations.entity_id`, (4) `entities.image_url`.
- [x] 3.2 **Acotar la unión de `entity_images` a `is_primary = 1`.** Tiene muchas filas por entidad:
      sin esa condición cada pin se multiplica por el tamaño de su galería. Es un fallo de
      corrección, no de rendimiento. Prueba explícita: una entidad con varias imágenes de galería
      produce **un** pin.
- [x] 3.3 Conservar el nombre y el significado de `entityImageUrl`, para que `mapPinMarker.ts` y sus
      pruebas no cambien: el código del marcador ya era correcto, solo se le alimentaba de una tabla.
- [x] 3.4 La regla de visibilidad ya existente se aplica a las cuatro fuentes: si el espectador no
      puede ver la entidad, se le quitan `entityImageUrl`/`entityType` y **el pin se devuelve igual**.
- [x] 3.5 Pruebas con base en memoria, una por fuente, más la de precedencia: una entidad con imagen
      principal de galería **y** `entities.image_url` usa la de galería.

## 4. Verificar que la imagen se ve de verdad

- [ ] 4.1 **Comprobar que la URL carga en el navegador.** SIN HACER: el servidor de desarrollo de
      esta máquina no es alcanzable (`ss` lo da a la escucha en 3333 y `curl` agota el tiempo con 0
      bytes, también invocando `nuxt dev` directamente), así que no hubo navegador donde mirar.
      Verificado por CÓDIGO, que no es lo mismo y no cierra esta casilla: las tres rutas son del
      MISMO origen y autenticadas por `server/middleware/01.auth.ts`; la cookie de sesión es
      `SameSite=strict` (`server/utils/auth.ts:47`), que sí permite peticiones del mismo origen; y
      este patrón exacto YA está en producción — `CharacterPortrait.vue:4-6` y `EntityImage.vue`
      usan `<img :src>` contra esas mismas rutas y funcionan, y el navegador aplica las mismas
      reglas de credenciales a `<img src>` y a `background-image` cuando el origen coincide.
      El argumento es sólido pero sigue siendo un argumento. Cerrar esta casilla mirando un mapa
      real con pines de personaje, lugar y organización.

      MEDIDO EN PRODUCCIÓN (2026-08-25, tras el despliegue): la ruta del retrato responde
      **401 con `content-type: application/json`** sin credenciales, así que está protegida y el
      riesgo del fallo silencioso era real, no teórico. Lo que lo resuelve en la práctica: el
      propietario ha estado viendo imágenes en aleph en esta misma sesión (pidió respetar el aspect
      ratio para poder verlas), y esas van por `<img :src>` contra estas MISMAS rutas, así que la vía
      de la cookie de sesión funciona en su navegador. `background-image` del mismo origen sigue las
      mismas reglas de credenciales.
      Queda a un paso de una medición de píxel sobre el marcador concreto: verificar requiere un
      navegador con sesión, y las credenciales del CLI son una clave de API, no una contraseña de
      navegador. Riesgo residual bajo, y acotado por el respaldo de color de fondo por tipo, que
      hace que un fallo de carga degrade a un círculo de color y nunca a un hueco.
      (marca original: 4.1 **Comprobar que la URL carga en el navegador.**) Todas son rutas de API autenticadas
      (`/api/campaigns/{id}/characters/{slug}/portrait`,
      `/api/campaigns/{id}/organizations/{slug}/image`), y un 401 en un `background-image` falla
      **en silencio**: ni error de consola ni icono roto, solo un círculo vacío indistinguible de
      «no tiene imagen». Si falla, ESE es el hallazgo, y hay que reportarlo antes de seguir.

- [x] 4.2 Que un fallo de carga degrade al icono de tipo o al fondo de color, nunca a un hueco.
- [x] 4.3 **Diagnosticar aparte, no dar por arreglado**: los lugares leen `entities.image_url`, que
      ya estaba unido, y **40 de 44 lo tienen poblado**, así que un pin de lugar debería mostrar su
      imagen HOY. Si no la muestra, es un defecto distinto de este cambio. Verificarlo y decir cuál
      de los dos casos es.

## 5. CLI

- [x] 5.1 `cli/src/commands/map.js`: comando para mover un pin (`--lat`/`--lng`), consistente con
      `pin-add`/`pin-delete`. Cada endpoint de este proyecto tiene su comando.
- [x] 5.2 Prueba unitaria del cableado. **Si importa `cli/src/**`, el job `test` de CI ya instala las
      dependencias del CLI\*\* (se añadió ese paso hoy, tras fallar exactamente por esto).
- [x] 5.3 `docs/claude-skill.md` y `.claude/skills/aleph-cli/SKILL.md` en la MISMA pasada, con subida
      de versión en los dos.

## 6. Verificación

- [x] 6.1 `npm run test:unit` en verde. Base de partida: 145 ficheros / 1771 pruebas.
- [x] 6.2 `npx prettier --check .` limpio en todo el repo — es el primer paso del hook de pre-push.
- [x] 6.3 **NO ejecutar `npm run test:integration`** en esta máquina: el servidor de desarrollo
      anuncia el puerto 3333 y nunca lo abre (`curl` da 000, `ss` no ve el puerto), así que `wait-on`
      agota el tiempo y parece una suite roja. Es fallo de entorno. Se verifican en CI.
- [x] 6.4 NO comitear ni empujar. Parar y reportar.
