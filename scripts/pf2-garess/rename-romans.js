#!/usr/bin/env node
/**
 * scripts/pf2-garess/rename-romans.js
 *
 * Renames all Garess and Golka characters whose name has a roman-numeral
 * suffix (II/III/IV) by replacing the given name with an authentic dwarf name.
 *
 * Uses a large pool of authentic dwarf names from D&D/Pathfinder sources.
 *
 * Usage: node scripts/pf2-garess/rename-romans.js [--dry-run]
 */

import { alephFetch } from '../pf2-setup/lib/cli.js'

const CAMPAIGN_ID = '1f84e2fa-32ed-40a7-be5a-b645bda0d6af'
const DELAY_MS = 250
const DRY_RUN = process.argv.includes('--dry-run')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// Large pool of authentic dwarf names — sourced from PF2e, D&D, Tolkien,
// fantasynamegenerators-style. Many are unusual to maximize uniqueness.
const MALE_POOL = [
  // PF2e core
  'Bodill',
  'Edrukk',
  'Grunyar',
  'Kotri',
  'Morgrym',
  'Rogar',
  'Yangrit',
  // D&D 5e PHB
  'Adrik',
  'Alberich',
  'Baern',
  'Barendd',
  'Brottor',
  'Bruenor',
  'Dain',
  'Daral',
  'Darrak',
  'Delg',
  'Eberk',
  'Einkil',
  'Fargrim',
  'Flint',
  'Gardain',
  'Harbek',
  'Kildrak',
  'Morgran',
  'Orsik',
  'Oskar',
  'Rangrim',
  'Rurik',
  'Taklinn',
  'Thoradin',
  'Thorin',
  'Tordek',
  'Traubon',
  'Travok',
  'Ulfgar',
  'Veit',
  'Vondal',
  // Tolkien dwarves
  'Balin',
  'Dwalin',
  'Bifur',
  'Bofur',
  'Bombur',
  'Dori',
  'Nori',
  'Ori',
  'Oin',
  'Gloin',
  'Fili',
  'Kili',
  'Thror',
  'Thrain',
  'Durin',
  'Fror',
  'Gror',
  'Frerin',
  'Farin',
  'Fundin',
  'Borin',
  'Nain',
  'Nar',
  'Vidur',
  // Pathfinder lore (Five Kings Mountains)
  'Atilios',
  'Borogrim',
  'Brikkos',
  'Dalvik',
  'Dorin',
  'Drazmorg',
  'Durhakkar',
  'Erilios',
  'Frorgrim',
  'Galkos',
  'Gristar',
  'Halgrim',
  'Hjalmar',
  'Jarvik',
  'Karzoug',
  'Korin',
  'Kragnar',
  'Krimm',
  'Largrim',
  'Lokmorr',
  'Magrim',
  'Mardrim',
  'Naverin',
  'Norgrim',
  'Olfdan',
  'Orik',
  'Pjotr',
  'Quor',
  'Reigfar',
  'Rorin',
  'Sgarl',
  'Skiarn',
  'Skorn',
  'Stigvar',
  'Sturm',
  'Tarvos',
  'Telgrim',
  'Thorgrim',
  'Throndur',
  'Tolgrim',
  'Torrald',
  'Vargrim',
  'Vegnar',
  'Vidar',
  'Volgrim',
  'Vormar',
  'Yarvik',
  'Zoldur',
  // Compound / heroic
  'Akmenos',
  'Belrik',
  'Bramli',
  'Cherim',
  'Dargol',
  'Doldoth',
  'Eldgar',
  'Falgrim',
  'Garn',
  'Glothrim',
  'Helmgar',
  'Holdrun',
  'Ingvar',
  'Jundak',
  'Kelmar',
  'Khadgrim',
  'Kragar',
  'Lurik',
  'Mordak',
  'Nordrim',
  'Olbrekk',
  'Olgrim',
  'Phaegron',
  'Quorin',
  'Ralthar',
  'Skadrak',
  'Snorri',
  'Sturmgar',
  'Thalgrim',
  'Tordrum',
  'Ulrik',
  'Vagor',
  'Vermund',
  'Volgar',
  'Wulfgar',
  'Yorin',
  'Zaldrim',
  // Additional fantasy dwarf-style
  'Argon',
  'Bardrik',
  'Brokk',
  'Caldur',
  'Dornar',
  'Dragmar',
  'Eldur',
  'Fendrik',
  'Galor',
  'Gortek',
  'Hagar',
  'Hjalmgrim',
  'Igrum',
  'Jorgar',
  'Kazgrim',
  'Kromgar',
  'Lothmar',
  'Marrok',
  'Nogrim',
  'Olbrim',
  'Ondurin',
  'Padrak',
  'Quorgrim',
  'Rorthak',
  'Skarn',
  'Skuldur',
  'Thraek',
  'Tordur',
  'Ulgrim',
  'Vargrul',
  'Voldrak',
  'Wargrim',
  'Yandrik',
  'Zigrim',
  'Berthak',
  'Drogon',
  'Fjalrik',
  'Halmar',
  'Jurgrim',
  'Krogrim',
  'Naldur',
  'Othgar',
  'Skoldar',
  'Thordak',
  'Vargum',
  'Whurthak',
  'Aldrun',
  'Brunhal',
  'Cudgar',
  'Drengar',
  'Eldhar',
  'Frostbeard',
  'Gimrak',
  'Holvar',
  'Iordrik',
  'Jendril',
  'Kovrik',
  'Magnar',
  'Nethrun',
  'Ordvik',
  'Petrek',
  'Rurnir',
  'Snorgrim',
  'Tovrik',
  'Urvar',
  'Vodrim',
  'Yargrim',
]

