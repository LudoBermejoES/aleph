#!/usr/bin/env node
/**
 * scripts/pf2-setup/seed-entities.js
 *
 * Seeds PF2e reference entities into a campaign from JSON data files.
 *
 * Usage:
 *   node seed-entities.js --campaign <id> --type all
 *   node seed-entities.js --campaign <id> --type spells
 *
 * Available types: spells, weapons, armors, shields, items, feats,
 *                  actions, classes, ancestries, traits
 *
 * WARNING: Running twice will create duplicate entities.
 */

import fs from 'fs'
import path from 'path'
import { alephFetch } from './lib/cli.js'
import {
  formatSpell,
  formatWeapon,
  formatArmor,
  formatShield,
  formatItem,
  formatFeat,
  formatAction,
  formatClass,
  formatAncestry,
} from './lib/format.js'

const PF2_ROOT = '/Users/ludo/code/pf2'
const DELAY_MS = 300

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function readJson(relPath) {
  const full = path.join(PF2_ROOT, relPath)
  if (!fs.existsSync(full)) {
    console.warn(`  ⚠ Archivo no encontrado: ${full}`)
    return null
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'))
}

// ---------------------------------------------------------------------------
// Template lookup cache
// ---------------------------------------------------------------------------
let _templateCache = null

async function getTemplates(campaignId) {
  if (!_templateCache) {
    _templateCache = (await alephFetch(`/api/campaigns/${campaignId}/templates`)) || []
  }
  return _templateCache
}

async function getTemplateId(campaignId, name) {
  const templates = await getTemplates(campaignId)
  return templates.find((t) => t.name === name)?.id || null
}

// ---------------------------------------------------------------------------
// Entity creation helper
// ---------------------------------------------------------------------------
async function createEntity(campaignId, body) {
  await alephFetch(`/api/campaigns/${campaignId}/entities`, 'POST', body)
  await sleep(DELAY_MS)
}

// ---------------------------------------------------------------------------
// 7.2 Spells
// ---------------------------------------------------------------------------
async function seedSpells(campaignId) {
  console.log('\n--- Sembrando conjuros ---')
  const raw = readJson('tools/spellCardCreator/data/spells.json')
  if (!raw) return 0
  const spells = raw.spells || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Conjuro PF2e')

  let count = 0
  for (const spell of spells) {
    if (count % 10 === 0) console.log(`  ... ${count}/${spells.length}`)
    await createEntity(campaignId, {
      name: spell.name,
      type: 'conjuro',
      content: formatSpell(spell),
      templateId,
      fields: {
        level: spell.level,
        is_cantrip: spell.isCantrip || false,
        traditions: (spell.traditions || []).join(', '),
        actions: spell.actions != null ? String(spell.actions) : '',
        range: spell.range || '',
        targets: spell.targets || '',
        area: spell.area || '',
        duration: spell.duration || '',
        saving_throw: spell.saving_throw || '',
        traits: (spell.traits || []).join(', '),
        description: spell.description || '',
        heightened:
          typeof spell.heightened === 'string'
            ? spell.heightened
            : JSON.stringify(spell.heightened || ''),
      },
    })
    count++
  }

  console.log(`✓ ${count} conjuros creados`)
  return count
}

// ---------------------------------------------------------------------------
// 7.3 Weapons
// ---------------------------------------------------------------------------
async function seedWeapons(campaignId) {
  console.log('\n--- Sembrando armas ---')
  const raw = readJson('tools/weaponsCardCreator/data/weapons.json')
  if (!raw) return 0
  const weapons = raw.weapons || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Arma PF2e')

  let count = 0
  for (const w of weapons) {
    await createEntity(campaignId, {
      name: w.name,
      type: 'arma',
      content: formatWeapon(w),
      templateId,
      fields: {
        price: w.price || '',
        damage: w.damage || '',
        hands: w.hands || '',
        bulk: w.bulk || '',
        group: w.group || '',
        category: w.category || '',
        traits: (w.traits || []).join(', '),
        is_ranged: w.isRanged || false,
        range: w.range || '',
        reload: w.reload || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} armas creadas`)
  return count
}

// ---------------------------------------------------------------------------
// 7.4 Armors
// ---------------------------------------------------------------------------
async function seedArmors(campaignId) {
  console.log('\n--- Sembrando armaduras ---')
  const raw = readJson('tools/armorCardCreator/data/armors.json')
  if (!raw) return 0
  const armors = raw.armors || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Armadura PF2e')

  let count = 0
  for (const a of armors) {
    await createEntity(campaignId, {
      name: a.name,
      type: 'armadura',
      content: formatArmor(a),
      templateId,
      fields: {
        price: a.price || '',
        ac_bonus: a.ac_bonus != null ? String(a.ac_bonus) : '',
        dex_cap: a.dex_cap != null ? String(a.dex_cap) : '',
        check_penalty: a.check_penalty != null ? String(a.check_penalty) : '',
        speed_penalty: a.speed_penalty != null ? String(a.speed_penalty) : '',
        strength_req: a.strength != null ? String(a.strength) : '',
        bulk: a.bulk || '',
        group: a.group || '',
        category: a.category || '',
        weight_class: a.weight_class || '',
        traits: (a.traits || []).join(', '),
      },
    })
    count++
  }

  console.log(`✓ ${count} armaduras creadas`)
  return count
}

// ---------------------------------------------------------------------------
// 7.5 Shields
// ---------------------------------------------------------------------------
async function seedShields(campaignId) {
  console.log('\n--- Sembrando escudos ---')
  const raw = readJson('tools/shieldCardCreator/data/shields.json')
  if (!raw) return 0
  const shields = raw.shields || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Escudo PF2e')

  let count = 0
  for (const s of shields) {
    await createEntity(campaignId, {
      name: s.name,
      type: 'escudo',
      content: formatShield(s),
      templateId,
      fields: {
        price: s.price || '',
        ac_bonus: s.ac_bonus != null ? String(s.ac_bonus) : '',
        hardness: s.hardness != null ? Number(s.hardness) : null,
        hp: s.hp != null ? Number(s.hp) : null,
        bt: s.bt != null ? Number(s.bt) : Math.floor((s.hp || 0) / 2),
        bulk: s.bulk || '',
        traits: (s.traits || []).join(', '),
      },
    })
    count++
  }

  console.log(`✓ ${count} escudos creados`)
  return count
}

// ---------------------------------------------------------------------------
// 7.6 Items
// ---------------------------------------------------------------------------
async function seedItems(campaignId) {
  console.log('\n--- Sembrando objetos ---')
  const raw = readJson('tools/itemCardCreator/data/items.json')
  if (!raw) return 0
  const items = raw.items || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Objeto PF2e')

  let count = 0
  for (const item of items) {
    await createEntity(campaignId, {
      name: item.name,
      type: 'objeto',
      content: formatItem(item),
      templateId,
      fields: {
        price: item.price || '',
        bulk: item.bulk || '',
        hands: item.hands || '',
        traits: (item.traits || []).join(', '),
        item_type: item.item_type || '',
        usage: item.usage || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} objetos creados`)
  return count
}

// ---------------------------------------------------------------------------
// 7.7 Feats
// ---------------------------------------------------------------------------
async function seedFeats(campaignId) {
  console.log('\n--- Sembrando dotes ---')
  const raw = readJson('tools/featCardCreator/data/feats.json')
  if (!raw) return 0
  const feats = raw.feats || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Dote PF2e')

  // Category mapping: English → Spanish
  const catMap = {
    general: 'General',
    class: 'Clase',
    ancestry: 'Ascendencia',
    skill: 'Habilidad',
    archetype: 'Arquetipo',
  }

  let count = 0
  for (const feat of feats) {
    if (count % 20 === 0) console.log(`  ... ${count}/${feats.length}`)
    await createEntity(campaignId, {
      name: feat.name,
      type: 'dote',
      content: formatFeat(feat),
      templateId,
      fields: {
        level: feat.level != null ? Number(feat.level) : 0,
        category: catMap[feat.category] || feat.category || '',
        class_or_ancestry: '',
        action_type: feat.action_type ? String(feat.action_type) : '',
        prerequisites: feat.prerequisites || '',
        traits: (feat.traits || []).join(', '),
        benefit: feat.description || '',
        special: feat.special || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} dotes creadas`)
  return count
}

// ---------------------------------------------------------------------------
// 7.8 Actions
// ---------------------------------------------------------------------------
async function seedActions(campaignId) {
  console.log('\n--- Sembrando acciones ---')
  const raw = readJson('tools/actionsCardCreator/data/actions.json')
  if (!raw) return 0
  const actions = raw.actions || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Accion PF2e')

  // Category mapping
  const catMap = {
    basica: 'Basica',
    especialidad: 'Especialidad',
    exploracion: 'Exploracion',
    'tiempo libre': 'Tiempo libre',
  }

  let count = 0
  for (const action of actions) {
    await createEntity(campaignId, {
      name: action.name,
      type: 'accion',
      content: formatAction(action),
      templateId,
      fields: {
        action_type: action.actionType ? String(action.actionType) : '',
        category: catMap[action.category?.toLowerCase()] || action.category || '',
        traits: (action.traits || []).join(', '),
        trigger: action.trigger || '',
        requirements: action.requirements || '',
        critical_success: action.results?.criticalSuccess || '',
        success: action.results?.success || '',
        failure: action.results?.failure || '',
        critical_failure: action.results?.criticalFailure || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} acciones creadas`)
  return count
}

// ---------------------------------------------------------------------------
// 7.9 Classes
// ---------------------------------------------------------------------------
const CLASS_SLUGS = [
  'alquimista',
  'barbaro',
  'bardo',
  'brujo',
  'campeon',
  'clerigo',
  'druida',
  'espadachin',
  'explorador',
  'guerrero',
  'hechicero',
  'investigador',
  'mago',
  'monje',
  'oraculo',
  'picaro',
  'psiquico',
  'summoner',
]

function parseYamlFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const fm = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon > -1) {
      const key = line.substring(0, colon).trim()
      const val = line
        .substring(colon + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
      fm[key] = val
    }
  }
  return fm
}

async function seedClasses(campaignId) {
  console.log('\n--- Sembrando clases ---')

  const templateId = await getTemplateId(campaignId, 'Clase PF2e')
  let count = 0

  for (const slug of CLASS_SLUGS) {
    const indexPath = path.join(PF2_ROOT, 'docs', '_clases', slug, 'index.md')
    if (!fs.existsSync(indexPath)) {
      console.log(`  ⚠ No encontrado: ${slug}`)
      continue
    }

    const raw = fs.readFileSync(indexPath, 'utf8')
    const fm = parseYamlFrontmatter(raw)
    const name = fm.class_name || fm.title || slug

    // Strip frontmatter for content
    const content = raw.replace(/^---[\s\S]*?---\n/, '').substring(0, 3000)

    const classData = {
      complexity: fm.complexity || '',
      hp_per_level: fm.hp_per_level || '',
      key_ability: fm.key_ability || fm.atributo_clave || '',
    }

    await createEntity(campaignId, {
      name,
      type: 'clase',
      content: formatClass(slug, classData) + '\n\n' + content,
      templateId,
      fields: {
        complexity: classData.complexity,
        hp_per_level: classData.hp_per_level ? Number(classData.hp_per_level) : null,
        key_ability: classData.key_ability,
        perception_prof: '',
        fortitude_prof: '',
        reflex_prof: '',
        will_prof: '',
        trained_skills: '',
        extra_skills: '',
        class_features_summary: '',
      },
    })
    console.log(`  ✓ ${name}`)
    count++
  }

  console.log(`✓ ${count} clases creadas`)
  return count
}

// ---------------------------------------------------------------------------
// 7.10 Ancestries
// ---------------------------------------------------------------------------
async function seedAncestries(campaignId) {
  console.log('\n--- Sembrando ascendencias ---')

  const ancestriesDir = path.join(PF2_ROOT, 'docs', '_ascendencias')
  if (!fs.existsSync(ancestriesDir)) {
    console.warn('  ⚠ Directorio de ascendencias no encontrado')
    return 0
  }

  const templateId = await getTemplateId(campaignId, 'Ascendencia PF2e')
  let count = 0

  const entries = fs
    .readdirSync(ancestriesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)

  for (const slug of entries) {
    const indexPath = path.join(ancestriesDir, slug, 'index.md')
    if (!fs.existsSync(indexPath)) continue

    const raw = fs.readFileSync(indexPath, 'utf8')
    const fm = parseYamlFrontmatter(raw)
    const name = fm.title || slug

    const content = raw.replace(/^---[\s\S]*?---\n/, '').substring(0, 3000)

    const ancestryData = {
      hp: fm.hp || '',
      size: fm.size || '',
      speed: fm.speed || '',
      attribute_boosts: fm.attribute_boosts || fm.mejoras_atributo || '',
      attribute_flaw: fm.attribute_flaw || fm.defecto_atributo || '',
      languages: fm.languages || fm.idiomas || '',
      traits: fm.traits || fm.rasgos || '',
    }

    await createEntity(campaignId, {
      name,
      type: 'ascendencia',
      content: formatAncestry(slug, ancestryData) + '\n\n' + content,
      templateId,
      fields: {
        hp: ancestryData.hp ? Number(ancestryData.hp) : null,
        size: ancestryData.size,
        speed: ancestryData.speed ? Number(ancestryData.speed) : null,
        attribute_boosts: ancestryData.attribute_boosts,
        attribute_flaw: ancestryData.attribute_flaw,
        languages: ancestryData.languages,
        traits: ancestryData.traits,
        special_abilities: '',
      },
    })
    console.log(`  ✓ ${name}`)
    count++
  }

  console.log(`✓ ${count} ascendencias creadas`)
  return count
}

// ---------------------------------------------------------------------------
// 7.11 Traits
// ---------------------------------------------------------------------------
async function seedTraits(campaignId) {
  console.log('\n--- Sembrando rasgos ---')
  const raw = readJson('tools/traitCardCreator/data/traits.json')
  if (!raw) return 0
  const traits = raw.traits || (Array.isArray(raw) ? raw : [])

  const templateId = await getTemplateId(campaignId, 'Rasgo PF2e')

  let count = 0
  for (const trait of traits) {
    await createEntity(campaignId, {
      name: trait.name,
      type: 'rasgo',
      content: trait.description || '',
      templateId,
      fields: {
        trait_type: trait.trait_type || '',
      },
    })
    count++
  }

  console.log(`✓ ${count} rasgos creados`)
  return count
}

// ---------------------------------------------------------------------------
// 7.12 Seed map and --all mode
// ---------------------------------------------------------------------------
const SEED_MAP = {
  spells: seedSpells,
  weapons: seedWeapons,
  armors: seedArmors,
  shields: seedShields,
  items: seedItems,
  feats: seedFeats,
  actions: seedActions,
  classes: seedClasses,
  ancestries: seedAncestries,
  traits: seedTraits,
}

async function main() {
  const args = process.argv.slice(2)

  const campaignIdx = args.indexOf('--campaign')
  const campaignId = campaignIdx !== -1 ? args[campaignIdx + 1] : null

  const typeIdx = args.indexOf('--type')
  const typeName = typeIdx !== -1 ? args[typeIdx + 1] : null

  if (!campaignId) {
    console.error('Error: debes especificar el ID de campaña.')
    console.error('  Uso: node seed-entities.js --campaign <id> --type <tipo>')
    console.error(`  Tipos disponibles: ${Object.keys(SEED_MAP).join(', ')}, all`)
    process.exit(1)
  }

  if (!typeName) {
    console.error('Error: debes especificar el tipo de contenido.')
    console.error(`  Tipos disponibles: ${Object.keys(SEED_MAP).join(', ')}, all`)
    process.exit(1)
  }

  if (typeName !== 'all' && !SEED_MAP[typeName]) {
    console.error(`Error: tipo desconocido "${typeName}"`)
    console.error(`  Tipos disponibles: ${Object.keys(SEED_MAP).join(', ')}, all`)
    process.exit(1)
  }

  console.log(`Sembrando contenido PF2e en campaña ${campaignId}...`)

  const totals = {}

  try {
    if (typeName === 'all') {
      for (const [type, fn] of Object.entries(SEED_MAP)) {
        totals[type] = await fn(campaignId)
      }
    } else {
      totals[typeName] = await SEED_MAP[typeName](campaignId)
    }

    console.log('\n✓ Siembra completada.')
    if (typeName === 'all') {
      console.log('\nResumen:')
      for (const [type, count] of Object.entries(totals)) {
        console.log(`  ${type}: ${count || 0} entidades`)
      }
    }
  } catch (err) {
    console.error(`\nError durante la siembra: ${err.message}`)
    process.exit(1)
  }
}

main()
