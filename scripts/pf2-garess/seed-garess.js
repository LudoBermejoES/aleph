#!/usr/bin/env node
/**
 * scripts/pf2-garess/seed-garess.js
 *
 * Siembra la genealogía enana de House Garess y parte del clan Golka (desaparecidos).
 * Campaña: Kingmaker (PF2e) en aleph.ludobermejo.es.
 *
 * - 200 Garess: vivos + muertos por vejez/combate (6 generaciones, ~4300-4690 AR)
 * - 50 Golka: todos desaparecidos en La Desaparición (4699 AR), excepto Toval Golka (adoptado)
 * - Matrimonios inter-clan en gens 3-5 para reflejar la alianza histórica
 * - Esperanza de vida enana ~350 años (PF2e)
 *
 * Uso: node scripts/pf2-garess/seed-garess.js [--dry-run]
 */

import { alephFetch } from '../pf2-setup/lib/cli.js'

const CAMPAIGN_ID = '1f84e2fa-32ed-40a7-be5a-b645bda0d6af'
const DELAY_MS = 300
const DRY_RUN = process.argv.includes('--dry-run')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ---------------------------------------------------------------------------
// Pool de nombres enanos (PF2e canónicos + variantes para completar 250)
// ---------------------------------------------------------------------------
const MALE_NAMES = [
  'Bodill',
  'Edrukk',
  'Grunyar',
  'Kotri',
  'Morgrym',
  'Rogar',
  'Yangrit',
  'Thrain',
  'Durgan',
  'Barendd',
  'Dain',
  'Dolgrin',
  'Falkrunn',
  'Gardain',
  'Harbek',
  'Kildrak',
  'Morgran',
  'Orsik',
  'Rangrim',
  'Tordek',
  'Traubon',
  'Veit',
  'Vondal',
  'Whurbin',
  'Baern',
  'Brottor',
  'Darrak',
  'Delg',
  'Eberk',
  'Einkil',
  'Fargrim',
  'Flint',
  'Gargnir',
  'Kildrak',
  'Mordin',
  'Nalral',
  'Orsik',
  'Thargrim',
  'Ulfgar',
  'Veit',
  'Adrik',
  'Alberich',
  'Baern',
  'Beloril',
  'Bombur',
  'Brottor',
  'Dain',
  'Daral',
  'Grorin',
  'Harbek',
  'Horgar',
  'Kurnar',
  'Ovim',
  'Rurik',
  'Thoradin',
  'Ulbrek',
  'Vondal',
  'Vongrim',
  'Whurbad',
  'Balin',
  'Dwalin',
  'Gloin',
  'Oin',
  'Thorin',
  'Fili',
  'Kili',
  'Nori',
  'Dori',
  'Ori',
  'Bifur',
  'Bofur',
  'Dain',
  'Thror',
  'Thrain',
  'Durin',
  'Fror',
  'Gror',
]

const FEMALE_NAMES = [
  'Agna',
  'Indra',
  'Torra',
  'Kathra',
  'Mardred',
  'Riswynn',
  'Vistra',
  'Helja',
  'Amber',
  'Artin',
  'Audhild',
  'Bardryn',
  'Dagnal',
  'Diesa',
  'Eldeth',
  'Falkrunn',
  'Gunnloda',
  'Hlin',
  'Ilde',
  'Jarana',
  'Kathra',
  'Kristryd',
  'Ilde',
  'Liftrasa',
  'Mardred',
  'Riswynn',
  'Sannl',
  'Torgga',
  'Vistra',
  'Orla',
  'Finellen',
  'Ilsa',
  'Gurdis',
  'Hanadora',
  'Hlin',
  'Kordakk',
  'Marastyr',
  'Ovina',
  'Raknild',
  'Tirkara',
  'Werydd',
  'Yurgunn',
  'Dis',
  'Hilda',
  'Freya',
  'Runa',
  'Kelda',
  'Astrid',
  'Brynja',
  'Sigrun',
]

let nameCounter = 0
function pickName(gender, rng) {
  const pool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES
  nameCounter++
  return (
    pool[rng() % pool.length] +
    (nameCounter > pool.length
      ? ` ${['II', 'III', 'IV'][Math.floor(nameCounter / pool.length) - 1] || ''}`
      : '')
  )
}