const FEMALE_POOL = [
  // PF2e core
  'Agna',
  'Indra',
  'Torra',
  // D&D 5e PHB
  'Amber',
  'Artin',
  'Audhild',
  'Bardryn',
  'Dagnal',
  'Diesa',
  'Eldeth',
  'Falkrunn',
  'Gunnloda',
  'Helja',
  'Hlin',
  'Ilde',
  'Jarana',
  'Kathra',
  'Kristryd',
  'Liftrasa',
  'Mardred',
  'Riswynn',
  'Sannl',
  'Torgga',
  'Vistra',
  // Tolkien
  'Dis',
  'Hilda',
  'Mizra',
  // Pathfinder
  'Astri',
  'Brandi',
  'Brunhilda',
  'Drueta',
  'Eira',
  'Fargrim',
  'Fenni',
  'Gloria',
  'Greta',
  'Halja',
  'Halska',
  'Hella',
  'Idria',
  'Inga',
  'Jenva',
  'Jorgrid',
  'Kara',
  'Karaska',
  'Kelda',
  'Kjellindra',
  'Krieg',
  'Lhya',
  'Lila',
  'Magga',
  'Marda',
  'Mira',
  'Morga',
  'Nara',
  'Nidrun',
  'Norra',
  'Odlinde',
  'Olga',
  'Orla',
  'Petria',
  'Raknild',
  'Rhulda',
  'Rinda',
  'Runa',
  'Sif',
  'Sigrun',
  'Skadi',
  'Skara',
  'Solveig',
  'Svala',
  'Sylgja',
  'Thora',
  'Tirkara',
  'Toria',
  'Ula',
  'Ulrika',
  'Urla',
  'Vasla',
  'Vigna',
  'Wynn',
  'Yrsa',
  // Compound / heroic
  'Anvarra',
  'Bryndis',
  'Cerridwen',
  'Dagmara',
  'Edhilda',
  'Faldrunn',
  'Gerda',
  'Halgrim',
  'Idrun',
  'Jorulf',
  'Kaldra',
  'Lysdra',
  'Margrid',
  'Nardrun',
  'Olda',
  'Pyrdis',
  'Quenara',
  'Roskva',
  'Sjofn',
  'Thrudvang',
  'Ulvhilda',
  'Valdrun',
  'Wisla',
  'Yrith',
  'Zhinda',
  // Additional fantasy dwarf-style female
  'Alva',
  'Bera',
  'Brenna',
  'Cyra',
  'Dalvi',
  'Eira',
  'Erika',
  'Faldra',
  'Fjorgyn',
  'Galindra',
  'Hadra',
  'Helmgrid',
  'Idril',
  'Joldhilda',
  'Karuna',
  'Loris',
  'Margritt',
  'Nendra',
  'Ordrun',
  'Pyrra',
  'Roldra',
  'Selvi',
  'Tordhilda',
  'Ulfa',
  'Vidrun',
  'Wildrun',
  'Yndra',
  'Brynhilda',
  'Drauda',
  'Eldhilda',
  'Frigga',
  'Gudrun',
  'Hervor',
  'Ingvild',
  'Jara',
  'Kveld',
  'Lovisa',
  'Nordra',
  'Olrun',
  'Petrina',
  'Ragnhild',
  'Sigvor',
  'Thyra',
  'Yrsalla',
]

