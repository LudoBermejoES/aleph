/**
 * scripts/pf2-setup/lib/format.js
 *
 * Formatters that build markdown content from PF2e JSON data.
 */

// Action type number → symbol
function actionSymbol(actionType) {
  const n = String(actionType)
  if (n === '1') return '◆'
  if (n === '2') return '◆◆'
  if (n === '3') return '◆◆◆'
  if (n === 'R' || n === 'reaction') return '↺'
  if (n === 'F' || n === 'free') return '◇'
  return n
}

function traitsLine(traits) {
  if (!traits || traits.length === 0) return ''
  return traits.join(', ')
}

// ---------------------------------------------------------------------------
// 6.1 formatSpell
// ---------------------------------------------------------------------------
export function formatSpell(spell) {
  const parts = []

  // Header line
  const headerParts = []
  if (spell.level !== undefined) headerParts.push(`**Nivel:** ${spell.level}`)
  if (spell.actions !== undefined) headerParts.push(`**Acciones:** ${actionSymbol(spell.actions)}`)
  if (spell.traditions?.length)
    headerParts.push(
      `**Tradiciones:** ${spell.traditions.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}`,
    )
  if (headerParts.length) parts.push(headerParts.join(' | '))

  // Stats line
  const statsLine = []
  if (spell.range) statsLine.push(`**Alcance:** ${spell.range}`)
  if (spell.targets) statsLine.push(`**Objetivos:** ${spell.targets}`)
  if (spell.area) statsLine.push(`**Area:** ${spell.area}`)
  if (spell.duration) statsLine.push(`**Duracion:** ${spell.duration}`)
  if (spell.saving_throw || spell.savingThrow)
    statsLine.push(`**Salvacion:** ${spell.saving_throw || spell.savingThrow}`)
  if (statsLine.length) parts.push(statsLine.join(' | '))

  if (spell.traits?.length) parts.push(`**Rasgos:** ${traitsLine(spell.traits)}`)

  parts.push('\n---\n')

  if (spell.description) parts.push(spell.description)

  if (spell.heightened) {
    if (typeof spell.heightened === 'string') {
      parts.push(`\n**Potenciado:** ${spell.heightened}`)
    } else if (Array.isArray(spell.heightened)) {
      for (const h of spell.heightened) {
        parts.push(`\n**Potenciado ${h.level || h.plus || ''}:** ${h.description || h.text || ''}`)
      }
    } else if (typeof spell.heightened === 'object') {
      for (const [key, val] of Object.entries(spell.heightened)) {
        parts.push(`\n**Potenciado ${key}:** ${val}`)
      }
    }
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.2 formatWeapon
// ---------------------------------------------------------------------------
export function formatWeapon(weapon) {
  const parts = []

  const stats = []
  if (weapon.damage) stats.push(`**Dano:** ${weapon.damage}`)
  if (weapon.hands) stats.push(`**Manos:** ${weapon.hands}`)
  if (weapon.bulk) stats.push(`**Bulto:** ${weapon.bulk}`)
  if (weapon.category) stats.push(`**Categoria:** ${weapon.category}`)
  if (weapon.group) stats.push(`**Grupo:** ${weapon.group}`)
  if (weapon.price) stats.push(`**Precio:** ${weapon.price}`)
  if (stats.length) parts.push(stats.join(' | '))

  if (weapon.isRanged) {
    const rangedParts = []
    if (weapon.range) rangedParts.push(`**Alcance:** ${weapon.range}`)
    if (weapon.reload) rangedParts.push(`**Recarga:** ${weapon.reload}`)
    if (rangedParts.length) parts.push(rangedParts.join(' | '))
  }

  if (weapon.traits?.length) parts.push(`**Rasgos:** ${traitsLine(weapon.traits)}`)

  if (weapon.description) {
    parts.push('\n---\n')
    parts.push(weapon.description)
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.3 formatArmor
// ---------------------------------------------------------------------------
export function formatArmor(armor) {
  const parts = []

  const stats = []
  if (armor.ac_bonus !== undefined) stats.push(`**Bono de CA:** ${armor.ac_bonus}`)
  if (armor.dex_cap !== undefined) stats.push(`**Limite DES:** ${armor.dex_cap}`)
  if (armor.check_penalty !== undefined) stats.push(`**Pen. Pruebas:** ${armor.check_penalty}`)
  if (armor.speed_penalty !== undefined) stats.push(`**Pen. Velocidad:** ${armor.speed_penalty}`)
  if (armor.strength !== undefined) stats.push(`**Req. Fuerza:** ${armor.strength}`)
  if (armor.bulk) stats.push(`**Bulto:** ${armor.bulk}`)
  if (armor.category) stats.push(`**Categoria:** ${armor.category}`)
  if (armor.group) stats.push(`**Grupo:** ${armor.group}`)
  if (armor.price) stats.push(`**Precio:** ${armor.price}`)
  if (stats.length) parts.push(stats.join(' | '))

  if (armor.traits?.length) parts.push(`**Rasgos:** ${traitsLine(armor.traits)}`)

  if (armor.description) {
    parts.push('\n---\n')
    parts.push(armor.description)
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.4 formatShield
// ---------------------------------------------------------------------------
export function formatShield(shield) {
  const parts = []

  const stats = []
  if (shield.ac_bonus !== undefined) stats.push(`**Bono de CA:** ${shield.ac_bonus}`)
  if (shield.hardness !== undefined) stats.push(`**Dureza:** ${shield.hardness}`)
  if (shield.hp !== undefined) stats.push(`**PG:** ${shield.hp}`)
  const bt = shield.bt ?? (shield.hp !== undefined ? Math.floor(shield.hp / 2) : undefined)
  if (bt !== undefined) stats.push(`**Umbral de Rotura:** ${bt}`)
  if (shield.bulk) stats.push(`**Bulto:** ${shield.bulk}`)
  if (shield.price) stats.push(`**Precio:** ${shield.price}`)
  if (stats.length) parts.push(stats.join(' | '))

  if (shield.traits?.length) parts.push(`**Rasgos:** ${traitsLine(shield.traits)}`)

  if (shield.description) {
    parts.push('\n---\n')
    parts.push(shield.description)
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.5 formatItem
// ---------------------------------------------------------------------------
export function formatItem(item) {
  const parts = []

  const stats = []
  if (item.price) stats.push(`**Precio:** ${item.price}`)
  if (item.bulk) stats.push(`**Bulto:** ${item.bulk}`)
  if (item.hands) stats.push(`**Manos:** ${item.hands}`)
  if (stats.length) parts.push(stats.join(' | '))

  if (item.description) {
    parts.push('\n---\n')
    parts.push(item.description)
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.6 formatFeat
// ---------------------------------------------------------------------------
export function formatFeat(feat) {
  const parts = []

  const header = []
  if (feat.level !== undefined) header.push(`**Nivel:** ${feat.level}`)
  if (feat.category) header.push(`**Categoria:** ${feat.category}`)
  if (feat.action_type) header.push(`**Accion:** ${actionSymbol(feat.action_type)}`)
  if (header.length) parts.push(header.join(' | '))

  if (feat.traits?.length) parts.push(`**Rasgos:** ${traitsLine(feat.traits)}`)
  if (feat.prerequisites) parts.push(`**Prerequisitos:** ${feat.prerequisites}`)

  parts.push('\n---\n')

  if (feat.description) parts.push(feat.description)
  if (feat.benefit) parts.push(feat.benefit)
  if (feat.special) parts.push(`\n**Especial:** ${feat.special}`)

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.7 formatAction
// ---------------------------------------------------------------------------
export function formatAction(action) {
  const parts = []

  const symbol = action.actionType ? actionSymbol(action.actionType) : ''
  const header = []
  if (symbol) header.push(`**Tipo:** ${symbol}`)
  if (action.category) header.push(`**Categoria:** ${action.category}`)
  if (header.length) parts.push(header.join(' | '))

  if (action.traits?.length) parts.push(`**Rasgos:** ${traitsLine(action.traits)}`)
  if (action.trigger) parts.push(`**Desencadenante:** ${action.trigger}`)
  if (action.requirements) parts.push(`**Requisitos:** ${action.requirements}`)

  parts.push('\n---\n')

  if (action.description) parts.push(action.description)

  if (action.results) {
    const r = action.results
    if (r.critical_success) parts.push(`\n**Exito Critico:** ${r.critical_success}`)
    if (r.success) parts.push(`\n**Exito:** ${r.success}`)
    if (r.failure) parts.push(`\n**Fallo:** ${r.failure}`)
    if (r.critical_failure) parts.push(`\n**Fallo Critico:** ${r.critical_failure}`)
  }

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.8 formatClass
// ---------------------------------------------------------------------------
export function formatClass(slug, classData) {
  const parts = []

  const stats = []
  if (classData.complexity) stats.push(`**Complejidad:** ${classData.complexity}`)
  if (classData.hp_per_level) stats.push(`**PG por Nivel:** ${classData.hp_per_level}`)
  if (classData.key_ability) stats.push(`**Atributo Clave:** ${classData.key_ability}`)
  if (stats.length) parts.push(stats.join(' | '))

  const profRows = [
    ['Percepcion', classData.perception_prof],
    ['Fortaleza', classData.fortitude_prof],
    ['Reflejos', classData.reflex_prof],
    ['Voluntad', classData.will_prof],
  ].filter(([, v]) => v)

  if (profRows.length) {
    parts.push('\n| Estadistica | Competencia |')
    parts.push('|-------------|-------------|')
    for (const [stat, prof] of profRows) {
      parts.push(`| ${stat} | ${prof} |`)
    }
  }

  if (classData.trained_skills)
    parts.push(`\n**Habilidades con Entrenamiento:** ${classData.trained_skills}`)
  if (classData.extra_skills) parts.push(`**Habilidades Adicionales:** ${classData.extra_skills}`)

  parts.push('\n## Caracteristicas de Clase\n')
  if (classData.class_features_summary) parts.push(classData.class_features_summary)

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 6.9 formatAncestry
// ---------------------------------------------------------------------------
export function formatAncestry(slug, ancestryData) {
  const parts = []

  const stats = []
  if (ancestryData.hp !== undefined) stats.push(`**PG:** ${ancestryData.hp}`)
  if (ancestryData.size) stats.push(`**Tamanio:** ${ancestryData.size}`)
  if (ancestryData.speed !== undefined) stats.push(`**Velocidad:** ${ancestryData.speed} pies`)
  if (stats.length) parts.push(stats.join(' | '))

  if (ancestryData.attribute_boosts)
    parts.push(`**Mejoras de Atributo:** ${ancestryData.attribute_boosts}`)
  if (ancestryData.attribute_flaw)
    parts.push(`**Defecto de Atributo:** ${ancestryData.attribute_flaw}`)
  if (ancestryData.languages) parts.push(`**Idiomas:** ${ancestryData.languages}`)
  if (ancestryData.traits) parts.push(`**Rasgos:** ${ancestryData.traits}`)

  if (ancestryData.special_abilities) {
    parts.push('\n---\n')
    parts.push(ancestryData.special_abilities)
  }

  return parts.join('\n')
}