// Simple deterministic RNG (so re-runs produce same data)
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return (t ^ (t >>> 14)) >>> 0
  }
}
const rng = mulberry32(42)
function rand(max) {
  return rng() % max
}
function pick(arr) {
  return arr[rand(arr.length)]
}

// ---------------------------------------------------------------------------
// Roles por clan
// ---------------------------------------------------------------------------
const GARESS_ROLES = [
  'Forjador de armas en Grayhaven',
  'Metalúrgico maestro',
  'Herrero del clan',
  'Guardián de Highdelve',
  'Capitán de guardia de Grayhaven',
  'Consejero de la casa',
  'Comerciante de metales',
  'Escriba del clan',
  'Minero en las colinas de Golushkin',
  'Tallador de runas',
  'Cervecero del clan',
  'Cronista familiar',
  'Ingeniera de puentes',
  'Sacerdotisa de Torag',
  'Armera jefe',
  'Comandante de milicia',
  'Diplomática en Restov',
  'Cazadora de las estribaciones',
]

const GOLKA_ROLES = [
  'Clan-chief del hold de Golushkin',
  'Minera maestra de gemas',
  'Forjadora de Golushkin',
  'Guardián del hold profundo',
  'Sacerdote de Torag',
  'Explorador de túneles profundos',
  'Maestra de la forja de mithril',
  'Cantora de piedra',
  'Gremial de mineros',
  'Constructor de galerías',
  'Guardiana del santuario ancestral',
  'Tallador de sellos rúnicos',
  'Escriba del clan Golka',
  'Maestra de la cerveza del hold',
  'Capitán de la guardia de Golushkin',
]

// ---------------------------------------------------------------------------
// Generación de personajes
// ---------------------------------------------------------------------------
const PEOPLE = [] // { id, name, gender, clan, gen, birthYear, deathYear, status, role, parents: [], spouse: null, siblings: [] }

let idCounter = 0
function makePerson({ clan, gen, gender, birthYear, deathYear, status, role, nameOverride }) {
  idCounter++
  const surname = clan === 'Garess' ? 'Garess' : 'Golka'
  const givenName = nameOverride || pickName(gender, rng)
  const fullName = `${givenName} ${surname}`
  const p = {
    id: idCounter,
    name: fullName,
    gender,
    clan,
    gen,
    birthYear,
    deathYear: deathYear || null,
    status,
    role,
    parents: [],
    spouse: null,
    siblings: [],
    slug: null,
  }
  PEOPLE.push(p)
  return p
}

// ---------------------------------------------------------------------------
// Árbol: Garess (200 enanos, 6 generaciones)
// ---------------------------------------------------------------------------

// Helper: returns a generation's year range for a person given slot
function yearFor(baseYear, jitter = 20) {
  return baseYear + rand(jitter) - jitter / 2
}

// Death year: natural death age 300-350, or in combat earlier
function deathFromOldAge(birthYear) {
  return birthYear + 300 + rand(50)
}

// --- Garess gen 1 (born ~4300, all dead by 4719) — 14 ---
const garessG1 = []
for (let i = 0; i < 14; i++) {
  const gender = i % 2 === 0 ? 'male' : 'female'
  const birth = yearFor(4300)
  const death = deathFromOldAge(birth)
  garessG1.push(
    makePerson({
      clan: 'Garess',
      gen: 1,
      gender,
      birthYear: birth,
      deathYear: death,
      status: 'dead',
      role: 'Patriarca fundador de House Garess',
    }),
  )
}
// Pair them into 7 couples
for (let i = 0; i < 14; i += 2) {
  garessG1[i].spouse = garessG1[i + 1]
  garessG1[i + 1].spouse = garessG1[i]
}

