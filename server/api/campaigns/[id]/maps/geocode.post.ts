import { z } from 'zod'
import { hasMinRole } from '../../../../utils/permissions'
import type { CampaignRole } from '../../../../utils/permissions'
import { validateBody } from '../../../../utils/validate'
import { geocodeAddress } from '../../../../services/geocoding'

/**
 * Server-side geocoding for the initial view of an 'osm' map (design.md D3). Never called
 * per-keystroke by the client -- the client is responsible for debouncing/explicit search;
 * this endpoint itself throttles/caches outbound calls to Nominatim regardless.
 */
export default defineEventHandler(async (event) => {
  const role = event.context.campaignRole as CampaignRole
  if (!hasMinRole(role, 'editor')) {
    throw createError({ statusCode: 403, message: 'Editors or above can geocode addresses' })
  }

  const body = await validateBody(event, z.object({ query: z.string().min(1) }))

  try {
    const candidates = await geocodeAddress(body.query)
    return { candidates }
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    throw createError({
      statusCode: 502,
      message:
        'Geocoding failed. You can still create or edit the map with coordinates entered directly.',
    })
  }
})
