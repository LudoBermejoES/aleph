import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const css = readFileSync(resolve(__dirname, '../../../app/assets/css/themes.css'), 'utf-8')

const THEMES = [
  'dark-fantasy',
  'cyberpunk',
  'cosmic-horror',
  'high-fantasy',
  'western',
  'steampunk',
  'eldritch',
  'fey-wilds',
  'undead',
  'superhero',
  'mage-ascension',
]

// Extract the token block for a theme: find the [data-theme='x'] { block that
// contains --theme-font-heading (there may be other [data-theme='x'] selectors
// in themes.css for shimmer pseudo-elements — we want the token block).
function themeBlock(theme: string): string {
  const marker = `[data-theme='${theme}'] {`
  const start = css.indexOf(marker)
  if (start === -1) throw new Error(`No token block found for theme: ${theme}`)
  const end = css.indexOf('\n}', start)
  return css.slice(start, end)
}

describe('themes.css', () => {
  for (const theme of THEMES) {
    it(`${theme}: defines --theme-font-heading`, () => {
      const block = themeBlock(theme)
      expect(block).toContain('--theme-font-heading')
      const match = block.match(/--theme-font-heading:\s*([^;]+)/)
      expect(match?.[1]?.trim()).toBeTruthy()
    })

    it(`${theme}: defines --theme-font-body`, () => {
      expect(themeBlock(theme)).toContain('--theme-font-body')
    })

    it(`${theme}: defines --theme-bg-pattern`, () => {
      expect(themeBlock(theme)).toContain('--theme-bg-pattern')
    })

    it(`${theme}: defines --theme-heading-decoration`, () => {
      expect(themeBlock(theme)).toContain('--theme-heading-decoration')
    })
  }

  it('all animation applications are inside prefers-reduced-motion', () => {
    // The animation property on headings must only appear inside the media query
    const outsideMedia = css
      .split('@media (prefers-reduced-motion: no-preference)')[0]
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(outsideMedia).not.toMatch(/animation:\s*theme-/)
  })
})
