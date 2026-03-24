import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { needsTiling, computeTileLevels } from '../../../server/services/maps'
import { generateTiles } from '../../../server/services/tiling'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('needsTiling', () => {
  it('returns false for small images', () => {
    expect(needsTiling(1024, 768)).toBe(false)
    expect(needsTiling(4096, 4096)).toBe(false)
  })

  it('returns true for images exceeding 4096 in either dimension', () => {
    expect(needsTiling(4097, 1000)).toBe(true)
    expect(needsTiling(1000, 4097)).toBe(true)
    expect(needsTiling(8192, 8192)).toBe(true)
  })
})

describe('computeTileLevels', () => {
  it('computes correct levels for standard sizes', () => {
    // 256px needs 1 level (256/256 = 1, log2(1) + 1 = 1)
    expect(computeTileLevels(256, 256)).toBe(1)
    // 512px needs 2 levels
    expect(computeTileLevels(512, 512)).toBe(2)
    // 8192px needs 6 levels
    expect(computeTileLevels(8192, 8192)).toBe(6)
  })

  it('uses max dimension', () => {
    expect(computeTileLevels(8192, 256)).toBe(6)
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

  it('generates tiles from a test image', async () => {
    // Create a small test image with sharp
    const sharp = (await import('sharp')).default
    const inputPath = join(tmpDir, 'test.png')
    const outputDir = join(tmpDir, 'tiles')

    // Create 512x512 red image
    await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toFile(inputPath)

    const result = await generateTiles(inputPath, outputDir, 256)

    expect(result.levels).toBeGreaterThanOrEqual(1)
    expect(result.tileCount).toBeGreaterThan(0)
    expect(existsSync(outputDir)).toBe(true)
    // Check that at least the base level tile exists
    expect(existsSync(join(outputDir, '0', '0', '0.png'))).toBe(true)
  })
})
