## ADDED Requirements

### Requirement: El visor de mapas SHALL ofrecer un control para verlo a ventana completa

El visor de mapas SHALL incluir un control que hace que el mapa ocupe la ventana entera, y que
lo devuelve al hueco que le da la página.

El control SHALL estar visible en los dos estados, y en particular en el estado reducido, que
es el único con el que se abre un mapa: un control que solo apareciera con el mapa ya expandido
sería inalcanzable.

El control SHALL decir en qué estado está -- su rótulo nombra la acción disponible y su
`aria-pressed` refleja el estado -- SHALL ser un botón alcanzable con el tabulador y accionable
con el teclado, y SHALL tener foco visible.

El mapa SHALL abrirse siempre reducido. El estado no se recuerda entre visitas.

#### Scenario: El control está ahí desde el principio

- **WHEN** un usuario abre la página de detalle de un mapa
- **THEN** el visor muestra el control de ventana completa
- **AND** el mapa se muestra reducido, con la altura que le da la página

#### Scenario: Expandir

- **WHEN** el usuario acciona el control
- **THEN** el mapa pasa a ocupar la ventana entera
- **AND** el control pasa a ofrecer la acción de reducirlo

#### Scenario: Reducir con el mismo control

- **WHEN** el usuario acciona el control con el mapa ya expandido
- **THEN** el mapa vuelve exactamente al tamaño que tenía antes de expandirse

#### Scenario: Solo con el teclado

- **WHEN** el usuario lleva el foco al control con el tabulador y pulsa Intro
- **THEN** el mapa se expande igual que al pulsarlo con el ratón

### Requirement: Escape SHALL salir del modo de ventana completa

Con el mapa expandido, pulsar `Escape` SHALL reducirlo, además del botón.

Con el mapa reducido, `Escape` NO SHALL ser consumido por el visor: no hay nada de lo que
salir, y el evento debe seguir llegando a quien sí lo espera -- un diálogo abierto encima del
mapa.

#### Scenario: Salir con Escape

- **WHEN** el usuario pulsa `Escape` con el mapa ocupando la ventana
- **THEN** el mapa vuelve al tamaño que tenía

#### Scenario: Escape con el mapa reducido

- **WHEN** el usuario pulsa `Escape` con el mapa ya reducido
- **THEN** el visor no hace nada y no consume la pulsación

### Requirement: El mapa SHALL avisar a Leaflet de cada cambio de tamaño de su contenedor

Cada transición entre reducido y expandido -- en los DOS sentidos, y sea disparada por el
botón o por `Escape` -- SHALL notificar a Leaflet que su contenedor ha cambiado de tamaño
(`invalidateSize()`), después de que el nuevo tamaño esté aplicado en el DOM.

Una no-transición (pedir reducir un mapa ya reducido, o expandir uno ya expandido) NO SHALL
notificar nada: el contenedor no ha cambiado de tamaño.

Esta es la regla cuyo incumplimiento es MUDO. Leaflet guarda el tamaño de su contenedor en
caché y traduce coordenadas a píxeles con ese valor: sin el aviso no hay ningún error, el mapa
simplemente pinta bandas grises y coloca los pines lejos de donde el puntero dice que están.

#### Scenario: Un pin no se mueve de su sitio al expandir

- **GIVEN** un mapa con un pin colocado exactamente en el centro que ese mapa declara, cuyo
  marcador se pinta por tanto en el centro del contenedor
- **WHEN** el usuario expande el mapa a ventana completa
- **THEN** el marcador sigue pintándose en el centro del contenedor, ahora más grande

#### Scenario: Ni al volver

- **WHEN** el usuario reduce el mapa, con el botón o con `Escape`
- **THEN** el marcador vuelve a pintarse en el centro del contenedor reducido

#### Scenario: Los dos tipos de mapa

- **WHEN** el mapa es de tipo `image` (CRS.Simple, coordenadas en píxeles) o de tipo `osm`
  (WGS84)
- **THEN** el control y la ausencia de desplazamiento se comportan igual en los dos

### Requirement: La vista SHALL sobrevivir a las dos transiciones

El centro y el nivel de zoom que el mapa tiene al expandirse SHALL ser los que tiene expandido,
y SHALL ser los que recupera al volver. Expandir el mapa no SHALL llevar al usuario a otro
sitio ni a otra escala.

La reposición de la vista SHALL ocurrir después de notificar el cambio de tamaño, nunca antes:
reponerla sobre un encuadre viejo la deja mal.

#### Scenario: Se expande donde se estaba mirando

- **GIVEN** un usuario que ha desplazado y acercado el mapa hasta una zona concreta
- **WHEN** expande el mapa a ventana completa
- **THEN** sigue viendo la misma zona, a la misma escala, con más superficie alrededor

#### Scenario: Y se vuelve al mismo sitio

- **WHEN** reduce el mapa
- **THEN** vuelve a ver la zona en la que estaba
