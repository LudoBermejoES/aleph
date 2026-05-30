#!/usr/bin/env node
/**
 * scripts/pf2-setup/setup.js
 *
 * Creates a PF2e campaign with all entity types, templates, and currencies.
 * Idempotent: if a campaign with the given name already exists, exits cleanly.
 *
 * Usage: node scripts/pf2-setup/setup.js --name "Mi Campaña PF2e"
 */

import { alephFetch } from './lib/cli.js'
import { ENTITY_TYPE_TEMPLATES, CHARACTER_TEMPLATES } from './lib/templates.js'
import { PF2_CURRENCIES } from './lib/currencies.js'

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2)
  const nameIdx = args.indexOf('--name')
  if (nameIdx === -1 || !args[nameIdx + 1]) {
    console.error('Error: debes especificar el nombre de la campaña.')
    console.error('  Uso: node setup.js --name "Nombre de la Campaña"')
    process.exit(1)
  }
  return { name: args[nameIdx + 1] }
}

const DELAY_MS = 200

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Entity type display names and icons
// ---------------------------------------------------------------------------
const ENTITY_TYPES = [
  { slug: 'pf2-conjuro', name: 'Conjuro', icon: '✨' },
  { slug: 'pf2-clase', name: 'Clase', icon: '⚔️' },
  { slug: 'pf2-ascendencia', name: 'Ascendencia', icon: '🧬' },
  { slug: 'pf2-herencia', name: 'Herencia', icon: '🌿' },
  { slug: 'pf2-trasfondo', name: 'Trasfondo', icon: '📖' },
  { slug: 'pf2-dote', name: 'Dote', icon: '⭐' },
  { slug: 'pf2-accion', name: 'Accion', icon: '◆' },
  { slug: 'pf2-arma', name: 'Arma', icon: '🗡️' },
  { slug: 'pf2-armadura', name: 'Armadura', icon: '🛡️' },
  { slug: 'pf2-escudo', name: 'Escudo', icon: '🔰' },
  { slug: 'pf2-objeto', name: 'Objeto', icon: '🎒' },
  { slug: 'pf2-rasgo', name: 'Rasgo', icon: '🏷️' },
  { slug: 'pf2-condicion', name: 'Condicion', icon: '⚠️' },
  { slug: 'pf2-arquetipo', name: 'Arquetipo', icon: '🎭' },
]

// Template display name mapping
const TEMPLATE_NAMES = {
  'pf2-conjuro': 'Conjuro PF2e',
  'pf2-clase': 'Clase PF2e',
  'pf2-ascendencia': 'Ascendencia PF2e',
  'pf2-herencia': 'Herencia PF2e',
  'pf2-trasfondo': 'Trasfondo PF2e',
  'pf2-dote': 'Dote PF2e',
  'pf2-accion': 'Accion PF2e',
  'pf2-arma': 'Arma PF2e',
  'pf2-armadura': 'Armadura PF2e',
  'pf2-escudo': 'Escudo PF2e',
  'pf2-objeto': 'Objeto PF2e',
  'pf2-rasgo': 'Rasgo PF2e',
  'pf2-condicion': 'Condicion PF2e',
  'pf2-arquetipo': 'Arquetipo PF2e',
}

// ---------------------------------------------------------------------------
// 2.2 Find existing campaign by name
// ---------------------------------------------------------------------------
async function findCampaign(name) {
  const campaigns = await alephFetch('/api/campaigns')
  if (!campaigns) return null
  return (campaigns || []).find((c) => c.name === name) || null
}

// ---------------------------------------------------------------------------
// 2.3 Create campaign
// ---------------------------------------------------------------------------
async function createCampaign(name) {
  const result = await alephFetch('/api/campaigns', 'POST', { name, theme: 'high-fantasy' })
  return result
}

// ---------------------------------------------------------------------------
// 2.4 Create entity types (idempotent by slug)
// ---------------------------------------------------------------------------
async function createEntityTypes(campaignId) {
  console.log('\n--- Creando tipos de entidad ---')
  const existing = await alephFetch(`/api/campaigns/${campaignId}/entity-types`)
  const existingSlugs = new Set((existing || []).map((et) => et.slug))

  let created = 0
  let skipped = 0

  for (const et of ENTITY_TYPES) {
    if (existingSlugs.has(et.slug)) {
      console.log(`  ⟳ ${et.name} — ya existe, omitiendo`)
      skipped++
      continue
    }
    await alephFetch(`/api/campaigns/${campaignId}/entity-types`, 'POST', {
      name: et.name,
      icon: et.icon,
    })
    console.log(`  ✓ ${et.name}`)
    created++
    await sleep(DELAY_MS)
  }

  console.log(`  → ${created} tipos creados, ${skipped} omitidos`)
}

