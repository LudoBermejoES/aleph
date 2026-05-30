#!/usr/bin/env node
/**
 * scripts/swade-arcadia/fix-superpoderes-spanish.js
 *
 * Updates superpoder entities that still have English content with
 * Spanish translations from superpowers-partidos-formatted/.
 *
 * Usage: node fix-superpoderes-spanish.js [--dry-run]
 */

import fs from 'fs'
import path from 'path'
import { apiFetch } from './lib/api.js'

const ARCADIA_CAMPAIGN_ID = '753b7958-d63b-4053-bcb5-1ac44b0f96e0'
const SPANISH_POWERS_DIR = '/Users/ludo/code/swade/superpowers-partidos-formatted'
const DELAY_MS = 300

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function slugifyName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Build index of available Spanish files
function buildSpanishIndex() {
  const files = fs.readdirSync(SPANISH_POWERS_DIR).filter((f) => f.endsWith('.md'))
  const index = new Map()
  for (const file of files) {
    const content = fs.readFileSync(path.join(SPANISH_POWERS_DIR, file), 'utf8')
    // Extract the Spanish name from the first heading
    const match = content.match(/^#\s+(.+?)(?:\s*\([^)]*\))?\s*$/m)
    if (match) {
      const spanishName = match[1].trim()
      index.set(normalize(spanishName), { file, content })
    }
    // Also index by filename (without .md)
    const fileKey = file.replace(/\.md$/, '').replace(/-/g, '')
    if (!index.has(fileKey)) {
      index.set(fileKey, { file, content })
    }
  }
  return index
}

async function getAllSuperpoderes() {
  const results = []
  let page = 1
  while (true) {
    const data = await apiFetch(
      `/api/campaigns/${ARCADIA_CAMPAIGN_ID}/entities?type=superpoder&limit=100&page=${page}`,
    )
    if (!data || !data.entities || data.entities.length === 0) break
    results.push(...data.entities)
    if (data.entities.length < 100) break
    page++
  }
  return results
}

async function getEntityContent(slug) {
  try {
    const entity = await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/entities/${slug}`)
    return entity
  } catch (err) {
    console.warn(`  ⚠ No se pudo obtener ${slug}: ${err.message}`)
    return null
  }
}

function looksEnglish(content) {
  if (!content || content.trim() === '') return true
  // Check for English markers
  const englishMarkers = [
    'Trappings:',
    'Modifiers:',
    'Modifier:',
    '**Trappings:**',
    '**Modifiers:**',
    'This power',
    'The character',
    'The hero',
    'The super',
    '## Modifiers',
  ]
  return englishMarkers.some((m) => content.includes(m))
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) console.log('DRY RUN — no se realizarán cambios')

  console.log('Construyendo índice de traducciones españolas...')
  const spanishIndex = buildSpanishIndex()
  console.log(`  ${spanishIndex.size} entradas indexadas`)

  console.log('\nObteniendo superpoderes de la campaña...')
  const superpoderes = await getAllSuperpoderes()
  console.log(`  ${superpoderes.length} superpoderes encontrados`)

  let updated = 0
  let skipped = 0
  let notFound = 0
  const missing = []

  for (const sp of superpoderes) {
    await sleep(100)
    const entity = await getEntityContent(sp.slug)
    if (!entity) continue

    const currentContent = entity.content || ''

    if (!looksEnglish(currentContent)) {
      skipped++
      continue
    }

    // Try to find Spanish translation
    const normalizedName = normalize(sp.name)
    const slugifiedName = slugifyName(sp.name).replace(/-/g, '')

    let match =
      spanishIndex.get(normalizedName) ||
      spanishIndex.get(slugifiedName) ||
      spanishIndex.get(normalize(sp.slug))

    // Explicit name alias overrides
    if (!match) {
      const nameKey = normalize(sp.name)
      if (nameKey === 'auradanina') match = spanishIndex.get('auradanina')
      else if (nameKey === 'cambiodeforma' || nameKey === 'cambioforma')
        match = spanishIndex.get('metamorfo') || spanishIndex.get('cambioforma')
      else if (nameKey.startsWith('inmunidad'))
        match = spanishIndex.get('enfermedad') || spanishIndex.get('veneno')
      else if (nameKey === 'noenvejece' || nameKey === 'sinenvejece' || nameKey === 'sinenvejecer')
        match = spanishIndex.get('noenvejece')
      else if (
        nameKey === 'mejoraoreduccion' ||
        nameKey === 'mejorareduccion' ||
        nameKey.includes('mejora')
      )
        match = spanishIndex.get('mejorareduccionderasgo')
      else if (
        nameKey === 'ataqueccc' ||
        nameKey === 'ataquecc' ||
        nameKey === 'ataquecuerpoacuerpo'
      )
        match = spanishIndex.get('ataquecc')
      else if (nameKey === 'controlarclimakorz' || nameKey.includes('controlarclima'))
        match = spanishIndex.get('controlarelclima')
      else if (nameKey === 'modificadoresglobalesdepoder') match = null
      else if (nameKey === 'lista') match = null
      else if (nameKey.startsWith('superpoderes')) match = null
    }

    if (!match) {
      notFound++
      missing.push(sp.name)
      console.log(`  ✗ Sin traducción: ${sp.name} (${sp.slug})`)
      continue
    }

    console.log(`  ${dryRun ? '[DRY]' : '↑'} ${sp.name} → ${match.file}`)

    if (!dryRun) {
      try {
        await apiFetch(`/api/campaigns/${ARCADIA_CAMPAIGN_ID}/entities/${sp.slug}`, 'PUT', {
          content: match.content,
        })
        updated++
        await sleep(DELAY_MS)
      } catch (err) {
        console.error(`  ✗ Error actualizando ${sp.name}: ${err.message}`)
        if (err.message.includes('429')) {
          console.log('  Rate limited, esperando 2s...')
          await sleep(2000)
        }
      }
    } else {
      updated++
    }
  }

  console.log(`\n✓ ${updated} superpoderes actualizados`)
  console.log(`  ${skipped} ya tenían contenido en español`)
  console.log(`  ${notFound} sin traducción disponible`)

  if (missing.length > 0) {
    console.log('\nSin traducción:')
    for (const name of missing) {
      console.log(`  - ${name}`)
    }
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
