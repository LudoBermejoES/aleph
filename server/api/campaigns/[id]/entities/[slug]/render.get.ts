import { readEntityFile } from '../../../../../services/content'
import { remarkStripSecrets } from '../../../../../services/remark-strip-secrets'
import { unified } from 'unified'
import remarkParse from 'remark'
import remarkDirective from 'remark-directive'
import remarkStringify from 'remark-stringify'
import type { CampaignRole } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const entityId = getRouterParam(event, 'slug')!
  const campaignRole = (event.context.campaignRole || 'visitor') as CampaignRole
  const userId = event.context.user?.name

  // TODO: look up entity file path from entities table (wiki-core change)
  // For now, return a placeholder
  throw createError({ statusCode: 501, message: 'Entity rendering requires wiki-core implementation' })
})
