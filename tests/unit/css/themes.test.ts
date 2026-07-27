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

  // --theme-heading-color is opt-in: only mage-ascension colours its headings.
  // Asserting the other themes DON'T define it is the guard that the mechanism
  // stays inert for them — the wiring rule falls back to `inherit`.
  it('mage-ascension: defines --theme-heading-color', () => {
    const match = themeBlock('mage-ascension').match(/--theme-heading-color:\s*([^;]+)/)
    expect(match?.[1]?.trim()).toBe('hsl(43 74% 55%)')
  })

  for (const theme of THEMES.filter((t) => t !== 'mage-ascension')) {
    it(`${theme}: does not define --theme-heading-color`, () => {
      expect(themeBlock(theme)).not.toContain('--theme-heading-color')
    })
  }

  it('the heading-colour wiring falls back to inherit and stays at element weight', () => {
    // :where()/:is() keep the rule at 0-0-1 so per-heading utility classes
    // (text-destructive, text-muted-foreground) still win in every theme.
    expect(css).toContain(':where([data-theme]) :is(h1, h2, h3) {')
    expect(css).toContain(':where([data-theme]) .prose :is(h1, h2, h3) {')
    // MDC heading anchors carry the visible glyphs; their fallback must repeat
    // `.prose a`'s own colour so themes without the token are unchanged.
    expect(css).toContain(':where([data-theme]) .prose :is(h1, h2, h3) a {')
    const decls = css.match(/color: var\(--theme-heading-color, [^;]+\);/g) ?? []
    expect(decls).toEqual([
      'color: var(--theme-heading-color, inherit);',
      'color: var(--theme-heading-color, inherit);',
      'color: var(--theme-heading-color, hsl(var(--primary)));',
    ])
    // The shared typography rule must not colour headings at 0-1-1.
    const shared = css.slice(css.indexOf('[data-theme] h1,'), css.indexOf('[data-theme] body,'))
    expect(shared.slice(0, shared.indexOf('}'))).not.toContain('color:')
  })

  it('all animation applications are inside prefers-reduced-motion', () => {
    // The animation property on headings must only appear inside the media query
    const outsideMedia = css
      .split('@media (prefers-reduced-motion: no-preference)')[0]
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(outsideMedia).not.toMatch(/animation:\s*theme-/)
  })
})