// --- Garess gen 2 (born ~4380, all dead) — 26, children of gen 1 couples ---
const garessG2 = []
for (let i = 0; i < 26; i++) {
  const parentCouple = Math.min(Math.floor(i / 4), 6) // spread children across 7 couples
  const parents = [garessG1[parentCouple * 2], garessG1[parentCouple * 2 + 1]]
  const gender = i % 2 === 0 ? 'male' : 'female'
  const birth = yearFor(4380)
  const death = deathFromOldAge(birth)
  const p = makePerson({
    clan: 'Garess',
    gen: 2,
    gender,
    birthYear: birth,
    deathYear: death,
    status: 'dead',
    role: pick(GARESS_ROLES) + ' (ancestro)',
  })
  p.parents = parents
  garessG2.push(p)
}
// Mark siblings within gen 2 (those sharing parents)
for (const p of garessG2) {
  p.siblings = garessG2.filter((s) => s !== p && s.parents[0] === p.parents[0])
}
// Pair 12 couples (24 of 26)
const g2Couples = []
for (let i = 0; i < 24; i += 2) {
  // Avoid siblings marrying: find non-sibling partner
  const a = garessG2[i]
  let b = garessG2[i + 1]
  if (a.parents[0] === b.parents[0]) {
    for (let j = 24; j < 26; j++) {
      if (garessG2[j].parents[0] !== a.parents[0]) {
        ;[garessG2[i + 1], garessG2[j]] = [garessG2[j], garessG2[i + 1]]
        b = garessG2[i + 1]
        break
      }
    }
  }
  a.spouse = b
  b.spouse = a
  g2Couples.push([a, b])
}

// --- Garess gen 3 (born ~4460, all dead of old age/combat) — 36 ---
const garessG3 = []
for (let i = 0; i < 36; i++) {
  const couple = g2Couples[i % g2Couples.length]
  const gender = i % 2 === 0 ? 'male' : 'female'
  const birth = yearFor(4460)
  // 3 of them die in combat young
  const deathByCombat = i < 3
  const death = deathByCombat ? birth + 80 + rand(40) : deathFromOldAge(birth)
  const p = makePerson({
    clan: 'Garess',
    gen: 3,
    gender,
    birthYear: birth,
    deathYear: death,
    status: 'dead',
    role: deathByCombat ? 'Guerrero caído defendiendo Grayhaven' : pick(GARESS_ROLES),
  })
  p.parents = [couple[0], couple[1]]
  garessG3.push(p)
}
for (const p of garessG3) {
  p.siblings = garessG3.filter((s) => s !== p && s.parents[0] === p.parents[0])
}

// Pair 15 couples (30 of 36)
const g3Couples = []
for (let i = 0; i < 30; i += 2) {
  const a = garessG3[i]
  let b = garessG3[i + 1]
  if (a.parents[0] === b.parents[0]) {
    for (let j = 30; j < 36; j++) {
      if (garessG3[j].parents[0] !== a.parents[0]) {
        ;[garessG3[i + 1], garessG3[j]] = [garessG3[j], garessG3[i + 1]]
        b = garessG3[i + 1]
        break
      }
    }
  }
  a.spouse = b
  b.spouse = a
  g3Couples.push([a, b])
}

// --- Garess gen 4 (born ~4540) — 44. Most dead, some ancient elders alive ---
const garessG4 = []
for (let i = 0; i < 44; i++) {
  const couple = g3Couples[i % g3Couples.length]
  const gender = i % 2 === 0 ? 'male' : 'female'
  const birth = yearFor(4540)
  // ~20% alive as elders (age ~179)
  const aliveElder = i < 9
  const death = aliveElder ? null : deathFromOldAge(birth)
  const status = aliveElder ? 'alive' : 'dead'
  const p = makePerson({
    clan: 'Garess',
    gen: 4,
    gender,
    birthYear: birth,
    deathYear: death,
    status,
    role: aliveElder ? 'Anciano consejero de la casa' : pick(GARESS_ROLES),
  })
  p.parents = [couple[0], couple[1]]
  garessG4.push(p)
}
for (const p of garessG4) {
  p.siblings = garessG4.filter((s) => s !== p && s.parents[0] === p.parents[0])
}

const g4Couples = []
for (let i = 0; i < 38; i += 2) {
  const a = garessG4[i]
  let b = garessG4[i + 1]
  if (a.parents[0] === b.parents[0]) {
    for (let j = 38; j < 44; j++) {
      if (garessG4[j].parents[0] !== a.parents[0]) {
        ;[garessG4[i + 1], garessG4[j]] = [garessG4[j], garessG4[i + 1]]
        b = garessG4[i + 1]
        break
      }
    }
  }
  a.spouse = b
  b.spouse = a
  g4Couples.push([a, b])
}

