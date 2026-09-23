#!/usr/bin/env tsx
/**
 * Banco de pruebas de la búsqueda de entidades.
 *
 * POR QUÉ EXISTE: el umbral `SEMANTIC_MAX_DISTANCE` de embeddings.ts se fijó a ojo
 * con una "calibration script" que nunca se versionó, y sus propios comentarios
 * documentan que el margen entre acierto y ruido es estrechísimo (0,11-0,16 frente a
 * 0,18-0,20) y que x64 y ARM calculan números distintos para el mismo modelo. Sin un
 * medidor versionado, cualquier cambio de modelo o de umbral es a ciegas: no se puede
 * saber si mejora o empeora. Éste es ese medidor.
 *
 * QUÉ MIDE, y la distinción es la que importa:
 *   1. Lo que producción DEVUELVE — llama a `hybridSearchEntities`, el mismo código que
 *      sirve /api/campaigns/:id/search. Mide recall y MRR de cada brazo y del fusionado.
 *   2. Lo que el umbral ESCONDE — lee distancias crudas del vec0 saltándose el corte,
 *      porque `searchEntitiesSemantic` ya filtra por él y desde fuera no se ve qué
 *      aciertos está cortando ni por cuánto.
 *
 * Sin (2) no se puede calibrar: sólo verías que algo no aparece, nunca si fue por 0,001.
 *
 * USO:
 *   npx tsx scripts/eval-search.ts --db data/aleph.db
 *   npx tsx scripts/eval-search.ts --db /ruta/a/copia-de-produccion.db --k 10 --json
 *
 * El rol por defecto es `dm` a propósito: el banco mide la calidad del buscador, no el
 * control de acceso (que tiene sus propias pruebas). Con `visitor` la mitad del corpus
 * es invisible y los números no medirían lo que crees.
 */
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { hybridSearchEntities } from '../server/services/hybrid-search'
import { searchEntities, indexVariantForRole } from '../server/services/search'
import { embedText, VEC_TABLES, EMBEDDING_DIM } from '../server/services/embeddings'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Cuántos vecinos pedir al leer distancias crudas. Alto a propósito: el objetivo es ver
 *  dónde cae el acierto esperado aunque el umbral lo esté cortando, no rankear. */
const RAW_K = 50

interface GoldCase {
  id: string
  query: string
  expectAny: string[]
  kind: string
  note?: string
}

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const asJson = process.argv.includes('--json')

const dbPath = arg('db', join(HERE, '..', 'data', 'aleph.db'))!
const goldPath = arg('gold', join(HERE, 'search-gold-set.json'))!
const k = Number(arg('k', '10'))
const role = arg('role', 'dm')!

const gold = JSON.parse(readFileSync(goldPath, 'utf8')) as {
  campaignId: string
  campaignName?: string
  cases: GoldCase[]
}

const sqlite = new Database(dbPath, { readonly: true })
sqliteVec.load(sqlite)

/**
 * Distancia cruda del vecino más cercano y de una entidad concreta, SIN el corte.
 * Es lo que `searchEntitiesSemantic` no deja ver porque filtra antes de devolver.
 */
function rawDistances(vector: Float32Array, campaignId: string, wanted: Set<string>) {
  const table = VEC_TABLES[indexVariantForRole(role)]
  // Dos pasos, como el código de producción: resolver rowid→entity_id en una consulta
  // aparte en vez de con un JOIN sobre la tabla virtual. vec0 es quisquilloso con los
  // JOIN y la de producción es la forma que se sabe que funciona.
  const hits = sqlite
    .prepare(
      `SELECT rowid, distance FROM ${table}
        WHERE embedding MATCH ? AND campaign_id = ? AND k = ?
        ORDER BY distance`,
    )
    .all(vector, campaignId, RAW_K) as Array<{ rowid: number; distance: number }>

  const idByRowid = new Map<number, string>()
  if (hits.length) {
    const ph = hits.map(() => '?').join(',')
    for (const r of sqlite
      .prepare(`SELECT rowid, entity_id AS entityId FROM entity_vec_map WHERE rowid IN (${ph})`)
      .all(...hits.map((h) => h.rowid)) as Array<{ rowid: number; entityId: string }>) {
      idByRowid.set(r.rowid, r.entityId)
    }
  }
  const rows = hits.map((h) => ({ distance: h.distance, entityId: idByRowid.get(h.rowid) ?? '' }))

  const best = rows[0]?.distance ?? null
  let wantedBest: number | null = null
  let wantedRank: number | null = null
  rows.forEach((r, i) => {
    if (wantedBest === null && wanted.has(r.entityId)) {
      wantedBest = r.distance
      wantedRank = i + 1
    }
  })
  return { best, wantedBest, wantedRank }
}

