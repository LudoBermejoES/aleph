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
 * Preserves aspect ratio using fit:'contain' and transparent padding.
 * Zoom levels: Math.ceil(Math.log2(maxDim / tileSize))
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
  const levels = Math.ceil(Math.log2(maxDim / tileSize))

  let tileCount = 0

  for (let z = 0; z < levels; z++) {
    const scale = (tileSize * Math.pow(2, z)) / maxDim
    const scaledWidth = Math.ceil(width * scale)
    const scaledHeight = Math.ceil(height * scale)

    // Resize preserving aspect ratio, pad remainder with transparency
    const resizedBuffer = await sharp(inputPath)
      .resize(scaledWidth, scaledHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()

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

        // Extract tile; pad to full tileSize with transparency if edge tile
        const extracted = await sharp(resizedBuffer)
          .extract({ left, top, width: tileW, height: tileH })
          .extend({
            right: tileSize - tileW,
            bottom: tileSize - tileH,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer()

        await writeFile(join(tileDir, `${y}.png`), extracted)
        tileCount++
      }
    }
  }

  logger.debug('Tiles generated', { inputPath, outputDir, levels, tileCount })

  return { levels, tileCount, outputDir }
}
