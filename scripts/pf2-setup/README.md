# PF2e Campaign Setup para Aleph

Scripts para crear y poblar una campaña de Pathfinder 2a Edición en Aleph.

## Requisitos

- Node.js 18 o superior
- `aleph` CLI configurado: ejecuta `aleph login` antes de usar estos scripts
- Los datos PF2e en `/Users/ludo/code/pf2`

## Inicio rápido

```bash
# 1. Crear la campaña con todos los tipos de entidad y plantillas
node scripts/pf2-setup/setup.js --name "Mi Campaña PF2e"

# 2. Poblar con todo el contenido de referencia PF2e
node scripts/pf2-setup/seed-entities.js --campaign <id> --type all

# O sembrar por tipo individual
node scripts/pf2-setup/seed-entities.js --campaign <id> --type spells
node scripts/pf2-setup/seed-entities.js --campaign <id> --type feats
```

## Qué hace cada script

### `setup.js`

Crea la estructura base de la campaña:

1. Verifica si la campaña ya existe (idempotente por nombre)
2. Crea la campaña con tema `high-fantasy`
3. Crea 14 tipos de entidad personalizados para PF2e
4. Crea una plantilla de campos por cada tipo de entidad
5. Crea la plantilla de personaje jugador ("PJ PF2e")
6. Crea la plantilla de PNJ/Criatura ("PNJ/Criatura PF2e")
7. Crea las 4 monedas PF2e (pp, go, pa, pc)

### `seed-entities.js`

Pobla el contenido de referencia PF2e leyendo los archivos JSON de `/Users/ludo/code/pf2`.

**Advertencia:** Ejecutar dos veces creará entidades duplicadas. Es un script de siembra inicial.

## Tipos de entidad creados

| Slug              | Nombre      | Descripción                                      |
| ----------------- | ----------- | ------------------------------------------------ |
| `pf2-conjuro`     | Conjuro     | Conjuros de todas las tradiciones                |
| `pf2-clase`       | Clase       | Las 18 clases de PF2e                            |
| `pf2-ascendencia` | Ascendencia | Razas jugables                                   |
| `pf2-herencia`    | Herencia    | Herencias de ascendencia                         |
| `pf2-trasfondo`   | Trasfondo   | Trasfondos de personaje                          |
| `pf2-dote`        | Dote        | Dotes de clase, ascendencia, habilidad y general |
| `pf2-accion`      | Accion      | Acciones básicas y especiales                    |
| `pf2-arma`        | Arma        | Armas cuerpo a cuerpo y a distancia              |
| `pf2-armadura`    | Armadura    | Armaduras ligeras, intermedias y pesadas         |
| `pf2-escudo`      | Escudo      | Escudos de todos los tipos                       |
| `pf2-objeto`      | Objeto      | Equipo y objetos varios                          |
| `pf2-rasgo`       | Rasgo       | Rasgos de reglas                                 |
| `pf2-condicion`   | Condicion   | Condiciones de estado                            |
| `pf2-arquetipo`   | Arquetipo   | Arquetipos y multiclase                          |

## Plantillas de personaje

### PJ PF2e

Para personajes jugadores. Incluye secciones:

- **Datos Principales**: Nivel, ascendencia, herencia, trasfondo, clase, subclase
- **Puntuaciones de Atributo**: FUE, DES, CON, INT, SAB, CAR
- **Defensas**: PG, CA, salvaciones, percepción
- **Ataque**: CD de clase, ataque de conjuro, CD de conjuro
- **Movimiento**: Velocidad terrestre, vuelo, nado, escalada, excavar
- **Habilidades**: Las 17 habilidades con valor de competencia y modificador
- **Dotes y Características**: Dotes de ascendencia, clase, habilidad, generales y características de clase
- **Lanzamiento de Conjuros**: Tradición, tipo, espacios de conjuro (niveles 1-10), trucos, foco
- **Equipo**: Armadura, escudo, armas
- **Recursos**: Puntos de héroe, concentración, recursos especiales
- **Notas**: Personalidad, apariencia, trasfondo narrativo, aliados, enemigos, notas

