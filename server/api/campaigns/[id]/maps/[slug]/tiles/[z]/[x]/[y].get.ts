import { useDb } from '../../../../../../../../utils/db'
import { getMapForRole } from '../../../../../../../../services/maps'
import type { CampaignRole } from '../../../../../../../../utils/permissions'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')!
  const slug = getRouterParam(event, 'slug')!
  const z = getRouterParam(event, 'z')!
  const x = getRouterParam(event, 'x')!
  const y = getRouterParam(event, 'y')!
  const role = (event.context.campaignRole || 'visitor') as CampaignRole
  const db = useDb()
  const campaign = event.context.campaign

  // design.md D3/Risks: this is the sharpest sub-resource -- without the parent-map check a
  // hidden map's imagery is fetchable by anyone who can guess a slug. `getMapForRole` resolves
  // the map ONCE per request, the same single query this route already ran before this change
  // (see openspec/changes/enforce-map-visibility) -- no query is added per tile, only the
  // in-memory visibility comparison already inside `getMapForRole`.
  const map = getMapForRole(db, campaignId, slug, role)
  if (!map) throw createError({ statusCode: 404, message: 'Map not found' })

  const tilePath = join(process.cwd(), campaign.contentDir, 'maps', slug, 'tiles', z, x, `${y}.png`)

  try {
    await stat(tilePath)
    const data = await readFile(tilePath)
    setResponseHeader(event, 'Content-Type', 'image/png')
    setResponseHeader(event, 'Cache-Control', 'public, max-age=604800')
    return data
  } catch {
    // Return transparent 256x256 PNG for missing tiles
    setResponseHeader(event, 'Content-Type', 'image/png')
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJRElEQkSuQmCC',
      'base64',
    )
  }
})