// ---------------------------------------------------------------------------
// Fetch all roman-numeral characters
// ---------------------------------------------------------------------------
async function fetchAllByQuery(query) {
  const all = []
  let page = 1
  while (true) {
    const r = await alephFetch(
      `/api/campaigns/${CAMPAIGN_ID}/characters?search=${query}&pageSize=100&page=${page}`,
    )
    if (!r?.data?.length) break
    all.push(...r.data)
    if (r.data.length < 100) break
    page++
  }
  return all
}

async function main() {
  console.log('Buscando personajes con sufijo romano...')
  const ii = await fetchAllByQuery('II')
  const iii = await fetchAllByQuery('III')
  const iv = await fetchAllByQuery('IV')
  const merged = [...new Map([...ii, ...iii, ...iv].map((c) => [c.slug, c])).values()]
  const candidates = merged.filter((c) => /\b(II|III|IV)\b/.test(c.name))
  console.log(`  Encontrados: ${candidates.length}`)

  // Track names we've already used (existing + new) to avoid collisions
  const usedNames = new Set()
  // Pre-populate used names with non-roman characters (to avoid clashing)
  // We don't have a full list, so we just track new assignments and the
  // surviving roman-stripped names

  // Pool indices
  let maleIdx = 0
  let femaleIdx = 0

  let renamed = 0
  let skipped = 0

  for (const c of candidates) {
    // Determine gender from existing data
    const gender = (c.gender || '').toLowerCase()
    const isFemale = gender.includes('femen') || gender.includes('female')
    const pool = isFemale ? FEMALE_POOL : MALE_POOL
    let idx = isFemale ? femaleIdx : maleIdx

    // Surname is last token
    const parts = c.name.trim().split(/\s+/).filter(Boolean)
    const surname = parts[parts.length - 1] // Garess or Golka

    // Find next unused name
    let newName = null
    while (idx < pool.length) {
      const candidate = `${pool[idx]} ${surname}`
      if (!usedNames.has(candidate)) {
        newName = candidate
        usedNames.add(candidate)
        idx++
        break
      }
      idx++
    }

    if (!newName) {
      console.log(`  ✗ Sin más nombres disponibles para ${c.name}`)
      skipped++
      continue
    }

    if (isFemale) femaleIdx = idx
    else maleIdx = idx

    console.log(`  ${DRY_RUN ? '[DRY]' : '↑'} ${c.name} → ${newName}`)

    if (!DRY_RUN) {
      try {
        await alephFetch(`/api/campaigns/${CAMPAIGN_ID}/characters/${c.slug}`, 'PUT', {
          name: newName,
        })
        renamed++
        await sleep(DELAY_MS)
      } catch (err) {
        console.error(`    ✗ Error: ${err.message}`)
        if (err.message.includes('429')) await sleep(2000)
      }
    } else {
      renamed++
    }
  }

  console.log(`\n✓ ${renamed} renombrados, ${skipped} sin nombre disponible`)
  console.log(
    `  Pool agotado: masculino ${maleIdx}/${MALE_POOL.length}, femenino ${femaleIdx}/${FEMALE_POOL.length}`,
  )
}

main().catch((err) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