### PNJ/Criatura PF2e (predeterminada)

Para criaturas y PNJs. Incluye secciones:

- **Identidad**: Tipo de criatura, nivel, alineamiento, tamaño, rareza, rasgos
- **Características**: Percepción, sentidos, idiomas, habilidades
- **Modificadores de Atributo**: Los 6 atributos como modificadores
- **Defensas**: CA, PG, salvaciones, inmunidades, resistencias, debilidades
- **Ataque**: Velocidad, ataques CaC, ataques a distancia, conjuros, habilidades especiales
- **Fuente**: Manual, página, XP otorgada, tesoro

## Monedas PF2e

| Símbolo | Nombre            | Valor en pc |
| ------- | ----------------- | ----------- |
| pp      | Moneda de Platino | 1000        |
| go      | Moneda de Oro     | 100         |
| pa      | Moneda de Plata   | 10          |
| pc      | Moneda de Cobre   | 1           |

## Fuentes de datos

Todo el contenido proviene de la traducción española de PF2e en `/Users/ludo/code/pf2`:

| Tipo         | Archivo fuente                                     |
| ------------ | -------------------------------------------------- |
| Conjuros     | `tools/spellCardCreator/data/spells.json` (~410)   |
| Armas        | `tools/weaponsCardCreator/data/weapons.json` (~99) |
| Armaduras    | `tools/armorCardCreator/data/armors.json` (~12)    |
| Escudos      | `tools/shieldCardCreator/data/shields.json` (~4)   |
| Objetos      | `tools/itemCardCreator/data/items.json` (~51)      |
| Dotes        | `tools/featCardCreator/data/feats.json` (~1840)    |
| Acciones     | `tools/actionsCardCreator/data/actions.json` (~75) |
| Rasgos       | `tools/traitCardCreator/data/traits.json` (~223)   |
| Clases       | `docs/_clases/<slug>/index.md` (18 clases)         |
| Ascendencias | `docs/_ascendencias/<slug>/index.md`               |

## Crear un Personaje Jugador

### Desde la interfaz de Aleph

1. Ve a la campaña → "Personajes"
2. Crea un nuevo personaje
3. Selecciona la plantilla "PJ PF2e"
4. Rellena los campos del formulario

### Via API (ejemplo con curl)

```bash
# Obtener la API key de tu config
API_KEY=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME+'/.aleph/config.json')).apiKey)")
SERVER=$(node -e "const c=JSON.parse(require('fs').readFileSync(process.env.HOME+'/.aleph/config.json')); console.log(c.serverUrl||c.url)")
CAMPAIGN_ID="<id-de-la-campaña>"

# Obtener el ID de la plantilla PJ PF2e
TEMPLATE_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "$SERVER/api/campaigns/$CAMPAIGN_ID/templates" | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.find(t=>t.name==='PJ PF2e')?.id)")

# Crear el personaje con campos rellenados
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Naeris Lunaplata\",
    \"templateId\": \"$TEMPLATE_ID\",
    \"fields\": {
      \"level\": 1,
      \"ancestry\": \"Elfa\",
      \"heritage\": \"Elfa de los bosques\",
      \"background\": \"Acólita\",
      \"class\": \"Clérigo\",
      \"str\": 10, \"dex\": 14, \"con\": 12,
      \"int\": 12, \"wis\": 18, \"cha\": 14,
      \"max_hp\": 16, \"ac\": 15,
      \"fortitude\": \"E+4\", \"reflex\": \"E+5\", \"will\": \"E+9\",
      \"perception\": \"E+7\",
      \"speed\": 30
    }
  }" \
  "$SERVER/api/campaigns/$CAMPAIGN_ID/characters"
```
