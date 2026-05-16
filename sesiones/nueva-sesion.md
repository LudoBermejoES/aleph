# Documentar Nueva Sesión de Campaña

Este comando te guía para documentar una nueva sesión de cualquier campaña del proyecto Arcadia.

## Instrucciones

Cuando el usuario ejecute este comando, debes seguir estos pasos:

### 1. Identificar la Campaña y Sesión

El usuario proporcionará **uno o dos archivos** de la sesión:

- **Notas manuales**: Tomadas durante la partida por el DM
- **Notas AI (Gemini)**: Transcripción automática procesada por Gemini

**Identifica la campaña** por la ubicación del archivo o el contenido:

- `la-fuerza-oculta/` - Campaña principal actual
- `aun-sin-nombre/` - Campaña del Reformatorio Nueva Esperanza
- Otras campañas según estructura del proyecto

**Al menos uno de los dos es obligatorio.** Puede haber:

- Solo notas manuales (sin grabación)
- Solo notas AI (sin notas manuales)
- Ambos tipos de notas

**Información dentro de los archivos:**

- El **número de sesión** suele aparecer en el título o contenido del archivo
- La **fecha de la sesión** suele estar indicada al inicio del documento
- Lee el contenido para extraer estos datos si el usuario no los proporciona explícitamente

Si no puedes determinar la fecha o número de sesión del contenido, pregunta al usuario.

**Sugerencias proactivas:**
Una vez hayas leído y comprendido el contenido de la sesión, eres libre de sugerir al usuario la creación de nuevos documentos para:

- **Personajes**: NPCs nuevos o que ganaron relevancia
- **Grupos/Organizaciones**: Facciones nuevas mencionadas
- **Localizaciones**: Lugares específicos visitados o mencionados
- **Barrios/Distritos**: Nuevas áreas de Arcadia exploradas
- **Otros elementos del worldbuilding** que merezcan documentación propia

Estas sugerencias son opcionales y el usuario decidirá si proceder con ellas.

### 2. Estructura de Directorios

Las campañas tienen tres tipos de contenido relacionado con AI:

```
docs/campaigns/[campaña]/
├── ai-notes/              # Transcripciones CRUDAS de Gemini (sin modificar)
│   └── YYYY-MM-DD-gemini-notes.md
├── ai-notes-summary/      # Resúmenes ANALÍTICOS (escritos por Claude)
│   └── YYYY-MM-DD-gemini-notes.md
└── manual-notes/          # Notas manuales del DM
    └── session-XX-YYYY-MM-DD.md
```

