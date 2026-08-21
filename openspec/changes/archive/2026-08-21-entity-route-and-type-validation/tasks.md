## 1. El enlace muerto de la página de sesión

- [x] 1.1 Localizar la causa: `EntityRelationsPanel.vue:29` construía el segmento como `${type}s`.
      Era el ÚNICO sitio de `app/` que lo hacía; `EntityPopover` y `SearchCommand` ya usaban
      `entityDetailPath()`. El mapeo nunca faltó — un componente se lo saltaba.
- [x] 1.2 Medir el daño: de los 9 tipos registrados en Berlin en tinieblas, 4 daban enlace muerto
      (`lore` -> /lores/, `note` -> /notes/, `event` -> /events/, `faction` -> /factions/). Los otros
      5 funcionaban por coincidencia de nombre, no por diseño.
- [x] 1.3 Usar `entityDetailPath()` en el panel, con su import.

## 2. Un cambio que hice mal y que atajó el test que ya existía

- [x] 2.1 Añadí `faction -> organizations` e `item -> items` al mapeo. AMBOS estaban mal:
      `/items/` es la página de objetos de economía y `/organizations/` lista registros reales de
      organización; una entidad de wiki de tipo `item` o `faction` no es ninguna de las dos, así que
      esos mapeos la mandarían a una página sin registro que la respalde, en vez de al genérico que
      siempre funciona. `tests/unit/utils/entity-routes.test.ts` usa `item` como su ejemplo canónico
      de "tipo sin página propia" precisamente por eso, y falló.
- [x] 2.2 Revertido `entity-routes.ts`: sin cambios. La única modificación de producción en la UI es
      la línea del panel.
- [x] 2.3 También creé un fichero de test DUPLICADO (`tests/unit/entity-routes.test.ts`) cuando ya
      había uno en `tests/unit/utils/`. Borrado, y las aserciones nuevas movidas al que existía.

## 3. Validación de tipo en el CLI

- [x] 3.1 `entity create --type` consulta `GET /entity-types` y rechaza un tipo no registrado,
      listando el conjunto válido en el error. Tolera un servidor que no reporte tipos, para no
      bloquear toda creación.
- [x] 3.2 Ayuda: quitado `npc` del ejemplo, que es lo que me llevó al error — no está registrado en
      todas las campañas.
- [x] 3.3 Un fallo que solo salió probando: `process.exit(1)` tras el `await` de la petición abortaba
      el proceso con una aserción de libuv y **exit 127** en Windows. Las guardas hermanas salen
      limpias solo porque corren antes de cualquier llamada de red. Cambiado a `process.exitCode` +
      `return`: exit 1 limpio, verificado.

## 4. Datos corregidos en la campaña

- [x] 4.1 `los-dos-hombres-de-abrigo` tenía `type: npc`, que no existe en esta campaña. Recreado como
      PERSONAJE npc, que es como esta campaña modela sus NPCs (Elke Brandt, Falko Oesau), con la
      descripción repartida entre "Descripción física" y "Estado actual".
- [x] 4.2 Recreadas las dos relaciones que murieron con la entidad borrada.
- [x] 4.3 `la-vieja-del-maniqui` se queda como `lore`: es un tipo registrado y correcto. Vive en
      `/entities/la-vieja-del-maniqui`, y ahora el enlace de la sesión llega ahí en lugar de a
      `/lores/`.

## 5. Verificación

- [x] 5.1 El test del bypass se vio en ROJO: reintroducida la regresión a mano, nombra
      `EntityRelationsPanel.vue`; restaurada, verde.
- [x] 5.2 Validación del CLI probada en ambos sentidos contra el servidor: `--type npc` rechazado con
      la lista, `--type note` creado; la entidad desechable borrada.
- [x] 5.3 Suite completa: **1.609/1.609 en 135 ficheros**.

## 6. Arreglado de paso, preexistente y de la misma familia

- [x] 6.1 `tests/unit/components/diagram-sidebar-legibility.test.ts` construía su lista con
      `path.join`, así que en Windows daba contrabarras, nunca casaba con la lista auditada escrita
      con barras, y fallaba. Un fallo falso solo-Windows en un test sobre tokens de color.
      Separadores normalizados a POSIX; 66/66.
