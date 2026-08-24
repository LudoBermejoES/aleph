# Design — el buscador de campaña

## D1. Por qué los dos defectos van en el mismo cambio

Los dos viven en `search.ts`/`embeddings.ts` y los dos tocan **cómo se construye el índice**,
así que los dos obligan a reindexar. Separarlos cuesta dos reíndices y deja una ventana en la
que el índice tiene una mitad nueva y otra vieja. No están relacionados conceptualmente; van
juntos por el coste, y conviene decirlo así.

## D2. La fuga: tres salidas, y la elección NO es técnica

**Ésta es la decisión que hay que llevar al propietario antes de implementar.**

1. **Indexar el texto ya filtrado.** Cierra la fuga del todo, incluida la de existencia. El
   precio: **el DJ pierde poder buscar sus propios secretos**, que es justamente para lo que
   un DJ usa un buscador. Es la más segura y la más molesta.
2. **Dos índices, uno completo y otro filtrado**, y se consulta el que corresponda al rol.
   Conserva la búsqueda del DJ y cierra las dos fugas. El precio: dos índices que mantener
   sincronizados — y este proyecto ya sabe cómo acaba eso, con `arcanoiPoints` y con el
   constante de versión que se desincronizó seis veces.
3. **Rederivar el snippet en tiempo de petición** desde el fichero ya filtrado, dejando el
   índice como está. Barata y **NO cierra la fuga de existencia**: el resultado sigue
   apareciendo, y su sola presencia delata que la palabra está ahí.

La 3 no es suficiente sola. Entre la 1 y la 2 hay un intercambio real —seguridad frente a
utilidad para el DJ— y quien implemente **debe preguntar antes de elegir**, no decidir por
lo que sea más rápido de escribir.

## D3. La morfología: qué hay ya y qué no

FTS5 **no trae stemmer español**, así que `porter` no se sustituye por otro y ya está.

Lo que sí hay a mano: **una tabla de trigramas ya construida** (`entity_trigrams`, con su
índice por `campaign_id, trigram`). Media infraestructura de coincidencia difusa está puesta
y quizá infrautilizada — **míralo antes de construir nada nuevo**, porque un trigrama sobre
la raíz cubre buena parte de la conjugación sin añadir dependencias.

Alternativas, si no basta: indexar una columna normalizada además del texto, o un
tokenizador propio. Elige con una medida, no con una preferencia: el conjunto de pares de la
propuesta (`asesinar`/`asesinó`, `correr`/`corriendo`, `sangre`/`sangrienta`…) es
directamente el banco de pruebas.

Y **no toques `bm25(10, 8, 2, 1)`**. Si lo cambias a la vez, no habrá forma de saber qué
mejoró qué.

## D4. La prueba que faltaba

Lo que dejó pasar esto a producción es que las pruebas existentes comprobaban que el filtro
de respuesta borra un bloque `:::secret` **cuando la valla cae dentro de la ventana**. El
caso real es el contrario: una palabra que solo existe dentro del bloque, cuya ventana de
snippet no llega a la valla.

Esa prueba tiene que ser roja hoy. Si se escribe y pasa a la primera, está mal escrita — y
es exactamente el mismo error de método que la prueba de `backup-api.test.ts`, que afirmaba
la vulnerabilidad como comportamiento esperado.

## D5. Reindexar es un despliegue

Aleph despliega al empujar a `master`, con las suites como compuerta. El índice se
reconstruye en el servidor, así que el cambio no está hecho cuando pasan los tests: está
hecho cuando el índice de producción se ha reconstruido y **se ha comprobado allí** que la
palabra secreta ya no devuelve resultado a un jugador.