const slugById = new Map<string, string>()
for (const r of sqlite.prepare('SELECT id, slug FROM entities').all() as Array<{
  id: string
  slug: string
}>) {
  slugById.set(r.id, r.slug)
}
const idBySlug = new Map(Array.from(slugById, ([id, slug]) => [slug, id]))

function rankOf(ids: string[], wantedSlugs: string[]): number | null {
  for (let i = 0; i < ids.length; i++) {
    if (wantedSlugs.includes(slugById.get(ids[i]) ?? '')) return i + 1
  }
  return null
}

/** Una fila por caso del gold set. Los tres `rank*` son `null` cuando ese brazo no lo encontró,
 *  que es distinto de 0 y por eso `recall`/`mrr` comparan contra `null` explícitamente. */
interface CaseResult {
  id: string
  kind: string
  query: string
  expectAny: string[]
  isNegative: boolean
  rankLexical: number | null
  rankSemantic: number | null
  rankFused: number | null
  returnedCount: number
  semanticReturned: number
  rawBestDistance: number | null
  rawExpectedDistance: number | null
  rawExpectedRank: number | null
}

/** Sólo los campos de ranking son medibles por `recall`/`mrr`; escribirlo como una unión en vez
 *  de `string` impide llamarlas con un campo que no es un rango. */
type RankField = 'rankLexical' | 'rankSemantic' | 'rankFused'

const results: CaseResult[] = []

for (const c of gold.cases) {
  const unknown = c.expectAny.filter((s) => !idBySlug.has(s))
  if (unknown.length) {
    // Un slug esperado que ya no existe invalida el caso: falla ruidosamente en vez de
    // contar como "no encontrado", que es exactamente el fallo silencioso que este
    // banco existe para evitar.
    console.error(
      `✗ caso "${c.id}": estos slugs esperados no existen en la BD: ${unknown.join(', ')}`,
    )
    process.exitCode = 2
    continue
  }

  const wantedIds = new Set(c.expectAny.map((s) => idBySlug.get(s)!))

  const lexical = searchEntities(sqlite, gold.campaignId, c.query, k, role).map((r) => r.entityId)
  const { fused } = await hybridSearchEntities(sqlite, gold.campaignId, c.query, k, { role })
  const fusedIds = fused.map((f) => f.entityId)
  const semanticIds = fused.filter((f) => f.arms.includes('semantic')).map((f) => f.entityId)

  const vector = await embedText(c.query, 'query')
  const raw = rawDistances(vector, gold.campaignId, wantedIds)

  results.push({
    id: c.id,
    kind: c.kind,
    query: c.query,
    expectAny: c.expectAny,
    isNegative: c.expectAny.length === 0,
    rankLexical: rankOf(lexical, c.expectAny),
    rankSemantic: rankOf(semanticIds, c.expectAny),
    rankFused: rankOf(fusedIds, c.expectAny),
    returnedCount: fusedIds.length,
    // Separar los dos es imprescindible en los negativos: el umbral sólo gobierna el
    // brazo semántico, así que contar el ruido léxico como "falso positivo del umbral"
    // culpa al umbral de algo que no es suyo. La primera versión de este banco lo hacía.
    semanticReturned: semanticIds.length,
    rawBestDistance: raw.best,
    rawExpectedDistance: raw.wantedBest,
    rawExpectedRank: raw.wantedRank,
  })
}

const positives = results.filter((r) => !r.isNegative)
const negatives = results.filter((r) => r.isNegative)

function recall(rs: CaseResult[], field: RankField) {
  const hit = rs.filter((r) => r[field] !== null).length
  return rs.length ? hit / rs.length : 0
}
function mrr(rs: CaseResult[], field: RankField) {
  const s = rs.reduce((acc, r) => {
    const rank = r[field]
    return acc + (rank ? 1 / rank : 0)
  }, 0)
  return rs.length ? s / rs.length : 0
}

