// Content formatters for each SWADE entity type.
// Each formatter returns a markdown string used as the entity's --content.

export function formatVentaja(v) {
  const lines = []
  if (v.requisitos) lines.push(`**Requisitos:** ${v.requisitos}`)
  lines.push('')
  lines.push(v.descripción || v.descripcion || '')
  return lines.join('\n').trim()
}

export function formatDesventaja(d) {
  const lines = []
  if (d.tipo) lines.push(`**Tipo:** ${d.tipo}`)
  lines.push('')
  lines.push(d.descripción || d.descripcion || '')
  return lines.join('\n').trim()
}

export function formatRasgo(r) {
  const lines = []
  if (r.atributo) lines.push(`**Atributo:** ${r.atributo}`)
  lines.push('')
  lines.push(r.descripción || r.descripcion || '')
  return lines.join('\n').trim()
}

/**
 * formatSuperpoder(sp, mdContent)
 * sp  — entry from superpoderes.json (may be null if no JSON match)
 * mdContent — raw markdown from superpowers-es/*.md (may be null)
 */
export function formatSuperpoder(sp, mdContent) {
  if (!sp && mdContent) return mdContent.trim()

  const lines = []

  if (sp) {
    if (sp.coste != null) lines.push(`**Coste:** ${sp.coste} SPP`)
    if (sp.ornamentos) lines.push(`\n**Ornamentos:** ${sp.ornamentos}`)
    lines.push('')
  }

  if (mdContent) {
    lines.push(mdContent.trim())
  } else if (sp) {
    lines.push(sp.descripción || sp.descripcion || '')
  }

  if (sp && sp.modificadores && sp.modificadores.length > 0) {
    lines.push('\n## Modificadores\n')
    for (const mod of sp.modificadores) {
      const costeStr = mod.coste != null ? ` (${mod.coste > 0 ? '+' : ''}${mod.coste})` : ''
      lines.push(`- **${mod.nombre}**${costeStr}: ${mod.descripcion || ''}`)
    }
  }

  return lines.join('\n').trim()
}

export function formatArmadura(item, category) {
  const parts = []
  if (item.armor != null) parts.push(`**Protección:** ${item.armor}`)
  if (item.locations) parts.push(`**Localizaciones:** ${item.locations}`)
  if (item.weight != null) parts.push(`**Peso:** ${item.weight} kg`)
  if (item.cost != null) parts.push(`**Coste:** ${item.cost} mo`)
  if (item.min_strength) parts.push(`**Fuerza Min.:** ${item.min_strength}`)

  const lines = [parts.join(' | ')]
  if (category) lines.push(`\nCategoría: ${category}`)
  if (item.notes) lines.push(`\n${item.notes}`)
  return lines.join('\n').trim()
}

export function formatArma(item, category) {
  const parts = []
  if (item.damage) parts.push(`**Daño:** ${item.damage}`)
  if (item.min_strength) parts.push(`**Fuerza Min.:** ${item.min_strength}`)
  if (item.weight != null) parts.push(`**Peso:** ${item.weight} kg`)
  if (item.cost != null) parts.push(`**Coste:** ${item.cost} mo`)

  const lines = [parts.join(' | ')]
  if (category) lines.push(`\nCategoría: ${category}`)
  if (item.notes) lines.push(`\n${item.notes}`)
  return lines.join('\n').trim()
}

export function formatEquipo(item, category) {
  const parts = []
  if (item.weight != null) parts.push(`**Peso:** ${item.weight} kg`)
  else parts.push(`**Peso:** -`)
  if (item.cost != null) parts.push(`**Coste:** ${item.cost} mo`)

  const lines = [parts.join(' | ')]
  if (category) lines.push(`\nCategoría: ${category}`)
  if (item.notes) lines.push(`\n${item.notes}`)
  return lines.join('\n').trim()
}

export function formatEscudo(item, category) {
  const parts = []
  // Actual field names in escudos.json: parry, cover
  const parada = item.parry_bonus ?? item.parry ?? '-'
  const cobertura = item.coverage ?? item.cover ?? '-'
  parts.push(`**Bonus Parada:** ${parada}`)
  parts.push(`**Cobertura:** ${cobertura}`)
  if (item.weight != null) parts.push(`**Peso:** ${item.weight} kg`)
  if (item.cost != null) parts.push(`**Coste:** ${item.cost} mo`)
  if (item.min_strength) parts.push(`**Fuerza Min.:** ${item.min_strength}`)

  const lines = [parts.join(' | ')]
  if (category) lines.push(`\nCategoría: ${category}`)
  if (item.notes) lines.push(`\n${item.notes}`)
  return lines.join('\n').trim()
}

export function formatVehiculo(item, category) {
  const parts = []
  if (item.size != null) parts.push(`**Tamaño:** ${item.size}`)
  // Actual field in vehiculos.json: maneuver
  const manejo = item.manejo ?? item.maneuver ?? '-'
  parts.push(`**Manejo:** ${manejo}`)
  // Actual field: vm (velocidad maxima)
  const vel = item.velocidad_max ?? item.topspeed ?? item.vm ?? '-'
  parts.push(`**Vel. Máx.:** ${vel}`)
  if (item.toughness) parts.push(`**Dureza:** ${item.toughness}`)
  if (item.crew) parts.push(`**Tripulación:** ${item.crew}`)
  if (item.cost != null) parts.push(`**Coste:** ${item.cost} mo`)

  const lines = [parts.join(' | ')]
  if (category) lines.push(`\nCategoría: ${category}`)
  if (item.notes) lines.push(`\n${item.notes}`)
  if (item.weapons) lines.push(`\n**Armamento:** ${item.weapons}`)
  return lines.join('\n').trim()
}

export function formatBase(base, data) {
  const lines = []
  lines.push(`**Coste base por nivel:** ${data.base_cost_per_level ?? '-'} SPP`)
  lines.push(`**Dureza base:** ${data.base_toughness ?? '-'}`)

  if (data.base_mods != null) {
    lines.push(`**Modificaciones de base incluidas:** ${data.base_mods}`)
  }

  if (data.modifications && data.modifications.length > 0) {
    lines.push('\n## Modificaciones Disponibles\n')
    for (const mod of data.modifications) {
      const costStr = mod.cost != null ? ` — Coste: ${mod.cost} SPP` : ''
      lines.push(`- **${mod.name}**${costStr}${mod.notes ? ': ' + mod.notes : ''}`)
    }
  }

  return lines.join('\n').trim()
}
