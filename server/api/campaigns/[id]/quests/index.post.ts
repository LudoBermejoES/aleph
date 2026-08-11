import { z } from 'zod'
import { randomUUID } from 'crypto'
import { useDb, useSqlite } from '../../../../utils/db'
import { validateBody } from '../../../../utils/validate'
import { quests } from '../../../../db/schema/sessions'
import { entities } from '../../../../db/schema/entities'
import { hasMinRole } from '../../../../utils/permissions'
import { writeEntityFile, resolveEntityPath } from '../../../../services/content'
import { ensureUniqueSlug } from '../../../../utils/content-helpers'
import { resolveSubCampaignIdForCreate } from '../../../../utils/sub-campaign'
import { indexEntity } from '../../../../services/search'
import { indexEntityEmbedding } from '../../../../services/embeddings'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create quests' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const questSchema = z.object({
    name: z.string().min(1),
    content: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['active', 'completed', 'failed', 'on_hold']).optional(),
    tags: z.array(z.string()).optional(),
    isSecret: z.boolean().optional(),
    parentQuestId: z.string().optional(),
    entityId: z.string().optional(),
    assignedCharacterIds: z.array(z.string()).optional(),
    subCampaignSlug: z.string().optional(),
  })
  const body = await validateBody(event, questSchema)
  const db = useDb()
  const campaign = event.context.campaign

  const subCampaignId = resolveSubCampaignIdForCreate(db, campaignId, body.subCampaignSlug)

  // Shared by both rows: quests.id doubles as entities.id (the same shared-id pattern
  // `organizations` already uses), and one campaign-wide unique slug backs both, so a quest
  // can never collide with another entity of any type.
  const id = randomUUID()
  const slug = ensureUniqueSlug(db, campaignId, body.name)
  const now = new Date()

  // Write quest .md file
  const contentDir = join(process.cwd(), campaign.contentDir)
  const logPath = resolveEntityPath(contentDir, 'quests', slug)
  const visibility = body.isSecret ? ('dm_only' as const) : ('members' as const)
  const frontmatter = {
    type: 'quest',
    name: body.name,
    aliases: [] as string[],
    tags: body.tags || [],
    visibility,
    fields: { status: body.status || 'active' },
  }
  const hash = await writeEntityFile(
    logPath,
    frontmatter,
    body.content || `# ${body.name}\n\nQuest details...`,
  )

  db.insert(entities)
    .values({
      id,
      campaignId,
      type: 'quest',
      name: body.name,
      slug,
      filePath: logPath,
      visibility,
      contentHash: hash,
      createdBy: event.context.user.id,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  db.insert(quests)
    .values({
      id,
      campaignId,
      subCampaignId,
      name: body.name,
      slug,
      description: body.description || null,
      status: body.status || 'active',
      parentQuestId: body.parentQuestId || null,
      entityId: body.entityId || null,
      isSecret: body.isSecret || false,
      assignedCharacterIdsJson: body.assignedCharacterIds
        ? JSON.stringify(body.assignedCharacterIds)
        : null,
      logFilePath: logPath,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const questContent = body.content || `# ${body.name}\n\nQuest details...`
  const sqlite = useSqlite()
  indexEntity(sqlite, id, campaignId, body.name, [], body.tags || [], questContent)
  await indexEntityEmbedding(sqlite, id, campaignId, body.name, questContent)

  return { id, slug, name: body.name, status: body.status || 'active' }
})
