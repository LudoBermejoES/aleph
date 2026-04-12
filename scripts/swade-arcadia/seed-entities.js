#!/usr/bin/env node
/**
 * scripts/swade-arcadia/seed-entities.js
 *
 * Seeds SWADE + Supers reference entities into the Arcadia campaign.
 *
 * Usage:
 *   node seed-entities.js --all
 *   node seed-entities.js --type ventajas
 *
 * Available types: ventajas, desventajas, rasgos, superpoderes,
 *                  armaduras, armas, escudos, equipo, vehiculos, bases
 *
 * WARNING: Running this twice will create duplicate entities.
 */

import fs from 'fs'
import path from 'path'
import { apiFetch } from './lib/api.js'
import {
  formatVentaja,
  formatDesventaja,
  formatRasgo,
  formatSuperpoder,
  formatArmadura,
  formatArma,
  formatEquipo,
  formatEscudo,
  formatVehiculo,
  formatBase,
} from './lib/format.js'

const ARCADIA_CAMPAIGN_ID = '753b7958-d63b-4053-bcb5-1ac44b0f96e0'
const SWADE_ROOT = '/Users/ludo/code/swade'

const DELAY_MS = 300

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readJson(relPath) {
  const full = path.join(SWADE_ROOT, relPath)
  if (!fs.existsSync(full)) {
    console.warn(`  ⚠ Archivo no encontrado: ${full}`)
    return null
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'))
}

/** Flatten category-grouped equipment JSON into flat item array with category attached */
function flattenCategoryItems(data) {
  if (!data) return []
  const result = []
  for (const group of data) {
    const category = group.category || ''
    for (const item of group.items || []) {
      result.push({ ...item, _category: category })
    }
  }
  return result
}

async function createEntity(body) {
  await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/entities`, 'POST', body)
  await sleep(DELAY_MS)
}

// ---------------------------------------------------------------------------
// Ventajas
// ---------------------------------------------------------------------------
async function seedVentajas() {
  console.log('\n--- Sembrando ventajas ---')

  const core = readJson('manuales/jsons/core/ventajas.json') || []
  const supers = readJson('manuales/jsons/supers/ventajasSuperheroes.json') || []

  let count = 0
  for (const v of core) {
    console.log(`  Creando ventaja: ${v.nombre}...`)
    await createEntity({
      name: v.nombre,
      type: 'ventaja',
      content: formatVentaja(v),
      fields: {
        requisitos: v.requisitos || '',
        descripcion: v.descripción || v.descripcion || '',
      },
    })
    count++
  }
  for (const v of supers) {
    console.log(`  Creando ventaja: ${v.nombre}...`)
    await createEntity({
      name: v.nombre,
      type: 'ventaja',
      content: formatVentaja(v),
      tags: ['superheroes'],
      fields: {
        requisitos: v.requisitos || '',
        descripcion: v.descripción || v.descripcion || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} ventajas creadas`)
}

