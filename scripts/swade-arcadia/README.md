# swade-arcadia — Scripts de configuración y siembra

Scripts para configurar la campaña **Arcadia - La fuerza oculta** en Aleph con todo el contenido de referencia SWADE + Supers en español.

## Requisitos

- Node.js 18+
- Haber ejecutado `aleph login` (o tener `~/.aleph/config.json` con `serverUrl` y `apiKey`)
- Acceso a `/Users/ludo/code/swade/` con los manuales en español

## Uso

### 1. Configurar tipos de entidad y plantillas

```bash
node scripts/swade-arcadia/setup.js
```

Crea los 11 tipos de entidad SWADE, sus plantillas y las dos plantillas de personaje ("Personaje SWADE" y "Criatura SWADE"). Es seguro re-ejecutar: omite lo que ya existe.

### 2. Sembrar todo el contenido de referencia

```bash
node scripts/swade-arcadia/seed-entities.js --all
```

Importa todos los tipos de entidad en secuencia: ventajas, desventajas, rasgos, superpoderes, armaduras, armas, escudos, equipo, vehículos y bases de operaciones.

## Tipos por separado

```bash
node scripts/swade-arcadia/seed-entities.js --type ventajas
node scripts/swade-arcadia/seed-entities.js --type desventajas
node scripts/swade-arcadia/seed-entities.js --type rasgos
node scripts/swade-arcadia/seed-entities.js --type superpoderes
node scripts/swade-arcadia/seed-entities.js --type armaduras
node scripts/swade-arcadia/seed-entities.js --type armas
node scripts/swade-arcadia/seed-entities.js --type escudos
node scripts/swade-arcadia/seed-entities.js --type equipo
node scripts/swade-arcadia/seed-entities.js --type vehiculos
node scripts/swade-arcadia/seed-entities.js --type bases
```

## Advertencia

**No re-ejecutar `seed-entities.js` sobre una campaña ya poblada.** El script no comprueba duplicados: cada ejecución crea entidades nuevas. Si necesitas volver a sembrar, borra primero las entidades existentes del tipo en cuestión.

## Fuentes de datos

| Tipo         | Archivos fuente                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Ventajas     | `manuales/jsons/core/ventajas.json` (134) + `manuales/jsons/supers/ventajasSuperheroes.json` (6)              |
| Desventajas  | `manuales/jsons/core/desventajas.json` (57) + `manuales/jsons/supers/desventajasSuperheroes.json` (15)        |
| Rasgos       | `manuales/jsons/core/rasgos.json` (32)                                                                        |
| Superpoderes | `manuales/jsons/supers/superpoderes.json` (12) + `superpowers-es/*.md` (95)                                   |
| Armaduras    | `manuales/jsons/core/objetos/armaduras.json` + `manuales/jsons/supers/objetos/armaduras.json`                 |
| Armas        | `armas_personales.json` + `armas_especiales.json` + `manuales/jsons/supers/objetos/armas.json`                |
| Escudos      | `manuales/jsons/core/objetos/escudos.json`                                                                    |
| Equipo       | `manuales/jsons/core/objetos/equipo_miscelaneo.json` + `manuales/jsons/supers/objetos/equipo_aventurero.json` |
| Vehículos    | `manuales/jsons/core/objetos/vehiculos.json` + `manuales/jsons/supers/objetos/vehiculos.json`                 |
| Bases        | `manuales/jsons/supers/objetos/bases_operaciones.json`                                                        |