// --- Garess gen 5 (born ~4620) — 50. Includes Lord Howlan. Most alive. ---
const garessG5 = []
let howlan = null
for (let i = 0; i < 50; i++) {
  const couple = g4Couples[i % g4Couples.length]
  const gender = i === 0 ? 'male' : i % 2 === 0 ? 'male' : 'female'
  const birth = i === 0 ? 4625 : yearFor(4620)
  const alive = i < 40
  const death = alive ? null : birth + 70 + rand(30) // some died in accidents/combat
  const p = makePerson({
    clan: 'Garess',
    gen: 5,
    gender,
    birthYear: birth,
    deathYear: death,
    status: alive ? 'alive' : 'dead',
    role: i === 0 ? 'Señor de House Garess, viudo' : pick(GARESS_ROLES),
    nameOverride: i === 0 ? 'Howlan' : undefined,
  })
  p.parents = [couple[0], couple[1]]
  garessG5.push(p)
  if (i === 0) howlan = p
}
for (const p of garessG5) {
  p.siblings = garessG5.filter((s) => s !== p && s.parents[0] === p.parents[0])
}

// Howlan's wife (deceased — he's widowed). Create separately, Garess clan by marriage
const howlanWife = makePerson({
  clan: 'Garess',
  gen: 5,
  gender: 'female',
  birthYear: 4628,
  deathYear: 4705,
  status: 'dead',
  role: 'Esposa de Lord Howlan, fallecida en 4705',
})
howlan.spouse = howlanWife
howlanWife.spouse = howlan

// Pair other gen 5 couples
const g5Couples = [[howlan, howlanWife]]
for (let i = 2; i < 44; i += 2) {
  const a = garessG5[i]
  let b = garessG5[i + 1]
  if (a.parents[0] === b.parents[0]) {
    for (let j = 44; j < 50; j++) {
      if (garessG5[j].parents[0] !== a.parents[0]) {
        ;[garessG5[i + 1], garessG5[j]] = [garessG5[j], garessG5[i + 1]]
        b = garessG5[i + 1]
        break
      }
    }
  }
  a.spouse = b
  b.spouse = a
  g5Couples.push([a, b])
}

// --- Garess gen 6 (born ~4690) — 30. Young adults, mostly alive. ---
// Howlan's own son disappeared with Golka in 4699 — he was visiting Golushkin hold
const garessG6 = []
for (let i = 0; i < 30; i++) {
  const couple = g5Couples[i % g5Couples.length]
  const gender = i === 0 ? 'male' : i % 2 === 0 ? 'male' : 'female'
  const birth = i === 0 ? 4690 : yearFor(4690, 10)
  // Howlan's son (i=0) is missing in Vanishing
  let status, death, role
  if (i === 0) {
    status = 'missing'
    death = null
    role =
      'Hijo de Lord Howlan, desaparecido en La Desaparición de 4699 durante una visita al hold Golushkin'
  } else {
    status = 'alive'
    death = null
    role = pick(GARESS_ROLES)
  }
  const p = makePerson({
    clan: 'Garess',
    gen: 6,
    gender,
    birthYear: birth,
    deathYear: death,
    status,
    role,
  })
  p.parents = [couple[0], couple[1]]
  garessG6.push(p)
}
for (const p of garessG6) {
  p.siblings = garessG6.filter((s) => s !== p && s.parents[0] === p.parents[0])
}

// ---------------------------------------------------------------------------
// Golka clan — 50 enanos, todos desaparecidos en 4699 excepto Toval
// ---------------------------------------------------------------------------

// --- Golka gen 4 (born ~4560) — 15 ---
const golkaG4 = []
for (let i = 0; i < 15; i++) {
  const gender = i % 2 === 0 ? 'male' : 'female'
  const birth = yearFor(4560)
  golkaG4.push(
    makePerson({
      clan: 'Golka',
      gen: 4,
      gender,
      birthYear: birth,
      deathYear: null,
      status: 'missing',
      role: 'Miembro del clan Golka, desaparecido en La Desaparición de 4699 (anciano del hold)',
    }),
  )
}
// Pair them
const golkaG4Couples = []
for (let i = 0; i < 14; i += 2) {
  golkaG4[i].spouse = golkaG4[i + 1]
  golkaG4[i + 1].spouse = golkaG4[i]
  golkaG4Couples.push([golkaG4[i], golkaG4[i + 1]])
}