// ---------------------------------------------------------------------------
// 2.5 Create entity templates (idempotent by name)
// ---------------------------------------------------------------------------
async function createEntityTemplates(campaignId) {
  console.log('\n--- Creando plantillas de entidad ---')
  const existing = await alephFetch(`/api/campaigns/${campaignId}/templates`)
  const existingNames = new Set((existing || []).map((t) => t.name))

  // Fetch entity types to get real slugs from server
  const entityTypes = await alephFetch(`/api/campaigns/${campaignId}/entity-types`)
  const slugMap = new Map((entityTypes || []).map((et) => [et.name.toLowerCase(), et.slug]))

  let created = 0
  let skipped = 0

  for (const [intentSlug, fields] of Object.entries(ENTITY_TYPE_TEMPLATES)) {
    const templateName = TEMPLATE_NAMES[intentSlug]
    if (!templateName) continue

    if (existingNames.has(templateName)) {
      console.log(`  ⟳ ${templateName} — ya existe, omitiendo`)
      skipped++
      continue
    }

    // Resolve real slug from server (server slugifies display names)
    const et = ENTITY_TYPES.find((e) => e.slug === intentSlug)
    const displayName = et?.name?.toLowerCase()
    const realSlug = slugMap.get(displayName) || intentSlug

    await alephFetch(`/api/campaigns/${campaignId}/templates`, 'POST', {
      name: templateName,
      entityTypeSlug: realSlug,
      isDefault: true,
      fields,
    })
    console.log(`  ✓ ${templateName}`)
    created++
    await sleep(DELAY_MS)
  }

  console.log(`  → ${created} plantillas creadas, ${skipped} omitidas`)
}

// ---------------------------------------------------------------------------
// 2.6–2.7 Create character templates
// ---------------------------------------------------------------------------
async function createCharacterTemplates(campaignId) {
  console.log('\n--- Creando plantillas de personaje ---')
  const existing = await alephFetch(`/api/campaigns/${campaignId}/templates`)
  const existingNames = new Set((existing || []).map((t) => t.name))

  let created = 0
  let skipped = 0

  for (const tpl of CHARACTER_TEMPLATES) {
    if (existingNames.has(tpl.name)) {
      console.log(`  ⟳ ${tpl.name} — ya existe, omitiendo`)
      skipped++
      continue
    }

    const result = await alephFetch(`/api/campaigns/${campaignId}/templates`, 'POST', {
      name: tpl.name,
      entityTypeSlug: tpl.entityTypeSlug,
      isDefault: tpl.isDefault,
      fields: tpl.fields,
    })
    console.log(`  ✓ ${tpl.name} (id: ${result?.id || '?'})`)
    created++
    await sleep(DELAY_MS)
  }

  console.log(`  → ${created} plantillas creadas, ${skipped} omitidas`)
}

// ---------------------------------------------------------------------------
// 2.8 Create currencies
// ---------------------------------------------------------------------------
async function createCurrencies(campaignId) {
  console.log('\n--- Creando monedas PF2e ---')

  // Check if currencies endpoint exists
  let existing = []
  try {
    existing = (await alephFetch(`/api/campaigns/${campaignId}/currencies`)) || []
  } catch {
    existing = []
  }
  const existingNames = new Set((existing || []).map((c) => c.name))

  let created = 0
  let skipped = 0

  for (const currency of PF2_CURRENCIES) {
    if (existingNames.has(currency.name)) {
      console.log(`  ⟳ ${currency.name} (${currency.symbol}) — ya existe, omitiendo`)
      skipped++
      continue
    }

    try {
      await alephFetch(`/api/campaigns/${campaignId}/currencies`, 'POST', currency)
      console.log(`  ✓ ${currency.name} (${currency.symbol})`)
      created++
      await sleep(DELAY_MS)
    } catch (err) {
      console.warn(`  ⚠ No se pudo crear ${currency.name}: ${err.message}`)
    }
  }

  console.log(`  → ${created} monedas creadas, ${skipped} omitidas`)
  return created
}

// ---------------------------------------------------------------------------
// 2.9 Main
// ---------------------------------------------------------------------------
async function main() {
  const { name } = parseArgs()

  console.log(`\nConfigurando campaña PF2e: "${name}"...`)

  // 2.2 Check if campaign already exists
  const existing = await findCampaign(name)
  if (existing) {
    console.log(`\nLa campaña ya existe: ${existing.id}`)
    console.log('Nada que hacer. Usa seed-entities.js para poblar el contenido:')
    console.log(`  node scripts/pf2-setup/seed-entities.js --campaign ${existing.id} --type all`)
    process.exit(0)
  }

  // 2.3 Create campaign
  const campaign = await createCampaign(name)
  const campaignId = campaign.id
  console.log(`\nCampaña creada: ${campaignId}`)

  // 2.4 Entity types
  await createEntityTypes(campaignId)

  // 2.5 Entity templates
  await createEntityTemplates(campaignId)

  // 2.6–2.7 Character templates
  await createCharacterTemplates(campaignId)

  // 2.8 Currencies
  const currenciesCreated = await createCurrencies(campaignId)

  // 2.9 Summary
  console.log('\n' + '='.repeat(50))
  console.log('✓ Configuración completada')
  console.log(`  ID de campaña:        ${campaignId}`)
  console.log(`  Tipos de entidad:     ${ENTITY_TYPES.length}`)
  console.log(`  Plantillas de entidad: ${Object.keys(ENTITY_TYPE_TEMPLATES).length}`)
  console.log(`  Plantillas de personaje: ${CHARACTER_TEMPLATES.length}`)
  console.log(`  Monedas:              ${currenciesCreated}`)
  console.log('\nPara poblar el contenido PF2e, ejecuta:')
  console.log(`  node scripts/pf2-setup/seed-entities.js --campaign ${campaignId} --type all`)
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`)
  process.exit(1)
})
