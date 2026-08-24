# Tasks — fix-campaign-search

## 0. La decisión que no es tuya

- [ ] 0.1 **Pregunta al propietario cuál de las tres salidas de `design.md` D2 quiere** antes
      de escribir código. La 1 cierra la fuga del todo y le quita al DJ poder buscar sus
      secretos; la 2 se los conserva a cambio de dos índices que sincronizar; la 3 es barata
      y NO cierra la fuga de existencia. No elijas por lo que sea más rápido de escribir.
- [ ] 0.2 Reproducir la fuga tal como está descrita, con una palabra que solo exista dentro
      de un bloque secreto. Si NO se reproduce, para y dilo: la propuesta estaría equivocada.
- [ ] 0.3 Mirar qué hace hoy `entity_trigrams` y si está infrautilizada (D3). Puede que media
      solución a la morfología ya esté construida.

## 1. La fuga

- [ ] 1.1 Implementar la salida elegida en 0.1, para el brazo léxico.
- [ ] 1.2 Lo mismo para el semántico (`embeddings.ts:126`), que embebe `name\nbody` en crudo.
- [ ] 1.3 El DJ y el co-DJ conservan lo que les corresponda según la salida elegida — y si la
      elegida se lo quita, que esté escrito en la propuesta y avisado.

## 2. La morfología

- [ ] 2.1 Que el índice case morfología española, con el banco de pruebas de la propuesta.
- [ ] 2.2 **No tocar `bm25(10, 8, 2, 1)`.**
- [ ] 2.3 Comprobar que lo que hoy SÍ funciona sigue funcionando: plurales y diacríticos.
      Una mejora que rompa `Ines`→`Inés` sería un retroceso, y en esta campaña hay nombres
      con tilde por todas partes.

## 3. Pruebas

- [ ] 3.1 La prueba de la fuga debe ser **ROJA hoy**. Si pasa a la primera está mal escrita
      (D4) — es el mismo error que `backup-api.test.ts`, que afirmaba la vulnerabilidad como
      comportamiento esperado.
- [ ] 3.2 Pruebas de morfología, una por par del banco, rojas antes y verdes después.
- [ ] 3.3 Prueba de no-regresión de plurales y diacríticos.
- [ ] 3.4 Las tres suites (`tests/unit/`, `tests/integration/` con el servidor en el 3333, y
      `tests/e2e/`) según manda el `CLAUDE.md` de este repo. Cifras reales al informe.

## 4. Cerrar

- [ ] 4.1 Si cambia algún endpoint o el modelo de datos, actualizar el CLI y **los dos**
      ficheros de skill a la vez, como exige el `CLAUDE.md` de este repo.
- [ ] 4.2 **No empujar.** Empujar a `master` despliega a producción; lo hace el propietario.
- [ ] 4.3 El cambio no está hecho hasta que el índice de PRODUCCIÓN se haya reconstruido y se
      haya comprobado allí que la palabra secreta ya no devuelve resultado a un jugador (D5).
      Deja escrito qué comprobar.
- [ ] 4.4 Reportar cualquier premisa de la propuesta que la medición contradiga.
