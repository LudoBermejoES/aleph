import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { useDb } from '../../../../../../utils/db'
import { validateBody } from '../../../../../../utils/validate'
import { entities } from '../../../../../../db/schema/entities'
import { characters } from '../../../../../../db/schema/characters'
import { entityRelations, relationTypes } from '../../../../../../db/schema/relations'
import {
  canonicalizeSymmetricPair,
  detectCycle,
  validateYearCoherence,
} from '../../../../../../services/genealogy'
import type { CampaignRole } from '../../../../../../utils/permissions'
import { hasMinRole } from '../../../../../../utils/permissions'

const bodySchema = z.object({
  type: z.enum(['parent', 'child', 'spouse', 'sibling']),
  targetCharacterSlug: z.string().min(1),
})

const SLUG_MAP = {
  parent: 'parent_of',
  child: 'parent_of',
  spouse: 'spouse_of',
  sibling: 'sibling_of',
} as const

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editor or above required' })
  }

  const userId = event.context.user.id
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const body = await validateBody(event, bodySchema)
  const db = useDb()

  // Resolve focus entity
  const focusEntity = db
    .select({ id: entities.id, type: entities.type, campaignId: entities.campaignId })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, slug)))
    .get()
  if (!focusEntity) throw createError({ statusCode: 404, message: 'Character not found' })
  if (focusEntity.type !== 'character')
    throw createError({ statusCode: 400, message: 'Source must be a character' })

  // Resolve target entity
  const targetEntity = db
    .select({ id: entities.id, type: entities.type, campaignId: entities.campaignId })
    .from(entities)
    .where(and(eq(entities.campaignId, campaignId), eq(entities.slug, body.targetCharacterSlug)))
    .get()
  if (!targetEntity) throw createError({ statusCode: 404, message: 'Target character not found' })
  if (targetEntity.campaignId !== campaignId)
    throw createError({ statusCode: 400, message: 'Cross-campaign links not allowed' })
  if (targetEntity.type !== 'character')
    throw createError({ statusCode: 400, message: 'Target must be a character' })

  // Self-link check
  if (focusEntity.id === targetEntity.id)
    throw createError({ statusCode: 400, message: 'Cannot link a character to itself' })

  const relSlug = SLUG_MAP[body.type]
  const symmetric = relSlug === 'spouse_of' || relSlug === 'sibling_of'

  // Determine source / target, normalizing 'child' type
  let sourceId = focusEntity.id
  let targetId = targetEntity.id
  if (body.type === 'child') {
    // focus is child, target is parent → swap so parent is source
    sourceId = targetEntity.id
    targetId = focusEntity.id
  }
  if (symmetric) {
    ;[sourceId, targetId] = canonicalizeSymmetricPair(sourceId, targetId)
  }

  // Resolve relation type id
  const relType = db
    .select({
      id: relationTypes.id,
      forwardLabel: relationTypes.forwardLabel,
      reverseLabel: relationTypes.reverseLabel,
    })
    .from(relationTypes)
    .where(and(eq(relationTypes.campaignId, campaignId), eq(relationTypes.slug, relSlug)))
    .get()
  if (!relType)
    throw createError({
      statusCode: 400,
      message: `Relation type '${relSlug}' not found for this campaign`,
    })

  // Duplicate check
  const existing = db
    .select({ id: entityRelations.id })
    .from(entityRelations)
    .where(
      and(
        eq(entityRelations.campaignId, campaignId),
        eq(entityRelations.relationTypeId, relType.id),
        symmetric
          ? and(
              eq(entityRelations.sourceEntityId, sourceId),
              eq(entityRelations.targetEntityId, targetId),
            )
          : and(
              eq(entityRelations.sourceEntityId, sourceId),
              eq(entityRelations.targetEntityId, targetId),
            ),
      ),
    )
    .get()
  if (existing) throw createError({ statusCode: 400, message: 'This family link already exists' })

  // Cycle check for parent_of
  if (relSlug === 'parent_of') {
    const hasCycle = await detectCycle(sourceId, targetId, db, campaignId)
    if (hasCycle)
      throw createError({
        statusCode: 400,
        message: 'Adding this link would create a cycle in the ancestry',
      })
  }

  // Year coherence warnings (soft)
  const warnings: string[] = []
  if (relSlug === 'parent_of') {
    const parentChar = db
      .select({ birthYear: characters.birthYear, deathYear: characters.deathYear })
      .from(characters)
      .where(eq(characters.entityId, sourceId))
      .get()
    const childChar = db
      .select({ birthYear: characters.birthYear })
      .from(characters)
      .where(eq(characters.entityId, targetId))
      .get()
    if (parentChar && childChar) {
      for (const w of validateYearCoherence(parentChar, childChar)) {
        warnings.push(w.message)
      }
    }
  }

  // Insert
  const now = new Date()
  const id = randomUUID()
  db.insert(entityRelations)
    .values({
      id,
      campaignId,
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      relationTypeId: relType.id,
      forwardLabel: relType.forwardLabel,
      reverseLabel: relType.reverseLabel,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return { id, warnings }
})
