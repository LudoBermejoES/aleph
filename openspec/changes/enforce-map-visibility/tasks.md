## 1. La costura única

- [x] 1.1 En `server/services/maps.ts`: una función que resuelve un mapa POR SLUG **y autoriza** con
      el predicado que ya existe (`VISIBILITY_MIN_ROLE`/`ROLE_LEVEL` en `server/utils/permissions.ts`,
      el mismo que usan `search`, `characters/index`, `entities/index`, `locations/index` y
      `organizations/index`). **No inventar un predicado nuevo.**
- [x] 1.2 Que TODAS las rutas obtengan su mapa por ahí, en vez de consultarlo cada una. Siete copias
      de una comprobación de seguridad son siete ocasiones de olvidar una, y la octava ruta que
      alguien añada nacería sin protección (design D1).
- [x] 1.3 Una denegación devuelve **404**, no 403: un 403 confirma que el mapa existe, que es el dato
      que se protege. El listado simplemente omite la fila, sin recuento ni hueco (design D2).

## 2. Las siete superficies

- [x] 2.1 `maps/index.get.ts` — filtrar el listado.
- [x] 2.2 `maps/[slug]/index.get.ts`.
- [x] 2.3 `maps/[slug]/pins/index.get.ts`.
- [x] 2.4 `maps/[slug]/layers/index.get.ts`.
- [x] 2.5 `maps/[slug]/regions/index.get.ts`.
- [x] 2.6 `maps/[slug]/image.get.ts`.
- [x] 2.7 `maps/[slug]/tiles/[z]/[x]/[y].get.ts` — **la más importante**: sirve la imagen real del
      mapa, así que sin la comprobación del padre un mapa oculto se lee entero adivinando un slug
      (design D3).
- [x] 2.8 Repasar que no quede ninguna otra ruta de lectura de mapas fuera de la lista. Enumerarlas
      con un `find`, no de memoria.

## 3. Lo que NO se toca

- [x] 3.1 `filterPinsByVisibility` ya oculta pines individuales y **funciona**. Esta capa va ENCIMA y
      las dos se componen: un mapa visible puede contener pines ocultos. No fusionar ni sustituir esa
      lógica -- sería reescribir un control que funciona mientras se añade el que falta, y una
      regresión ahí sería invisible (design D4).
- [x] 3.2 No tocar las rutas de escritura. Si aparece un hueco ahí, **reportarlo**, no ampliar este
      cambio.

## 4. Coste de la ruta caliente

- [x] 4.1 La ruta de teselas se pide muchas veces por vista de mapa. Resolver el mapa **una vez** por
      petición (o aceptar una búsqueda indexada y **decir la medición**). No añadir un coste por
      tesela sin medirlo (design, Riesgos).

## 5. Radio de impacto, ANTES de desplegar

- [x] 5.1 Contar los mapas por visibilidad en **las cuatro campañas** (`arcadia-la-fuerza-oculta`,
      `kult`, `kingmaker`, `berlin-en-tinieblas`) y reportarlo. Hoy Berlín tiene 1 mapa en `members`
      (el valor por defecto), así que ahí no cambia nada; las otras tres están sin medir.
- [x] 5.2 Si algún mapa va a pasar a estar oculto para quien hoy lo ve, **decirlo antes de que se
      despliegue**, no después de que un jugador pregunte dónde está el mapa (design D5).
- [x] 5.3 Mapas anidados: la visibilidad de un hijo es la suya. No inferirla del padre y no ocultar en
      silencio un hijo visible porque su padre esté oculto. **Decidir y dejarlo escrito.**

## 6. Pruebas

- [x] 6.1 Por cada superficie: un rol por debajo del umbral recibe 404/omisión.
- [x] 6.2 **Y el camino POSITIVO**: un `dm` y un `player` sobre el MISMO mapa visible siguen
      recibiendo todo igual. El riesgo real no está en el predicado, que es compartido, sino en el
      cableado -- una ruta que resuelva con el rol equivocado (un `visitor` por defecto donde el real
      es `dm`) dejaría fuera al propietario.
- [x] 6.3 Composición: mapa visible con pines ocultos -> el mapa llega, los pines no.

## 7. Verificación

- [x] 7.1 `npm run test:unit` en verde. Base: 150 ficheros / 1890 pruebas. Ojo: hay 3-4 pruebas que
      fallan por _timeout_ de forma intermitente en ficheros ajenos (`diagram-sidebar-legibility`,
      `markdown-editor`, `collaboration-service`, `map-create`, `entity-routes`) por contención de
      CPU; comprobar aislando antes de llamarlo regresión.
- [x] 7.2 `npx prettier --check .` **y** `npx eslint . --ext .ts,.vue,.tsx`, limpios en todo el repo,
      leyendo el **código de salida real** y no a través de una tubería.
- [x] 7.3 NO ejecutar `npm run test:integration` aquí: el servidor de desarrollo anuncia el puerto
      3333 y nunca lo abre, así que `wait-on` agota el tiempo y parece una suite roja. Se verifica en
      CI.