// ---------------------------------------------------------------------------
// Desventajas
// ---------------------------------------------------------------------------
async function seedDesventajas() {
  console.log('\n--- Sembrando desventajas ---')

  const core = readJson('manuales/jsons/core/desventajas.json') || []
  const supers = readJson('manuales/jsons/supers/desventajasSuperheroes.json') || []

  let count = 0
  for (const d of core) {
    console.log(`  Creando desventaja: ${d.nombre}...`)
    await createEntity({
      name: d.nombre,
      type: 'desventaja',
      content: formatDesventaja(d),
      fields: {
        tipo: d.tipo || '',
        descripcion: d.descripción || d.descripcion || '',
      },
    })
    count++
  }
  for (const d of supers) {
    console.log(`  Creando desventaja: ${d.nombre}...`)
    await createEntity({
      name: d.nombre,
      type: 'desventaja',
      content: formatDesventaja(d),
      tags: ['superheroes'],
      fields: {
        tipo: d.tipo || '',
        descripcion: d.descripción || d.descripcion || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} desventajas creadas`)
}

// ---------------------------------------------------------------------------
// Rasgos
// ---------------------------------------------------------------------------
async function seedRasgos() {
  console.log('\n--- Sembrando rasgos ---')

  const data = readJson('manuales/jsons/core/rasgos.json') || []
  let count = 0

  for (const r of data) {
    console.log(`  Creando rasgo: ${r.nombre}...`)
    await createEntity({
      name: r.nombre,
      type: 'rasgo',
      content: formatRasgo(r),
      fields: {
        atributo_vinculado: r.atributo || '',
        descripcion: r.descripción || r.descripcion || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} rasgos creados`)
}

// ---------------------------------------------------------------------------
// Superpoderes
// ---------------------------------------------------------------------------

/** Convert kebab-case filename to Title Case name */
function filenameToName(filename) {
  return filename
    .replace(/\.md$/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Normalize a name for matching: lowercase, remove accents, remove spaces */
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

async function seedSuperpoderes() {
  console.log('\n--- Sembrando superpoderes ---')

  const jsonIndex = readJson('manuales/jsons/supers/superpoderes.json') || []
  const superpoderesMap = new Map()
  for (const sp of jsonIndex) {
    superpoderesMap.set(normalizeName(sp.nombre), sp)
  }

  const mdDir = path.join(SWADE_ROOT, 'superpowers-es')
  if (!fs.existsSync(mdDir)) {
    console.warn(`  ⚠ Directorio no encontrado: ${mdDir}`)
    return
  }

  const mdFiles = fs
    .readdirSync(mdDir)
    .filter((f) => f.endsWith('.md'))
    .sort()

  let count = 0
  for (const filename of mdFiles) {
    const name = filenameToName(filename)
    const mdContent = fs.readFileSync(path.join(mdDir, filename), 'utf8')
    const spEntry = superpoderesMap.get(normalizeName(name)) || null

    console.log(`  Creando superpoder: ${name}...`)

    const fields = {}
    if (spEntry) {
      if (spEntry.coste != null) fields.coste = String(spEntry.coste)
      if (spEntry.ornamentos) fields.ornamentos = spEntry.ornamentos
    }

    await createEntity({
      name,
      type: 'superpoder',
      content: formatSuperpoder(spEntry, mdContent),
      fields,
    })
    count++
  }

  console.log(`✓ ${count} superpoderes creados`)
}

// ---------------------------------------------------------------------------
// Armaduras
// ---------------------------------------------------------------------------
async function seedArmaduras() {
  console.log('\n--- Sembrando armaduras ---')

  const core = flattenCategoryItems(readJson('manuales/jsons/core/objetos/armaduras.json'))
  const supers = flattenCategoryItems(readJson('manuales/jsons/supers/objetos/armaduras.json'))

  let count = 0
  for (const item of [...core, ...supers]) {
    console.log(`  Creando armadura: ${item.name}...`)
    await createEntity({
      name: item.name,
      type: 'armadura',
      content: formatArmadura(item, item._category),
      tags: item._category ? [item._category.toLowerCase().replace(/\s+/g, '-')] : [],
      fields: {
        proteccion: item.armor ?? null,
        localizaciones: item.locations || '',
        peso: item.weight ?? null,
        coste: item.cost ?? null,
        fuerza_minima: item.min_strength || '-',
        notas: item.notes || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} armaduras creadas`)
}

// ---------------------------------------------------------------------------
// Armas
// ---------------------------------------------------------------------------
async function seedArmas() {
  console.log('\n--- Sembrando armas ---')

  const personal = flattenCategoryItems(
    readJson('manuales/jsons/core/objetos/armas_personales.json'),
  )
  const especiales = flattenCategoryItems(
    readJson('manuales/jsons/core/objetos/armas_especiales.json'),
  )
  const supers = flattenCategoryItems(readJson('manuales/jsons/supers/objetos/armas.json'))

  let count = 0
  for (const item of [...personal, ...especiales, ...supers]) {
    console.log(`  Creando arma: ${item.name}...`)
    await createEntity({
      name: item.name,
      type: 'arma',
      content: formatArma(item, item._category),
      tags: item._category ? [item._category.toLowerCase().replace(/\s+/g, '-')] : [],
      fields: {
        dano: item.damage || '',
        fuerza_minima: item.min_strength || '-',
        peso: item.weight ?? null,
        coste: item.cost ?? null,
        notas: item.notes || '',
        categoria: item._category || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} armas creadas`)
}

// ---------------------------------------------------------------------------
// Escudos
// ---------------------------------------------------------------------------
async function seedEscudos() {
  console.log('\n--- Sembrando escudos ---')

  const data = flattenCategoryItems(readJson('manuales/jsons/core/objetos/escudos.json'))
  let count = 0

  for (const item of data) {
    console.log(`  Creando escudo: ${item.name}...`)
    await createEntity({
      name: item.name,
      type: 'escudo',
      content: formatEscudo(item, item._category),
      fields: {
        bonus_parada: item.parry_bonus ?? item.parry ?? null,
        cobertura: item.coverage ?? item.cover ?? '',
        peso: item.weight ?? null,
        coste: item.cost ?? null,
      },
    })
    count++
  }

  console.log(`✓ ${count} escudos creados`)
}

// ---------------------------------------------------------------------------
// Equipo
// ---------------------------------------------------------------------------
async function seedEquipo() {
  console.log('\n--- Sembrando equipo ---')

  const misc = flattenCategoryItems(readJson('manuales/jsons/core/objetos/equipo_miscelaneo.json'))
  const aventurero = flattenCategoryItems(
    readJson('manuales/jsons/supers/objetos/equipo_aventurero.json'),
  )

  let count = 0
  for (const item of [...misc, ...aventurero]) {
    console.log(`  Creando equipo: ${item.name}...`)
    await createEntity({
      name: item.name,
      type: 'equipo',
      content: formatEquipo(item, item._category),
      tags: item._category ? [item._category.toLowerCase().replace(/\s+/g, '-')] : [],
      fields: {
        peso: item.weight ?? null,
        coste: item.cost ?? null,
        notas: item.notes || '',
        categoria: item._category || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} equipos creados`)
}

// ---------------------------------------------------------------------------
// Vehículos
// ---------------------------------------------------------------------------
async function seedVehiculos() {
  console.log('\n--- Sembrando vehículos ---')

  const core = flattenCategoryItems(readJson('manuales/jsons/core/objetos/vehiculos.json'))
  const supers = flattenCategoryItems(readJson('manuales/jsons/supers/objetos/vehiculos.json'))

  let count = 0
  for (const item of [...core, ...supers]) {
    console.log(`  Creando vehículo: ${item.name}...`)
    await createEntity({
      name: item.name,
      type: 'vehiculo',
      content: formatVehiculo(item, item._category),
      tags: item._category ? [item._category.toLowerCase().replace(/\s+/g, '-')] : [],
      fields: {
        tamanio: item.size ?? null,
        manejo: item.manejo ?? item.maneuver ?? '',
        velocidad_max: item.vm ?? item.topspeed ?? null,
        dureza: item.toughness ?? '',
        tripulacion: item.crew ?? '',
        coste: item.cost ?? null,
        categoria: item._category || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} vehículos creados`)
}

// ---------------------------------------------------------------------------
// Bases de operaciones
// ---------------------------------------------------------------------------
async function seedBases() {
  console.log('\n--- Sembrando bases de operaciones ---')

  const data = readJson('manuales/jsons/supers/objetos/bases_operaciones.json')
  if (!data) {
    console.warn('  ⚠ No se encontró bases_operaciones.json')
    return
  }

  // The file may be a single object or an array; handle both
  const entries = Array.isArray(data) ? data : [data]
  let count = 0

  for (const base of entries) {
    const name = base.category || base.name || 'Base de Operaciones'
    console.log(`  Creando base: ${name}...`)
    await createEntity({
      name,
      type: 'base-de-operaciones',
      content: formatBase(name, base),
      fields: {
        coste_por_nivel: base.base_cost_per_level ?? null,
        dureza: base.base_toughness ?? null,
        modificaciones: (base.modifications || [])
          .map(
            (m) =>
              `${m.name}${m.cost != null ? ' (' + m.cost + ' SPP)' : ''}${m.notes ? ': ' + m.notes : ''}`,
          )
          .join('\n'),
      },
    })
    count++
  }

  console.log(
    `✓ ${count === 1 ? 'Base de operaciones creada' : count + ' bases de operaciones creadas'}`,
  )
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const SEED_MAP = {
  ventajas: seedVentajas,
  desventajas: seedDesventajas,
  rasgos: seedRasgos,
  superpoderes: seedSuperpoderes,
  armaduras: seedArmaduras,
  armas: seedArmas,
  escudos: seedEscudos,
  equipo: seedEquipo,
  vehiculos: seedVehiculos,
  bases: seedBases,
}

async function main() {
  const args = process.argv.slice(2)
  const allFlag = args.includes('--all')
  const typeIdx = args.indexOf('--type')
  const typeName = typeIdx !== -1 ? args[typeIdx + 1] : null

  if (!allFlag && !typeName) {
    console.error('Uso: node seed-entities.js --all')
    console.error('     node seed-entities.js --type <nombre>')
    console.error(`\nTipos disponibles: ${Object.keys(SEED_MAP).join(', ')}`)
    process.exit(1)
  }

  if (typeName && !SEED_MAP[typeName]) {
    console.error(`Error: Tipo desconocido "${typeName}"`)
    console.error(`Tipos disponibles: ${Object.keys(SEED_MAP).join(', ')}`)
    process.exit(1)
  }

  try {
    if (allFlag) {
      console.log('Sembrando todo el contenido SWADE en la campaña Arcadia...')
      for (const fn of Object.values(SEED_MAP)) {
        await fn()
      }
      console.log('\n✓ Siembra completada.')
    } else {
      await SEED_MAP[typeName]()
      console.log('\n✓ Completado.')
    }
  } catch (err) {
    console.error(`\nError durante la siembra: ${err.message}`)
    process.exit(1)
  }
}

main()
