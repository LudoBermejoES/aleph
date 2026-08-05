import { describe, it, expect } from 'vitest'
import {
  fitImageToAspectRatio,
  shouldSkipRefit,
  ASPECT_FIT_TARGET_LONG_EDGE,
} from '../../../app/components/diagrams/react/shapes/useImageAspectFit'

describe('fitImageToAspectRatio', () => {
  it('fits a 16:9 landscape image — width is the long edge', () => {
    const { w, h } = fitImageToAspectRatio(16 / 9, ASPECT_FIT_TARGET_LONG_EDGE, 28)
    expect(w).toBe(160)
    expect(h).toBe(Math.round(160 / (16 / 9)) + 28)
    expect(w / (h - 28)).toBeCloseTo(16 / 9, 1)
  })

  it('fits a 2:3 portrait image — height is the long edge', () => {
    const { w, h } = fitImageToAspectRatio(2 / 3, ASPECT_FIT_TARGET_LONG_EDGE, 28)
    expect(h).toBe(160 + 28)
    expect(w).toBe(Math.round(160 * (2 / 3)))
    expect(w / (h - 28)).toBeCloseTo(2 / 3, 1)
  })

  it('fits a square (1:1) image — width and height (minus chrome) are equal', () => {
    const { w, h } = fitImageToAspectRatio(1, ASPECT_FIT_TARGET_LONG_EDGE, 28)
    expect(w).toBe(160)
    expect(h - 28).toBe(160)
  })

  it('adds chromeHeight on top of the fitted image area, not into it', () => {
    const withoutChrome = fitImageToAspectRatio(16 / 9, 160, 0)
    const withChrome = fitImageToAspectRatio(16 / 9, 160, 40)
    expect(withChrome.w).toBe(withoutChrome.w)
    expect(withChrome.h).toBe(withoutChrome.h + 40)
  })
})

describe('shouldSkipRefit', () => {
  it('does not skip when there is no stored aspect ratio yet (first load)', () => {
    expect(shouldSkipRefit(undefined, 16 / 9)).toBe(false)
  })

  it('skips when the stored ratio matches the freshly loaded ratio', () => {
    expect(shouldSkipRefit(16 / 9, 16 / 9)).toBe(true)
  })

  it('does not skip when the image changed to a different ratio', () => {
    expect(shouldSkipRefit(16 / 9, 2 / 3)).toBe(false)
  })

  it('tolerates tiny floating-point differences within epsilon', () => {
    expect(shouldSkipRefit(1.7777777, 16 / 9)).toBe(true)
  })
})
