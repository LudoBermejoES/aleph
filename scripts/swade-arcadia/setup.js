#!/usr/bin/env node
/**
 * scripts/swade-arcadia/setup.js
 *
 * Creates all entity types and templates for the Arcadia SWADE campaign.
 * Safe to re-run: skips types/templates that already exist.
 *
 * Usage: node scripts/swade-arcadia/setup.js
 */

import { apiFetch } from './lib/api.js'
import {
  ENTITY_TYPES,
  ENTITY_TEMPLATES,
  PERSONAJE_SWADE_TEMPLATE,
  CRIATURA_SWADE_TEMPLATE,
} from './lib/templates.js'

const ARCADIA_CAMPAIGN_ID = '753b7958-d63b-4053-bcb5-1ac44b0f96e0'

// Slugify a display name the same way the server does (lowercase, spaces→hyphens, remove special chars)
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function createEntityTypes() {
  console.log('\n--- Creando tipos de entidad ---')

  // Fetch existing entity types
  const existing = await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/entity-types`)
  const existingSlugs = new Set((existing || []).map((et) => et.slug))

  let created = 0
  let skipped = 0

  for (const et of ENTITY_TYPES) {
    const expectedSlug = slugify(et.name)
    if (existingSlugs.has(et.slug) || existingSlugs.has(expectedSlug)) {
      console.log(`  ⟳ ${et.name} (${et.slug}) — ya existe, omitiendo`)
      skipped++
      continue
    }

    await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/entity-types`, 'POST', {
      name: et.name,
      icon: et.icon,
    })
    console.log(`  ✓ ${et.name}`)
    created++
  }

  console.log(`  → ${created} tipos creados, ${skipped} omitidos`)
  return created
}

async function createEntityTemplates() {
  console.log('\n--- Creando plantillas de entidad ---')

  // Fetch existing templates
  const existing = await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/templates`)
  const existingNames = new Set((existing || []).map((t) => t.name))

  let created = 0
  let skipped = 0

  for (const tpl of ENTITY_TEMPLATES) {
    if (existingNames.has(tpl.templateName)) {
      console.log(`  ⟳ ${tpl.templateName} — ya existe, omitiendo`)
      skipped++
      continue
    }

    // Map field type: our "type" → server "fieldType"
    const fields = tpl.fields.map((f) => ({
      key: f.key,
      label: f.label,
      fieldType:
        f.type === 'textarea'
          ? 'textarea'
          : f.type === 'number'
            ? 'number'
            : f.type === 'checkbox'
              ? 'checkbox'
              : f.type === 'select'
                ? 'select'
                : 'text',
      options: f.options ? f.options : undefined,
    }))

    await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/templates`, 'POST', {
      name: tpl.templateName,
      entityTypeSlug: tpl.entityTypeSlug,
      isDefault: false,
      fields,
    })
    console.log(`  ✓ ${tpl.templateName}`)
    created++
  }

  console.log(`  → ${created} plantillas de entidad creadas, ${skipped} omitidas`)
  return created
}

async function createCharacterTemplates() {
  console.log('\n--- Creando plantillas de personaje ---')

  const existing = await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/templates`)
  const existingNames = new Set((existing || []).map((t) => t.name))

  let created = 0
  let skipped = 0

  for (const tpl of [PERSONAJE_SWADE_TEMPLATE, CRIATURA_SWADE_TEMPLATE]) {
    if (existingNames.has(tpl.name)) {
      console.log(`  ⟳ ${tpl.name} — ya existe, omitiendo`)
      skipped++
      continue
    }

    // Flatten sections into fields; prefix label with section name for readability
    const fields = []
    for (const section of tpl.sections) {
      for (const f of section.fields) {
        fields.push({
          key: f.key,
          label: `[${section.name}] ${f.label}`,
          fieldType:
            f.type === 'textarea'
              ? 'textarea'
              : f.type === 'number'
                ? 'number'
                : f.type === 'checkbox'
                  ? 'checkbox'
                  : f.type === 'select'
                    ? 'select'
                    : 'text',
          options: f.options ? f.options : undefined,
        })
      }
    }

    await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/templates`, 'POST', {
      name: tpl.name,
      entityTypeSlug: 'character',
      isDefault: tpl.isDefault,
      fields,
    })
    console.log(`  ✓ ${tpl.name}`)
    created++
  }

  console.log(`  → ${created} plantillas de personaje creadas, ${skipped} omitidas`)
  return created
}

async function main() {
  console.log(`Configurando campaña Arcadia (${ARCADIA_CAMPAIGN_ID})...`)

  const typesCreated = await createEntityTypes()
  const entityTplCreated = await createEntityTemplates()
  const charTplCreated = await createCharacterTemplates()

  console.log(
    `\n✓ Configuración completada. ${typesCreated} tipos de entidad, ${entityTplCreated + charTplCreated} plantillas creadas.`,
  )
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`)
  process.exit(1)
})