**IMPORTANTE: Diferencia entre ai-notes/ y ai-notes-summary/**

- `ai-notes/`: Contiene las **transcripciones crudas** de Gemini, tal cual las genera la IA. NO SE MODIFICAN excepto para añadir frontmatter opcional.
- `ai-notes-summary/`: Contiene **resúmenes analíticos** escritos por Claude, siguiendo el formato estructurado de análisis de sesión.

### 3. Archivos a Crear

#### Notas Manuales (si el usuario proporciona)

- **Ruta**: `docs/campaigns/[campaña]/manual-notes/session-XX-YYYY-MM-DD.md`
- **Acción**: Añadir frontmatter al contenido proporcionado
- **Frontmatter obligatorio**:

```yaml
---
layout: page
title: '[Campaña] - Sesión XX'
permalink: /campaigns/[campaña]/manual-notes/session-XX-YYYY-MM-DD/
---
```

#### Transcripción Cruda de AI (si el usuario proporciona)

- **Ruta**: `docs/campaigns/[campaña]/ai-notes/YYYY-MM-DD-gemini-notes.md`
- **Acción**: Copiar el contenido TAL CUAL, sin modificar (solo añadir frontmatter si se desea)
- **Frontmatter opcional** (las transcripciones crudas pueden no tenerlo)

#### Resumen Analítico (OBLIGATORIO si hay transcripción AI)

- **Ruta**: `docs/campaigns/[campaña]/ai-notes-summary/YYYY-MM-DD-gemini-notes.md`
- **Acción**: ESCRIBIR un resumen analítico basado en la transcripción y/o notas manuales
- **Frontmatter obligatorio**:

```yaml
---
layout: page
title: '[Campaña] - Análisis Sesión XX'
permalink: /campaigns/[campaña]/ai-notes-summary/YYYY-MM-DD-gemini-notes/
---
```

**El resumen analítico debe seguir esta estructura:**

1. **Resumen Ejecutivo**: 2-3 párrafos con lo más importante
2. **Eventos Principales**: Lista numerada de los eventos clave
3. **Desarrollo de Personajes**: Cómo evolucionó cada PJ
4. **Revelaciones Importantes**: Información nueva descubierta
5. **Temas Narrativos**: Análisis de temas tratados
6. **Mecánicas de Juego Destacadas**: Tiradas importantes
7. **Información para Continuidad**: Hilos abiertos para próximas sesiones
8. **Citas Destacadas**: Frases memorables de la sesión

Consulta ejemplos existentes en `ai-notes-summary/` para ver el formato esperado.

### 4. Índices a Actualizar (OBLIGATORIO)

**⚠️ CRÍTICO**: Este paso es el más propenso a errores. TODOS los índices deben actualizarse simultáneamente para mantener la sincronización. Lee y actualiza CADA UNO de estos archivos sin excepción.

Lee y actualiza estos archivos en orden (adapta las rutas a la campaña correspondiente):

#### Índices Principales (SIEMPRE actualizar):

1. **`docs/campaigns/[campaña]/index.md`** ⭐ PRINCIPAL
   - Añadir sesión a cronología en la fase correspondiente
   - Actualizar estadísticas generales (sesiones totales, horas, etc.)
   - Actualizar "Estado Actual" si hay cambios narrativos importantes
   - Verificar que los nombres de jugadores/personajes sean correctos

2. **`docs/campaigns/[campaña]/ai-notes/index.md`** ⭐ SI HAY TRANSCRIPCIÓN
   - Añadir nueva entrada con enlace que apunte a `../ai-notes-summary/`
   - Actualizar estadísticas de transcripciones
   - **IMPORTANTE**: Los enlaces deben apuntar a ai-notes-summary/, no a ai-notes/

3. **`docs/campaigns/[campaña]/ai-notes-summary/index.md`** ⭐ SI HAY TRANSCRIPCIÓN
   - **NO OLVIDAR**: Este índice es SEPARADO del de ai-notes/
   - Añadir entrada del nuevo análisis con breve descripción
   - Organizar por mes/año si es necesario

4. **`docs/campaigns/[campaña]/manual-notes/index.md`** ⭐ SI HAY NOTAS MANUALES
   - Añadir nueva entrada en cronología
   - Actualizar estadísticas (total sesiones, período)

5. **`docs/campaigns/[campaña]/sessions/index.md`** ⭐ SI EXISTE (La Fuerza Oculta lo tiene)
   - Añadir nueva entrada en la cronología de sesiones
   - Actualizar sección de AI notes y resúmenes analíticos
   - Actualizar estadísticas y métricas
   - **IMPORTANTE para La Fuerza Oculta**: Este índice EXISTE y debe actualizarse

6. **`docs/campaigns/[campaña]/summary/summary.md`** ⭐ SI EXISTE (La Fuerza Oculta lo tiene)
   - **La Fuerza Oculta**: Actualizar con eventos de la nueva sesión
   - Añadir nueva sesión con descripción detallada
   - Actualizar "Conclusión" y estado actual del grupo

#### Índices Secundarios (verificar si existen):

7. **Índices específicos por campaña**:
   - **Reformatorio**: `reformatorio/index.md` - Si existe
   - Cualquier otro archivo index.md dentro de la carpeta de la campaña

#### Verificación Final de Índices:

```bash
# Ejecuta este comando para ver todos los índices de la campaña:
find docs/campaigns/[campaña] -name "index.md" -o -name "summary.md"
```

Asegúrate de haber actualizado TODOS los archivos listados.

### 5. Actualizar Fichas de Personajes (OBLIGATORIO)

**⚠️ CRÍTICO**: Este paso es OBLIGATORIO, no opcional. Siempre que una sesión tenga impacto en los personajes, sus fichas deben actualizarse. No hacerlo deja el proyecto desincronizado.

#### Proceso obligatorio:

1. **Lee las fichas** de todos los personajes que aparecen en la sesión (leer antes de editar)
2. **Actualiza cada ficha** según lo que ocurrió — en cada ficha:
   - Añadir nueva **Fase** en la sección de Cronología con los eventos relevantes
   - Actualizar la sección **Estado Actual** con fecha, ubicación y estado emocional/físico actual
   - Añadir la sesión a la lista de **Apariciones Documentadas**
   - Actualizar **Relaciones** si hubo cambios (nuevos aliados, mentores, conflictos)
   - Actualizar la **nota final** en cursiva si la evolución del personaje lo justifica

#### Qué actualizar en cada ficha (según eventos):

| Evento en sesión          | Qué actualizar en la ficha               |
| ------------------------- | ---------------------------------------- |
| Combate / heridas         | Estado físico en Estado Actual           |
| Crisis emocional / trauma | Estado emocional, nueva Fase, nota final |
| Nueva relación o mentoría | Sección de Relaciones                    |
| Nuevo poder o habilidad   | Sección de Poderes, nueva Fase           |
| Cambio de ubicación       | Estado Actual > Ubicación actual         |
| Decisión moral importante | Filosofía, nueva Fase                    |
| Revelación importante     | Revelaciones, nueva Fase                 |

#### Personajes de La Fuerza Oculta (fichas a revisar):

- `docs/characters/details/eslizon-esmeralda.md`
- `docs/characters/details/diana.md`
- `docs/characters/details/pantomima.md`
- `docs/characters/details/mencia-psique-cia.md`
- `docs/characters/details/justa-justicia-sentencia.md`
- `docs/characters/details/hotman.md`

#### NPCs con ficha propia que pueden requerir actualización:

- `docs/characters/details/mesmero.md` — si aparece o revela algo
- `docs/characters/details/jorge-espectro.md` — si interactúa con el grupo
- `docs/characters/details/roberto-mckomick.md` — si el tío aparece o es mencionado
- Otros NPCs que aparezcan activamente en la sesión

#### Reglas importantes:

- **SOLO actualiza lo que realmente ocurrió** — no añadas especulaciones o planes futuros que aún no se han ejecutado en juego
- Si algo se "anuncia" para el futuro pero aún no ha sucedido, márcalo claramente como "anunciado" o "pendiente de inicio"
- Usa siempre **nombres de personajes**, nunca nombres de jugadores
- **Leer la ficha antes de editar** para no duplicar información ya existente

#### Otros archivos contextuales:

- **Ficha del grupo** (`docs/groups/la-fuerza-oculta.md`) si hay cambios de equipo o dinámica grupal
- **Nuevos NPCs** en `docs/characters/details/` + actualizar `character-list.md`
- **Nuevos grupos** en `docs/groups/`

### 6. Revisión Contextual Adicional

Después de actualizar fichas de personajes, evalúa si también necesitas:

### 6b. Checklist Final

Presenta al usuario este checklist antes de hacer commit:

```
## Sesión XX (DD Mes YYYY)

### Obligatorio - Archivos de sesión:
- [ ] Crear/verificar manual-notes/session-XX-YYYY-MM-DD.md
- [ ] Crear/verificar ai-notes/YYYY-MM-DD-gemini-notes.md (transcripción cruda)
- [ ] Crear/verificar ai-notes-summary/YYYY-MM-DD-gemini-notes.md (resumen analítico pero estrictamente enfocado en la sesión de juego y los personajes, no en los comentarios fuera de la sesión de rol). Para este resumen usa siempre los nombres de los personajes, nunca los del jugador, y trata a Ludo Bermejo como narrador

### ⚠️ Obligatorio - Índices (NO OMITIR NINGUNO):
- [ ] Actualizar [campaña]/index.md (principal)
- [ ] Actualizar [campaña]/ai-notes/index.md (si hay transcripción)
- [ ] Actualizar [campaña]/ai-notes-summary/index.md ⭐ (SI HAY RESUMEN - NO OLVIDAR)
- [ ] Actualizar [campaña]/manual-notes/index.md (si hay notas manuales)
- [ ] Actualizar [campaña]/sessions/index.md ⭐ (La Fuerza Oculta - EXISTE Y ES OBLIGATORIO)
- [ ] Actualizar [campaña]/summary/summary.md ⭐ (La Fuerza Oculta - EXISTE Y ES OBLIGATORIO)
- [ ] Revisar otros índices específicos de la campaña

### ⚠️ Obligatorio - Fichas de personajes (NO OMITIR):
- [ ] Leer y actualizar ficha de cada PJ que aparece en la sesión
- [ ] Añadir nueva Fase a la cronología de cada PJ afectado
- [ ] Actualizar Estado Actual (fecha, ubicación, estado emocional/físico)
- [ ] Añadir sesión a Apariciones Documentadas de cada PJ
- [ ] Actualizar Relaciones si hubo cambios (mentores, aliados, conflictos)
- [ ] Actualizar fichas de NPCs relevantes (Mésmero, Espectro, etc.) si procede
- [ ] Solo documentar lo que YA ocurrió en juego — no especulaciones ni planes futuros

### Contextual (según contenido):
- [ ] Actualizar ficha del grupo si hay cambios de equipo
- [ ] Crear fichas de nuevos NPCs + actualizar character-list.md
- [ ] Actualizar fichas de grupos mencionados
- [ ] Actualizar historial.md
```

### 7. Commit

Sugerir mensaje de commit en formato:

```
Añadir documentación de Sesión XX (DD Mes YYYY)
```

## Notas Importantes

### Diferencia Crítica: ai-notes/ vs ai-notes-summary/

| Directorio          | Contenido                        | Acción de Claude               |
| ------------------- | -------------------------------- | ------------------------------ |
| `ai-notes/`         | Transcripciones CRUDAS de Gemini | Copiar sin modificar           |
| `ai-notes-summary/` | Resúmenes ANALÍTICOS             | ESCRIBIR análisis estructurado |

- **NUNCA** copies la transcripción cruda a ai-notes-summary/
- **SIEMPRE** escribe un resumen analítico nuevo basado en el contenido de la sesión
- El índice de `ai-notes/` enlaza a archivos en `ai-notes-summary/` para los análisis
- Usar enlaces Jekyll: `{{ site.baseurl }}/ruta/` NO enlaces .md relativos
- Verificar que las estadísticas coincidan entre todos los índices

### Campañas Soportadas

- **La Fuerza Oculta**: `docs/campaigns/la-fuerza-oculta/`
- **Reformatorio Nueva Esperanza**: `docs/campaigns/aun-sin-nombre/`
- Otras campañas siguen la misma estructura
