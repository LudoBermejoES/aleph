# Arcos narrativos — Berlín en tinieblas

Campaña de Mago: la Ascensión 20.º aniversario ambientada en Berlín. 79 sesiones,
del 9 de abril de 2020 al 25 de mayo de 2023, derivadas de las crónicas de
[`../summary/`](../summary/).

En el esquema de aleph una sesión tiene **exactamente un** `arcId`, así que los arcos
**particionan** las 79 sesiones: son tramos contiguos de sesiones consecutivas —temporadas,
o libros— y no se solapan. Cuando un hilo secundario cruza un arco o lo atraviesa de lado a
lado, se dice en la descripción de ese arco en lugar de inventar un arco paralelo.

## Índice

| #   | Arco                                                               | Slug                           | Fechas                  | Sesiones |
| --- | ------------------------------------------------------------------ | ------------------------------ | ----------------------- | -------- |
| 01  | [Fuego en las vías](01-fuego-en-las-vias.md)                       | `fuego-en-las-vias`            | 2020-04-09 → 2020-07-17 | 5        |
| 02  | [Bajo el Sol Negro](02-bajo-el-sol-negro.md)                       | `bajo-el-sol-negro`            | 2020-10-02 → 2021-02-25 | 14       |
| 03  | [Lo que Berlín hizo sin ellos](03-lo-que-berlin-hizo-sin-ellos.md) | `lo-que-berlin-hizo-sin-ellos` | 2021-03-04 → 2021-04-29 | 4        |
| 04  | [El Edificio Leeren](04-el-edificio-leeren.md)                     | `el-edificio-leeren`           | 2021-05-13 → 2021-09-02 | 8        |
| 05  | [El camino hasta Oda](05-el-camino-hasta-oda.md)                   | `el-camino-hasta-oda`          | 2021-09-16 → 2022-01-13 | 8        |
| 06  | [El hotel de Oda](06-el-hotel-de-oda.md)                           | `el-hotel-de-oda`              | 2022-01-27 → 2022-03-10 | 7        |
| 07  | [Los que mueven Berlín](07-los-que-mueven-berlin.md)               | `los-que-mueven-berlin`        | 2022-03-17 → 2022-06-30 | 9        |
| 08  | [La casa de las mil puertas](08-la-casa-de-las-mil-puertas.md)     | `la-casa-de-las-mil-puertas`   | 2022-07-07 → 2022-09-22 | 6        |
| 09  | [Raíces y mecanismos](09-raices-y-mecanismos.md)                   | `raices-y-mecanismos`          | 2022-10-06 → 2023-01-19 | 7        |
| 10  | [La búsqueda de Salvador](10-la-busqueda-de-salvador.md)           | `la-busqueda-de-salvador`      | 2023-03-09 → 2023-04-13 | 5        |
| 11  | [La búsqueda de Julia](11-la-busqueda-de-julia.md)                 | `la-busqueda-de-julia`         | 2023-04-20 → 2023-05-25 | 6        |
|     | **Total**                                                          |                                |                         | **79**   |

5 + 14 + 4 + 8 + 8 + 7 + 9 + 6 + 7 + 5 + 6 = 79.

> **Los arcos 09 y siguientes: el nombre del arco 09 no coincide con su archivo.** En la base
> de datos de aleph el arco `raices-y-mecanismos` se llama **«La búsqueda de Roland»**, mientras
> que este directorio lo titula «Raíces y mecanismos». La discrepancia es anterior a los arcos 10
> y 11 y no se ha tocado aquí; se apunta para que nadie la lea como un error introducido al
> añadir las búsquedas de personaje.

## Cómo se han trazado las fronteras

El criterio ha sido buscar los puntos donde la campaña **cambia de objetivo o de mundo**, no
repartir 73 sesiones en cajas del mismo tamaño. Los cortes más nítidos los da el propio
material:

- **Cruces de umbral.** Entrar en el Berlín de 1943 (01→02) y volver de él (02→03) son las dos
  fronteras más obvias de toda la campaña: cambia el mundo entero, no solo la trama. Son
  también las dos únicas fronteras de la expedición, porque todo lo que ocurre entre ellas
  cabe en un solo arco.
- **Decisiones dichas en voz alta.** La sesión del 13 de mayo de 2021 abre con la decisión
  unánime de entrar en el Edificio Leeren; ahí empieza el arco 04 y termina el 03.
- **Problema planteado / problema resuelto.** El coma de Oda se plantea al final del 04, se
  busca un camino durante el 05 y se resuelve dentro de su cabeza en el 06.
- **Escenarios cerrados.** La mansión de la Orden de Hermes (08) y el hotel de Oda (06) son
  lugares con entrada, recorrido y salida: se explican solos como arcos.
