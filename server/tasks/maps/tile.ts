import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { maps } from '../../db/schema/maps'
import { generateTiles } from '../../services/tiling'
import { logger } from '../../utils/logger'

export default defineTask({
  meta: {
    name: 'maps:tile',
    description: 'Generate tile pyramid for a map image',
  },
  async run({ payload }) {
    const { mapId, imagePath, outputDir } = payload as {
      mapId: string
      imagePath: string
      outputDir: string
    }

    logger.info('Tiling map', { mapId, imagePath, outputDir })

    const result = await generateTiles(imagePath, outputDir)

    const db = useDb()
    db.update(maps)
      .set({ isTiled: true, updatedAt: new Date() })
      .where(eq(maps.id, mapId))
      .run()

    logger.info('Tiling complete', { mapId, levels: result.levels, tileCount: result.tileCount })

    return { result: 'success', levels: result.levels, tileCount: result.tileCount }
  },
})