// --- Golka gen 5 (born ~4640) — 25, includes the clan-chief (Toval's father) ---
const golkaG5 = []
let tovalFather = null
let tovalMother = null
for (let i = 0; i < 25; i++) {
  const couple = golkaG5Parents(i)
  const gender = i === 0 ? 'male' : i === 1 ? 'female' : i % 2 === 0 ? 'male' : 'female'
  const birth = i === 0 || i === 1 ? 4645 + i : yearFor(4640)
  let role = pick(GOLKA_ROLES)
  let nameOverride
  if (i === 0) {
    role = 'Clan-chief del hold de Golushkin, padre de Toval. Desaparecido en 4699.'
    nameOverride = 'Durgan'
  }
  if (i === 1) {
    role = 'Esposa del clan-chief, madre de Toval. Desaparecida en 4699.'
    nameOverride = 'Agna'
  }
  const p = makePerson({
    clan: 'Golka',
    gen: 5,
    gender,
    birthYear: birth,
    deathYear: null,
    status: 'missing',
    role: role + ' — desaparecido en La Desaparición de 4699',
    nameOverride,
  })
  p.parents = couple
  golkaG5.push(p)
  if (i === 0) tovalFather = p
  if (i === 1) tovalMother = p
}
function golkaG5Parents(idx) {
  return golkaG4Couples[idx % golkaG4Couples.length]
}
// Mark siblings
for (const p of golkaG5) {
  p.siblings = golkaG5.filter((s) => s !== p && s.parents[0] === p.parents[0])
}
// Toval's parents are a couple
tovalFather.spouse = tovalMother
tovalMother.spouse = tovalFather

// Pair other Golka gen 5 couples (non-siblings)
const golkaG5Couples = [[tovalFather, tovalMother]]
for (let i = 2; i < 22; i += 2) {
  const a = golkaG5[i]
  let b = golkaG5[i + 1]
  if (a.parents[0] === b.parents[0]) {
    for (let j = 22; j < 25; j++) {
      if (golkaG5[j].parents[0] !== a.parents[0]) {
        ;[golkaG5[i + 1], golkaG5[j]] = [golkaG5[j], golkaG5[i + 1]]
        b = golkaG5[i + 1]
        break
      }
    }
  }
  a.spouse = b
  b.spouse = a
  golkaG5Couples.push([a, b])
}

// --- Golka gen 6 (born ~4695) — 10, includes Toval. Only Toval survives. ---
const golkaG6 = []
let toval = null
for (let i = 0; i < 10; i++) {
  const couple = golkaG5Couples[i % golkaG5Couples.length]
  const gender = i === 0 ? 'male' : i % 2 === 0 ? 'male' : 'female'
  const birth = i === 0 ? 4696 : yearFor(4695, 6)
  const isToval = i === 0
  const p = makePerson({
    clan: 'Golka',
    gen: 6,
    gender,
    birthYear: birth,
    deathYear: null,
    status: isToval ? 'alive' : 'missing',
    role: isToval
      ? 'Heredero adoptivo de House Garess. Único superviviente del clan Golka tras La Desaparición. Sobrevivió porque se encontraba fuera del hold de Golushkin cuando ocurrió (visitando Grayhaven). Fue adoptado por Lord Howlan Garess.'
      : 'Niño del clan Golka, desaparecido en La Desaparición de 4699 junto con el resto del hold',
    nameOverride: isToval ? 'Toval' : undefined,
  })
  p.parents = couple
  golkaG6.push(p)
  if (isToval) toval = p
}
for (const p of golkaG6) {
  p.siblings = golkaG6.filter((s) => s !== p && s.parents[0] === p.parents[0])
}

// Toval's adoption: Howlan is his adoptive parent
toval._adoptiveParent = howlan

// ---------------------------------------------------------------------------
// Matrimonios inter-clan (Garess <-> Golka) en gens 3-5
// Sustituimos algunos matrimonios intra-clan por lazos entre casas
// ---------------------------------------------------------------------------
// Cross-clan marriages: break some existing intra-clan pairs and re-pair Garess with Golka
const crossMarriages = []