- **Búsquedas de personaje.** Los arcos 10 y 11 son de una clase distinta al resto: cada uno
  lo protagoniza **un solo personaje** y los demás jugadores encarnan a gente ajena a la cábala
  —las vidas anteriores de Salvador en el 10; los mercenarios de escolta, y luego los
  estudiantes akáshicos cuyos cuerpos ocupan, en el 11—. La frontera entre ambos no es un
  cambio de mundo sino un cambio de protagonista, y es nítida porque la cábala se separa a
  propósito: cada uno se va a preparar por su cuenta.

## Decisiones discutibles

- **Sin capítulos.** aleph admite una jerarquía arco → capítulo → sesión, pero esta
  campaña no usa capítulos y no va a usarlos: ninguna de las 79 sesiones tiene
  `chapterId`. Se evaluó una propuesta de dieciséis capítulos para los seis arcos con
  costuras internas reales y se descartó, porque nada en la interfaz de lectura agrupa
  las sesiones por capítulo —la página de una sesión no menciona ni su arco— y a ~515
  palabras por sesión un capítulo sería un bloque de escenas, no un capítulo de libro.
  La descripción de cada arco, más su nota de frontera, ya hacen ese trabajo. El
  documento con la propuesta se ha eliminado por no usarse.

- **Diez arcos, no once: los dos arcos de 1943 se han fundido en uno.** El análisis original
  trazó once arcos y mantuvo separados «La ciudad bajo la cúpula» (siete sesiones, el umbral y
  la lonja) y «Los invitados de Klinger» (siete sesiones, la mansión y el regreso), con este
  argumento: a mitad del tramo cambia el objetivo, de sobrevivir y encontrar a Regine a cruzar
  la ciudad y volver a casa. Ese cambio de objetivo es real y sigue documentado en la nota de
  frontera del arco 02. La decisión —deliberada, tomada después— ha sido que no basta para
  justificar una frontera: las catorce sesiones son **una sola expedición** a 1943, con un
  único cruce de entrada y un único cruce de salida, y el giro de la mansión es una bisagra
  interna de ese viaje, no un cambio de mundo. Los dos arcos son ahora «Bajo el Sol Negro»
  (catorce sesiones), y los arcos posteriores se han renumerado uno hacia arriba.
- **Lo que sigue sin fundirse.** Consideré también meter «Lo que Berlín hizo sin ellos» (03,
  cuatro sesiones) dentro de «El Edificio Leeren», y eso sigue descartado: ese tramo corto es
  donde nacen tres hilos que se cobran mucho más tarde —la desaparición de Meiling, la embajada
  vampírica y el verdadero peso de la carta de la Fortaleza—, y disolverlo en el asalto al
  edificio los habría hecho invisibles.
- **El arco 07 es deliberadamente heterogéneo.** Hermandad turca, Kaymu Corporation, el
  casi-Oráculo, el túnel bajo el canal, el simulacro de Hugo y la Príncipe de Berlín parecen
  seis cosas distintas, pero son un solo movimiento: la cábala dejando de reaccionar y
  empezando a acumular palancas en el Berlín del presente.
- **El arco 09 junta un ritual y una máquina.** El traslado de Madre y la sala del nodo nazi
  conviven porque son la misma temporada de consolidación, y porque la máquina que Salvador
  toca ahí es exactamente la que le arrastra al arco 10. El parón de meses de la campaña cae
  dentro de este arco, no en su frontera: las sesiones del 12 y 19 de enero de 2023 son
  explícitamente un reencuentro con los asuntos pendientes, no un comienzo nuevo.
- **Ninguna sesión ha sido forzada.** Las dos crónicas de notas escasas (17 de noviembre de
  2022 y 12 de enero de 2023) se apoyan en su contexto: la primera declara ser la continuación
  directa de la secuencia de botones de la anterior, y la segunda declara ser el regreso tras
  el silencio. Ambas caen en el arco 09 por continuidad explícita, no por descarte.

## Nota sobre las fechas

La campaña **empieza el 9 de abril de 2020**, no en octubre: hay cinco sesiones anteriores
(abril a julio de 2020) que forman el arco 01 y que son las que llevan al grupo hasta la
puerta. En aleph, además, el campo `sessionNumber` **no** sigue el orden cronológico, así que
todo aquí se ordena por `scheduledDate`.

Las búsquedas de personaje se juegan **en jueves**, como el resto de la campaña. El arco 10
salta el 6 de abril de 2023 —Jueves Santo— y por eso su última sesión cae el día 13; el arco 11
retoma el jueves siguiente, el 20 de abril, y corre sin saltos hasta el 25 de mayo.
