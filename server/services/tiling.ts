import sharp from 'sharp'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '../utils/logger'

interface TileResult {
  levels: number
  tileCount: number
  outputDir: string
}

/**
 * Generate map tiles from a source image.
 * Creates a pyramid of 256x256 PNG tiles at multiple zoom levels.
 */
export async function generateTiles(
  inputPath: string,
  outputDir: string,
  tileSize: number = 256,
): Promise<TileResult> {
  const metadata = await sharp(inputPath).metadata()
  const width = metadata.width!
  const height = metadata.height!
  const maxDim = Math.max(width, height)
  const levels = Math.ceil(Math.log2(maxDim / tileSize)) + 1

  let tileCount = 0

  for (let z = 0; z < levels; z++) {
    const scale = Math.pow(2, z)
    const scaledWidth = Math.ceil(width / (maxDim / (tileSize * scale)))
    const scaledHeight = Math.ceil(height / (maxDim / (tileSize * scale)))

    // Resize image to this zoom level
    const resized = sharp(inputPath).resize(scaledWidth, scaledHeight, { fit: 'fill' })
    const buffer = await resized.raw().toBuffer({ resolveWithObject: true })

    const cols = Math.ceil(scaledWidth / tileSize)
    const rows = Math.ceil(scaledHeight / tileSize)

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const tileDir = join(outputDir, String(z), String(x))
        await mkdir(tileDir, { recursive: true })

        const left = x * tileSize
        const top = y * tileSize
        const tileW = Math.min(tileSize, scaledWidth - left)
        const tileH = Math.min(tileSize, scaledHeight - top)

        if (tileW <= 0 || tileH <= 0) continue

        const tile = await sharp(inputPath)
          .resize(scaledWidth, scaledHeight, { fit: 'fill' })
          .extract({ left, top, width: tileW, height: tileH })
          .png()
          .toBuffer()

        await writeFile(join(tileDir, `${y}.png`), tile)
        tileCount++
      }
    }
  }

  logger.debug('Tiles generated', { inputPath, outputDir, levels, tileCount })

  return { levels, tileCount, outputDir }
}
