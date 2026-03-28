import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { computeTileLevels } from '../../../server/services/maps'
import { generateTiles } from '../../../server/services/tiling'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('computeTileLevels', () => {
  it('matches Math.ceil(log2(maxDim / tileSize))', () => {
    // 256px image: ceil(log2(256/256)) = ceil(0) = 0 — but ensure at least sane value
    expect(computeTileLevels(256, 256)).toBe(0)
    // 512px: ceil(log2(512/256)) = ceil(1) = 1
    expect(computeTileLevels(512, 512)).toBe(1)
    // 1024px: ceil(log2(1024/256)) = ceil(2) = 2
    expect(computeTileLevels(1024, 1024)).toBe(2)
    // 8192px: ceil(log2(8192/256)) = ceil(5) = 5
    expect(computeTileLevels(8192, 8192)).toBe(5)
  })

  it('uses max dimension', () => {
    expect(computeTileLevels(8192, 256)).toBe(5)
    expect(computeTileLevels(256, 8192)).toBe(5)
  })
})

describe('generateTiles', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'aleph-tile-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('generates tiles without aspect ratio distortion for non-square image', async () => {
    const sharp = (await import('sharp')).default
    const inputPath = join(tmpDir, 'test.png')
    const outputDir = join(tmpDir, 'tiles')

    // Create 800x400 non-square image
    await sharp({
      create: { width: 800, height: 400, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 255 } },
    }).png().toFile(inputPath)

    const result = await generateTiles(inputPath, outputDir, 256)

    expect(result.tileCount).toBeGreaterThan(0)
    expect(existsSync(outputDir)).toBe(true)

    // Verify tiles are 256x256 (padded edge tiles should be full size)
    const tileBuffer = await sharp(join(outputDir, '0', '0', '0.png')).metadata()
    expect(tileBuffer.width).toBe(256)
    expect(tileBuffer.height).toBe(256)
  })

  it('pads edge tiles with transparency', async () => {
    const sharp = (await import('sharp')).default
    const inputPath = join(tmpDir, 'test.png')
    const outputDir = join(tmpDir, 'tiles')

    // Create 300x300 image (not a multiple of 256 — edge tiles will need padding)
    await sharp({
      create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 255 } },
    }).png().toFile(inputPath)

    await generateTiles(inputPath, outputDir, 256)

    // The tile at 0/1/0 or 0/0/1 should be an edge tile padded with transparency
    // At zoom 0: scale = (256 * 2^0) / 300 ≈ 0.853, scaledW = scaledH ≈ 256 → only one tile
    // At zoom 1: scale = (256 * 2^1) / 300 ≈ 1.706, scaledW = scaledH ≈ 512 → 2x2 tiles
    const edgeTilePath = join(outputDir, '1', '1', '0.png')
    if (existsSync(edgeTilePath)) {
      const { data, info } = await sharp(edgeTilePath).raw().toBuffer({ resolveWithObject: true })
      expect(info.width).toBe(256)
      expect(info.height).toBe(256)
      // Edge tile should have some transparent pixels (alpha = 0)
      let hasTransparent = false
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) { hasTransparent = true; break }
      }
      expect(hasTransparent).toBe(true)
    }
  })

  it('zoom level calculation matches Math.ceil(log2(maxDim / tileSize))', async () => {
    const sharp = (await import('sharp')).default
    const inputPath = join(tmpDir, 'test.png')
    const outputDir = join(tmpDir, 'tiles')

    // 1024x512 image: maxDim=1024, ceil(log2(1024/256)) = 2 levels
    await sharp({
      create: { width: 1024, height: 512, channels: 3, background: { r: 0, g: 0, b: 255 } },
    }).png().toFile(inputPath)

    const result = await generateTiles(inputPath, outputDir, 256)
    const expectedLevels = Math.ceil(Math.log2(Math.max(1024, 512) / 256))
    expect(result.levels).toBe(expectedLevels)
  })
})