function crossMarry(garessPerson, golkaPerson) {
  if (!garessPerson || !golkaPerson) return false
  if (garessPerson.gender === golkaPerson.gender) return false
  // Break existing spouses
  if (garessPerson.spouse) {
    garessPerson.spouse.spouse = null
    garessPerson.spouse = null
  }
  if (golkaPerson.spouse) {
    golkaPerson.spouse.spouse = null
    golkaPerson.spouse = null
  }
  garessPerson.spouse = golkaPerson
  golkaPerson.spouse = garessPerson
  crossMarriages.push([garessPerson, golkaPerson])
  return true
}

// Find Garess & Golka of opposite genders and cross-marry
function findByGender(arr, gender, used) {
  return arr.find((p) => p.gender === gender && !used.has(p.id))
}

const usedCross = new Set()
// 4 gen-4 cross marriages
for (let i = 0; i < 4; i++) {
  const gGender = i % 2 === 0 ? 'male' : 'female'
  const kGender = gGender === 'male' ? 'female' : 'male'
  const g = findByGender(garessG4, gGender, usedCross)
  const k = findByGender(golkaG4, kGender, usedCross)
  if (g && k && crossMarry(g, k)) {
    usedCross.add(g.id)
    usedCross.add(k.id)
  }
}

// 4 gen-5 cross marriages (skip Howlan and his wife)
for (let i = 0; i < 4; i++) {
  const gGender = i % 2 === 0 ? 'male' : 'female'
  const kGender = gGender === 'male' ? 'female' : 'male'
  // Skip Howlan (index 0)
  const g = garessG5.slice(2).find((p) => p.gender === gGender && !usedCross.has(p.id))
  // Skip Durgan and Agna (Toval's parents, indices 0,1)
  const k = golkaG5.slice(2).find((p) => p.gender === kGender && !usedCross.has(p.id))
  if (g && k && crossMarry(g, k)) {
    usedCross.add(g.id)
    usedCross.add(k.id)
  }
}

// ---------------------------------------------------------------------------
// Summary and creation
// ---------------------------------------------------------------------------

function summary() {
  const byClan = {}
  const byStatus = {}
  for (const p of PEOPLE) {
    byClan[p.clan] = (byClan[p.clan] || 0) + 1
    byStatus[p.status] = (byStatus[p.status] || 0) + 1
  }
  console.log('\n--- Resumen ---')
  console.log('Total:', PEOPLE.length)
  console.log('Por clan:', byClan)
  console.log('Por estado:', byStatus)
  console.log('Matrimonios inter-clan:', crossMarriages.length)
}

function buildContent(p) {
  const lines = []
  lines.push(`# ${p.name}`)
  lines.push('')
  lines.push(`**Clan:** ${p.clan}`)
  lines.push(`**Generación:** ${p.gen}`)
  lines.push(`**Género:** ${p.gender === 'female' ? 'Femenino' : 'Masculino'}`)
  lines.push(`**Nacimiento:** ${p.birthYear} AR`)
  if (p.deathYear) lines.push(`**Muerte:** ${p.deathYear} AR`)
  lines.push(
    `**Estado en 4719 AR:** ${p.status === 'alive' ? 'Vivo' : p.status === 'dead' ? 'Muerto' : 'Desaparecido'}`,
  )
  lines.push('')
  lines.push(`## Rol`)
  lines.push('')
  lines.push(p.role)
  lines.push('')
  if (p.clan === 'Garess') {
    lines.push(
      'House Garess, con base en las estribaciones de los Montes Golushkin en el oeste de Brevoy. Lema: "Strong as the Mountains". Escudo: pico de montaña nevado en gris sobre campo azul oscuro, luna creciente plateada en la esquina superior derecha, martillo negro atravesando la base.',
    )
  } else {
    lines.push(
      'Clan Golka, antiguos habitantes del hold enano de Golushkin dentro de los Montes Golushkin. El clan entero desapareció en La Desaparición de 4699 AR, un suceso sin explicación que vació el hold profundo.',
    )
  }
  return lines.join('\n')
}

