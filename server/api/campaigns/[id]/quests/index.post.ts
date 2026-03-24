import { randomUUID } from 'crypto'
import { useDb } from '../../../../utils/db'
import { quests } from '../../../../db/schema/sessions'
import { hasMinRole } from '../../../../utils/permissions'
import { slugify, writeEntityFile, resolveEntityPath } from '../../../../services/content'
import { join } from 'path'
import type { CampaignRole } from '../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can create quests' })
  }

  const campaignId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const db = useDb()
  const campaign = event.context.campaign

  const id = randomUUID()
  const slug = slugify(body.name)
  const now = new Date()

  // Write quest .md file
  const contentDir = join(process.cwd(), campaign.contentDir)
  const logPath = resolveEntityPath(contentDir, 'quests', slug)
  const frontmatter = {
    type: 'quest',
    name: body.name,
    aliases: [] as string[],
    tags: body.tags || [],
    visibility: body.isSecret ? 'dm_only' as const : 'members' as const,
    fields: { status: body.status || 'active' },
  }
  await writeEntityFile(logPath, frontmatter, body.content || `# ${body.name}\n\nQuest details...`)

  db.insert(quests).values({
    id,
    campaignId,
    name: body.name,
    slug,
    description: body.description || null,
    status: body.status || 'active',
    parentQuestId: body.parentQuestId || null,
    entityId: body.entityId || null,
    isSecret: body.isSecret || false,
    assignedCharacterIdsJson: body.assignedCharacterIds ? JSON.stringify(body.assignedCharacterIds) : null,
    logFilePath: logPath,
    createdAt: now,
    updatedAt: now,
  }).run()

  return { id, slug, name: body.name, status: body.status || 'active' }
})