const summary = {
  db: dbPath,
  campaign: gold.campaignName ?? gold.campaignId,
  k,
  role,
  embeddingDim: EMBEDDING_DIM,
  positives: positives.length,
  negatives: negatives.length,
  recall: {
    lexical: recall(positives, 'rankLexical'),
    semantic: recall(positives, 'rankSemantic'),
    fused: recall(positives, 'rankFused'),
  },
  mrr: {
    lexical: mrr(positives, 'rankLexical'),
    semantic: mrr(positives, 'rankSemantic'),
    fused: mrr(positives, 'rankFused'),
  },
  /** Lo que el brazo semántico aporta de verdad: casos que sólo él encuentra. */
  semanticOnly: positives
    .filter((r) => r.rankSemantic !== null && r.rankLexical === null)
    .map((r) => r.id),
  lexicalOnly: positives
    .filter((r) => r.rankLexical !== null && r.rankSemantic === null)
    .map((r) => r.id),
  foundByNeither: positives.filter((r) => r.rankFused === null).map((r) => r.id),
  /** Los negativos que devolvieron algo: falsos positivos que el umbral dejó pasar. */
  negativesLeakedSemantic: negatives
    .filter((r) => r.semanticReturned > 0)
    .map((r) => ({ id: r.id, n: r.semanticReturned })),
  negativesLeakedLexical: negatives
    .filter((r) => r.returnedCount > 0)
    .map((r) => ({ id: r.id, n: r.returnedCount })),
}

if (asJson) {
  console.log(JSON.stringify({ summary, results }, null, 2))
} else {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`
  console.log(`\n  BD: ${dbPath}`)
  console.log(`  Campaña: ${summary.campaign} · k=${k} · rol=${role} · dim=${summary.embeddingDim}`)
  console.log(`  ${positives.length} casos positivos, ${negatives.length} negativos\n`)

  console.log('  RECALL@k        MRR')
  for (const arm of ['lexical', 'semantic', 'fused'] as const) {
    console.log(
      `    ${arm.padEnd(10)} ${pct(summary.recall[arm]).padStart(4)}   ${summary.mrr[arm].toFixed(3)}`,
    )
  }

  console.log('\n  POSITIVOS')
  for (const r of positives) {
    const mark = r.rankFused ? '✓' : '✗'
    const d = r.rawExpectedDistance === null ? '   n/d' : r.rawExpectedDistance.toFixed(3)
    console.log(
      `    ${mark} ${r.id.padEnd(22)} lex=${String(r.rankLexical ?? '—').padStart(3)} sem=${String(r.rankSemantic ?? '—').padStart(3)} fus=${String(r.rankFused ?? '—').padStart(3)}  dist=${d}`,
    )
  }

  console.log('\n  NEGATIVOS (el umbral sólo responde de la columna sem)')
  for (const r of negatives) {
    const mark = r.semanticReturned === 0 ? '✓' : '✗'
    console.log(
      `    ${mark} ${r.id.padEnd(22)} sem=${String(r.semanticReturned).padStart(2)} lex+fus=${String(r.returnedCount).padStart(2)}  mejor dist=${r.rawBestDistance === null ? 'n/d' : r.rawBestDistance.toFixed(3)}`,
    )
  }

  // La tabla que sirve para mover el umbral con criterio en vez de a ojo.
  const tp = positives.map((r) => r.rawExpectedDistance).filter((d): d is number => d !== null)
  const tn = negatives.map((r) => r.rawBestDistance).filter((d): d is number => d !== null)
  if (tp.length && tn.length) {
    const peorAcierto = Math.max(...tp)
    const mejorRuido = Math.min(...tn)
    console.log('\n  CALIBRACIÓN DEL UMBRAL')
    console.log(`    acierto más lejano : ${peorAcierto.toFixed(3)}`)
    console.log(`    ruido más cercano  : ${mejorRuido.toFixed(3)}`)
    const margen = mejorRuido - peorAcierto
    console.log(
      `    margen             : ${margen.toFixed(3)} ${margen <= 0 ? '← SE SOLAPAN: ningún umbral los separa' : ''}`,
    )
    if (margen > 0) {
      console.log(
        `    umbral seguro      : cualquiera entre ${peorAcierto.toFixed(3)} y ${mejorRuido.toFixed(3)} (punto medio ${((peorAcierto + mejorRuido) / 2).toFixed(3)})`,
      )
    }
  }

  if (summary.semanticOnly.length)
    console.log(`\n  Sólo los encuentra el brazo semántico: ${summary.semanticOnly.join(', ')}`)
  if (summary.lexicalOnly.length)
    console.log(`  Sólo los encuentra el brazo léxico:   ${summary.lexicalOnly.join(', ')}`)
  if (summary.foundByNeither.length)
    console.log(`  NO los encuentra nadie:               ${summary.foundByNeither.join(', ')}`)
  console.log()
}

sqlite.close()
