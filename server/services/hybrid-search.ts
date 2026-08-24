import type Database from 'better-sqlite3'
import { searchEntities } from './search'
import { searchEntitiesSemantic } from './embeddings'

/** Standard RRF starting value — see openspec/changes/add-semantic-search/design.md Decision 4. */
export const RRF_K = 60

export type SearchArm = 'lexical' | 'semantic'

export interface RankedList {
  arm: SearchArm
  entityIds: string[]
}

export interface HybridResult {
  entityId: string
  score: number
  arms: SearchArm[]
}

/**
 * Reciprocal Rank Fusion: score(entity) = Σ 1/(k + rank_in_list) across all
 * lists it appears in. Uses only rank position, not the arms' own scores —
 * BM25 and cosine distance are on incompatible scales, so combining rank
 * positions sidesteps needing to calibrate them against each other.
 */
export function fuseRankedLists(lists: RankedList[], k: number = RRF_K): HybridResult[] {
  const scores = new Map<string, number>()
  const arms = new Map<string, Set<SearchArm>>()

  for (const { arm, entityIds } of lists) {
    entityIds.forEach((entityId, index) => {
      const rank = index + 1
      scores.set(entityId, (scores.get(entityId) ?? 0) + 1 / (k + rank))
      if (!arms.has(entityId)) arms.set(entityId, new Set())
      arms.get(entityId)!.add(arm)
    })
  }

  return Array.from(scores.entries())
    .map(([entityId, score]) => ({ entityId, score, arms: Array.from(arms.get(entityId)!) }))
    .sort((a, b) => b.score - a.score)
}

export interface HybridSearchOutcome {
  fused: HybridResult[]
  /** FTS5 snippets, keyed by entity id, for entities the lexical arm matched — semantic-only matches have none. */
  lexicalSnippets: Map<string, string>
}

/**
 * Hybrid search: runs lexical (FTS5/BM25 + trigram fallback) and semantic
 * (sqlite-vec KNN) search independently, scoped to the same campaign, then
 * fuses the two ranked lists with RRF. `semanticEnabled: false` is the
 * rollback path (see design.md Migration Plan step 6) — falls back to
 * lexical-only with no schema change.
 *
 * `role` reaches BOTH arms, and has to: closing the lexical door while the semantic one
 * still answers by cosine distance would just move the leak. It defaults to `visitor` here
 * too, so the fail-closed default is not undone by the layer in between.
 */
export async function hybridSearchEntities(
  sqlite: Database.Database,
  campaignId: string,
  query: string,
  limit: number = 20,
  { semanticEnabled = true, role = 'visitor' }: { semanticEnabled?: boolean; role?: string } = {},
): Promise<HybridSearchOutcome> {
  const lexicalResults = searchEntities(sqlite, campaignId, query, limit, role)
  const lexicalIds = lexicalResults.map((r) => r.entityId)
  const lexicalSnippets = new Map(lexicalResults.map((r) => [r.entityId, r.snippet]))

  let semanticIds: string[] = []
  if (semanticEnabled) {
    const semanticResults = await searchEntitiesSemantic(sqlite, campaignId, query, limit, role)
    semanticIds = semanticResults.map((r) => r.entityId)
  }

  const fused = fuseRankedLists([
    { arm: 'lexical', entityIds: lexicalIds },
    { arm: 'semantic', entityIds: semanticIds },
  ])

  return { fused: fused.slice(0, limit), lexicalSnippets }
}
