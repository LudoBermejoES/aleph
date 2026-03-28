import { isNotNull, eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { maps } from '../../db/schema/maps'
import { campaigns } from '../../db/schema/campaigns'
import { generateTiles } from '../../services/tiling'
import { logger } from '../../utils/logger'
import { stat } from 'fs/promises'
import { join } from 'path'

export default defineTask({
  meta: {
    name: 'maps:retile-all',
    description: 'Re-generate tiles for all maps using the aspect-ratio-safe tiling algorithm',
  },
  async run() {
    const db = useDb()

    const allMaps = db.select({
      id: maps.id,
      slug: maps.slug,
      campaignId: maps.campaignId,
    }).from(maps).where(isNotNull(maps.imagePath)).all()

    const allCampaigns = db.select({
      id: campaigns.id,
      contentDir: campaigns.contentDir,
    }).from(campaigns).all()

    const campaignDirMap = new Map(allCampaigns.map(c => [c.id, c.contentDir]))

    let success = 0
    let skipped = 0

    for (const map of allMaps) {
      const contentDir = campaignDirMap.get(map.campaignId)
      if (!contentDir) {
        logger.warn('maps:retile-all: campaign not found, skipping', { mapId: map.id })
        skipped++
        continue
      }

      const mapDir = join(process.cwd(), contentDir, 'maps', map.slug)
      // Try common extensions
      let imagePath: string | null = null
      for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
        const candidate = join(mapDir, `original${ext}`)
        try {
          await stat(candidate)
          imagePath = candidate
          break
        } catch { /* not found */ }
      }

      if (!imagePath) {
        logger.warn('maps:retile-all: original image not found, skipping', { mapId: map.id, mapDir })
        skipped++
        continue
      }

      try {
        const tilesDir = join(mapDir, 'tiles')
        const result = await generateTiles(imagePath, tilesDir)
        db.update(maps).set({ isTiled: true, updatedAt: new Date() }).where(eq(maps.id, map.id)).run()
        logger.info('maps:retile-all: tiled', { mapId: map.id, levels: result.levels, tileCount: result.tileCount })
        success++
      } catch (err) {
        logger.error('maps:retile-all: tiling failed', { mapId: map.id, error: err })
        skipped++
      }
    }

    logger.info('maps:retile-all: complete', { total: allMaps.length, success, skipped })

    return { result: 'success', total: allMaps.length, success, skipped }
  },
})