async function createAll() {
  console.log(`\n--- Creando ${PEOPLE.length} personajes ---`)
  if (DRY_RUN) {
    summary()
    console.log('\n(DRY RUN — no se crean personajes)')
    for (const p of PEOPLE.slice(0, 5)) {
      console.log(
        `  ${p.name} (${p.clan} gen ${p.gen}, ${p.birthYear}-${p.deathYear || '...'}, ${p.status})`,
      )
    }
    console.log(`  ... y ${PEOPLE.length - 5} más`)
    return
  }

  let created = 0
  for (const p of PEOPLE) {
    try {
      const result = await alephFetch(`/api/campaigns/${CAMPAIGN_ID}/characters`, 'POST', {
        name: p.name,
      })
      p.slug = result.slug
      created++
      if (created % 25 === 0) console.log(`  ... creados ${created}/${PEOPLE.length}`)
      await sleep(DELAY_MS)
    } catch (err) {
      console.error(`  ✗ Error creando ${p.name}: ${err.message}`)
    }
  }
  console.log(`✓ ${created} personajes creados`)
}

async function updateAll() {
  console.log(`\n--- Actualizando datos de ${PEOPLE.length} personajes ---`)
  if (DRY_RUN) return

  let updated = 0
  for (const p of PEOPLE) {
    if (!p.slug) continue
    try {
      const body = {
        status: p.status,
        characterType: 'npc',
        birthYear: p.birthYear,
        gender: p.gender === 'female' ? 'Femenino' : 'Masculino',
        content: buildContent(p),
      }
      if (p.deathYear) body.deathYear = p.deathYear
      await alephFetch(`/api/campaigns/${CAMPAIGN_ID}/characters/${p.slug}`, 'PUT', body)
      updated++
      if (updated % 25 === 0) console.log(`  ... actualizados ${updated}/${PEOPLE.length}`)
      await sleep(DELAY_MS)
    } catch (err) {
      console.error(`  ✗ Error actualizando ${p.name}: ${err.message}`)
    }
  }
  console.log(`✓ ${updated} personajes actualizados`)
}

async function linkFamilies() {
  console.log(`\n--- Creando enlaces familiares ---`)
  if (DRY_RUN) return

  let links = 0
  const addedPairs = new Set()

  function addLink(from, to, type) {
    // Dedupe
    const key = [from.id, to.id, type].sort().join('-')
    if (addedPairs.has(key)) return null
    addedPairs.add(key)
    return { from, to, type }
  }

  const linksToMake = []
  for (const p of PEOPLE) {
    // Parents
    for (const parent of p.parents) {
      const link = addLink(p, parent, 'parent')
      if (link) linksToMake.push(link)
    }
    // Spouse
    if (p.spouse) {
      const link = addLink(p, p.spouse, 'spouse')
      if (link) linksToMake.push(link)
    }
    // Siblings (one direction only)
    for (const sib of p.siblings || []) {
      if (p.id < sib.id) {
        const link = addLink(p, sib, 'sibling')
        if (link) linksToMake.push(link)
      }
    }
    // Adoptive parent (Toval)
    if (p._adoptiveParent) {
      const link = addLink(p, p._adoptiveParent, 'parent')
      if (link) linksToMake.push(link)
    }
  }

  console.log(`  Enlaces a crear: ${linksToMake.length}`)

  for (const { from, to, type } of linksToMake) {
    if (!from.slug || !to.slug) continue
    try {
      await alephFetch(`/api/campaigns/${CAMPAIGN_ID}/characters/${from.slug}/family`, 'POST', {
        type,
        targetCharacterSlug: to.slug,
      })
      links++
      if (links % 50 === 0) console.log(`  ... enlaces creados ${links}/${linksToMake.length}`)
      await sleep(DELAY_MS)
    } catch (err) {
      // 409 conflict = link already exists (normal for bidirectional)
      if (!err.message.includes('409')) {
        console.error(`  ✗ Error enlazando ${from.name} -${type}-> ${to.name}: ${err.message}`)
      }
    }
  }
  console.log(`✓ ${links} enlaces familiares creados`)
}

async function main() {
  summary()
  await createAll()
  await updateAll()
  await linkFamilies()
  console.log('\n✓ Siembra completada.')
}

main().catch((err) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
