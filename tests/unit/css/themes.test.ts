import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { CAMPAIGN_THEMES } from '../../../app/utils/themes'

const css = readFileSync(resolve(__dirname, '../../../app/assets/css/themes.css'), 'utf-8')
const mainCss = readFileSync(resolve(__dirname, '../../../app/assets/css/main.css'), 'utf-8')

// The theme list is DERIVED from the registry, never hand-written here. A theme
// added to CAMPAIGN_THEMES without its CSS blocks must fail this file, and no
// developer should ever have to update a list of slugs in a test to make that so.
// `default` is excluded on purpose: it is rendered by the ABSENCE of a
// data-theme attribute and intentionally has no [data-theme='default'] block.
const THEMES = CAMPAIGN_THEMES.map((t) => t.id).filter((id) => id !== 'default')

// Mandatory --theme-* tokens, per immersive-campaign-themes:
//   Theme typography tokens            -> the first five
//   SVG background texture per theme    -> --theme-bg-pattern
//   Card and heading decoration tokens  -> the last three
const REQUIRED_THEME_TOKENS = [
  '--theme-font-heading',
  '--theme-font-body',
  '--theme-font-weight-heading',
  '--theme-letter-spacing',
  '--theme-text-transform',
  '--theme-bg-pattern',
  '--theme-card-shadow',
  '--theme-card-border',
  '--theme-heading-decoration',
]

// Colour tokens campaign-themes -> Built-in RPG themes makes mandatory. These
// live in main.css, which no test read at all before this one.
const REQUIRED_COLOR_TOKENS = ['--background', '--foreground', '--primary', '--accent', '--border']

// --theme-heading-color is OPT-IN, not mandatory: a theme either colours its
// headings or leaves the wiring rule to fall back to `inherit`. This allowlist is
// the opt-in set, not a mirror of the catalogue — adding a theme needs no edit
// here, and only deliberately opting one in does.
const HEADING_COLOR_OPT_IN: Record<string, string> = {
  'mage-ascension': 'hsl(43 74% 55%)',
}

// Extract the token block for a theme: find the [data-theme='x'] { block that
// contains --theme-font-heading (there may be other [data-theme='x'] selectors
// in themes.css for shimmer pseudo-elements — we want the token block).
function blockIn(source: string, file: string, theme: string): string {
  const marker = `[data-theme='${theme}'] {`
  const start = source.indexOf(marker)
  if (start === -1) {
    throw new Error(
      `Theme '${theme}' is in CAMPAIGN_THEMES but has no ${marker} block in ${file}. ` +
        `Add one, or remove the theme from app/utils/themes.ts.`,
    )
  }
  const end = source.indexOf('\n}', start)
  return source.slice(start, end)
}

function themeBlock(theme: string): string {
  return blockIn(css, 'app/assets/css/themes.css', theme)
}

function mainBlock(theme: string): string {
  return blockIn(mainCss, 'app/assets/css/main.css', theme)
}

/** The declared value of `token` in `block`, or undefined if absent/empty. */
function declaredValue(block: string, token: string): string | undefined {
  const match = block.match(new RegExp(`${token}:\\s*([^;]+)`))
  const value = match?.[1]?.trim()
  return value ? value : undefined
}

describe('themes.css token parity with CAMPAIGN_THEMES', () => {
  it('derives its theme list from the registry', () => {
    // Guards the property itself: the registry has more than the floor of 10,
    // and `default` is the only exclusion.
    expect(THEMES.length).toBe(CAMPAIGN_THEMES.length - 1)
    expect(THEMES).not.toContain('default')
    expect(THEMES.length).toBeGreaterThanOrEqual(10)
  })

  for (const theme of THEMES) {
    it(`${theme}: defines all ${REQUIRED_THEME_TOKENS.length} mandatory --theme-* tokens`, () => {
      const block = themeBlock(theme)
      const missing = REQUIRED_THEME_TOKENS.filter((token) => !declaredValue(block, token))
      expect(
        missing,
        `Theme '${theme}' is missing non-empty ${missing.join(', ')} in its ` +
          `[data-theme='${theme}'] block in app/assets/css/themes.css`,
      ).toEqual([])
    })
  }
})

describe('main.css colour-token parity with CAMPAIGN_THEMES', () => {
  for (const theme of THEMES) {
    it(`${theme}: defines all ${REQUIRED_COLOR_TOKENS.length} mandatory colour tokens`, () => {
      const block = mainBlock(theme)
      const missing = REQUIRED_COLOR_TOKENS.filter((token) => !declaredValue(block, token))
      expect(
        missing,
        `Theme '${theme}' is missing non-empty ${missing.join(', ')} in its ` +
          `[data-theme='${theme}'] block in app/assets/css/main.css`,
      ).toEqual([])
    })
  }
})

describe('--theme-heading-color is opt-in, not mandatory', () => {
  it('the opt-in set is a subset of the registry', () => {
    for (const theme of Object.keys(HEADING_COLOR_OPT_IN)) {
      expect(
        THEMES,
        `'${theme}' opts in to --theme-heading-color but is not in CAMPAIGN_THEMES`,
      ).toContain(theme)
    }
  })

  it('is not one of the mandatory token sets', () => {
    expect(REQUIRED_THEME_TOKENS).not.toContain('--theme-heading-color')
    expect(REQUIRED_COLOR_TOKENS).not.toContain('--theme-heading-color')
  })

  for (const theme of THEMES) {
    const expected = HEADING_COLOR_OPT_IN[theme]

    if (expected) {
      it(`${theme}: opts in and declares --theme-heading-color: ${expected}`, () => {
        expect(
          declaredValue(themeBlock(theme), '--theme-heading-color'),
          `Theme '${theme}' opts in to --theme-heading-color but does not declare it in ` +
            `app/assets/css/themes.css`,
        ).toBe(expected)
      })
    } else {
      it(`${theme}: does not define --theme-heading-color`, () => {
        // Asserting the non-opted-in themes DON'T define it is the guard that the
        // mechanism stays inert for them — the wiring rule falls back to `inherit`.
        expect(
          declaredValue(themeBlock(theme), '--theme-heading-color'),
          `Theme '${theme}' declares --theme-heading-color but is not in the opt-in set. ` +
            `Add it to HEADING_COLOR_OPT_IN if the colour is intentional.`,
        ).toBeUndefined()
      })
    }
  }
})

describe('themes.css global wiring', () => {
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
