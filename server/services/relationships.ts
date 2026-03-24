import { randomUUID } from 'crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { relationTypes } from '../db/schema/relations'

// --- Relation Types ---

export const BUILTIN_RELATION_TYPES = [
  { slug: 'ally', forward: 'ally of', reverse: 'ally of' },
  { slug: 'enemy', forward: 'enemy of', reverse: 'enemy of' },
  { slug: 'rival', forward: 'rival of', reverse: 'rival of' },
  { slug: 'mentor', forward: 'mentor of', reverse: 'student of' },
  { slug: 'family:parent', forward: 'parent of', reverse: 'child of' },
  { slug: 'family:sibling', forward: 'sibling of', reverse: 'sibling of' },
  { slug: 'family:spouse', forward: 'spouse of', reverse: 'spouse of' },
  { slug: 'member_of', forward: 'member of', reverse: 'has member' },
  { slug: 'leader_of', forward: 'leader of', reverse: 'led by' },
  { slug: 'located_in', forward: 'located in', reverse: 'contains' },
  { slug: 'owns', forward: 'owns', reverse: 'owned by' },
  { slug: 'created_by', forward: 'created by', reverse: 'creator of' },
  { slug: 'occurred_at', forward: 'occurred at', reverse: 'site of' },
  { slug: 'worships', forward: 'worships', reverse: 'worshipped by' },
  { slug: 'allied_with', forward: 'allied with', reverse: 'allied with' },
  { slug: 'at_war_with', forward: 'at war with', reverse: 'at war with' },
  { slug: 'custom', forward: '(custom)', reverse: '(custom)' },
]

const VALID_SLUGS = new Set(BUILTIN_RELATION_TYPES.map(t => t.slug))

/**
 * Seed built-in relation types for a campaign.
 */
export function seedRelationTypes(db: BetterSQLite3Database, campaignId: string): void {
  for (const type of BUILTIN_RELATION_TYPES) {
    db.insert(relationTypes).values({
      id: randomUUID(),
      campaignId,
      slug: type.slug,
      forwardLabel: type.forward,
      reverseLabel: type.reverse,
      isBuiltin: true,
    }).run()
  }
}

// --- Label Resolution ---

interface RelationLike {
  sourceEntityId: string
  targetEntityId: string
  forwardLabel: string
  reverseLabel: string
}

/**
 * Get the correct label for a relation from a specific entity's perspective.
 */
export function getRelationLabel(relation: RelationLike, fromEntityId: string): string {
  if (fromEntityId === relation.targetEntityId) {
    return relation.reverseLabel
  }
  return relation.forwardLabel
}

// --- Validation ---

/**
 * Check if a relation type slug is valid (built-in).
 */
export function validateRelationType(slug: string): boolean {
  return VALID_SLUGS.has(slug)
}

// --- Attitude Color ---

/**
 * Map an attitude score (-100 to +100) to a color.
 * Negative = red, neutral = gray, positive = green.
 */
export function computeAttitudeColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return '#9ca3af' // gray

  // Clamp to -100..+100
  const clamped = Math.max(-100, Math.min(100, score))

  if (clamped === 0) return '#9ca3af' // gray

  if (clamped < 0) {
    // Red gradient: -100 = #ef4444, 0 = gray
    const t = Math.abs(clamped) / 100
    const r = Math.round(156 + t * (239 - 156))
    const g = Math.round(163 - t * (163 - 68))
    const b = Math.round(175 - t * (175 - 68))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  // Green gradient: 0 = gray, +100 = #22c55e
  const t = clamped / 100
  const r = Math.round(156 - t * (156 - 34))
  const g = Math.round(163 + t * (197 - 163))
  const b = Math.round(175 - t * (175 - 94))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
