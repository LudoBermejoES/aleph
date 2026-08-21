import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, join, sep } from 'path'
import { CAMPAIGN_THEMES } from '../../../app/utils/themes'

/**
 * Regression guard for "the diagram sidebar's entity names were invisible".
 *
 * Root cause: nothing in this app declares `color` on html or body — Tailwind's
 * preflight sets only `margin`/`line-height` there, and main.css only sets
 * `font-family`. `layouts/default.vue` compensates with `text-foreground` on its
 * root div, but the diagram page runs under `layouts/empty.vue`, which was a bare
 * `<div>`. So every element in that subtree without its own `text-*` token
 * inherited the UA default (black) while sitting on a themed `bg-background`.
 *
 * The same root cause reaches every *portalled* surface — a `<Teleport>` or a reka-ui
 * `*Portal` moves its subtree to `<body>`, i.e. outside the layout root div, so the layout's
 * `text-foreground` never applies to it. Dialogs, sheets and the Ctrl+K palette all landed
 * there with `bg-background` and no foreground token. Those are guarded below too.
 *
 * Two properties are locked down here:
 *   1. the structural one — every layout establishes a theme-aware text colour, every
 *      portalled surface pairs its background token with a foreground token, and no
 *      component reintroduces an unthemed literal surface;
 *   2. the numeric one — the tokens involved clear WCAG AA (4.5:1 for body text)
 *      in every theme in the registry, not just the one in the bug report.
 */

const root = resolve(__dirname, '../../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8')

function sourceFiles(dir: string, exts = ['.vue']): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full, exts))
    // POSIX separators: `join` yields backslashes on Windows, so the audited list — which is
    // written with forward slashes — never matched and this test failed on Windows only.
    else if (exts.some((e) => name.endsWith(e))) out.push(full.split(sep).join('/'))
  }
  return out
}

/**
 * Strip HTML/JS comments before asserting on class names. Without this, a comment
 * that merely *mentions* a token satisfies the assertion — these files document
 * why the tokens are there, so every assertion below would pass on a file whose
 * classes had been stripped.
 */
const stripComments = (source: string) =>
  source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

// ---------------------------------------------------------------------------
// 1. Structure
// ---------------------------------------------------------------------------

describe('every layout establishes a theme-aware text colour', () => {
  const layoutsDir = resolve(root, 'app/layouts')
  const layouts = readdirSync(layoutsDir).filter((f) => f.endsWith('.vue'))

  it('finds the layouts to check', () => {
    expect(layouts.length).toBeGreaterThanOrEqual(3)
  })

  for (const layout of layouts) {
    it(`${layout}: root element carries text-foreground`, () => {
      const source = stripComments(read(join('app/layouts', layout)))
      // The layout's subtree inherits `color` from here. Without a token the
      // browser default (black) leaks through onto themed dark backgrounds.
      expect(
        source,
        `app/layouts/${layout} does not apply text-foreground. Any element it wraps ` +
          `that has no text-* token of its own will inherit the UA default black, ` +
          `which is invisible on the dark campaign themes (1.06-1.28:1).`,
      ).toContain('text-foreground')
    })
  }
})

describe('no component paints an unthemed literal surface', () => {
  const vueFiles = (dir: string) => sourceFiles(dir)

  it('no opaque literal-colour surface class anywhere under app/', () => {
    // A literal-white surface combined with the themed foreground tokens used
    // inside it is unreadable by construction: EntityPopover's own
    // `text-muted-foreground` summary sat at 2.32:1 under mage-ascension.
    // Use the bg-*/text-*-foreground token pairs instead. Slash-suffixed
    // variants are deliberate translucent scrims, not text surfaces.
    const offenders = vueFiles(resolve(root, 'app'))
      .filter((f) => /\bbg-(white|black)\b(?!\/)/.test(stripComments(readFileSync(f, 'utf-8'))))
      .map((f) => f.slice(root.length + 1))
    expect(offenders).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 1b. Portalled surfaces — the layout's text colour cannot reach them
// ---------------------------------------------------------------------------

/**
 * Every file under app/ that moves a subtree out of the layout root — a Vue `<Teleport>`
 * or a reka-ui `*Portal` — mapped to the token pairs its own surface classes must carry.
 * `[]` means the file portals but paints no surface itself, so there is nothing to pair
 * here (the pair, if any, is asserted separately).
 *
 * The list is checked for completeness against the filesystem below: a NEW portalled
 * component fails that check, which is the point. Discovering it late is how DialogContent
 * kept `bg-background` alone through twelve themes.
 */
const PORTALLED: Record<string, string[]> = {
  'app/components/ui/dialog/DialogContent.vue': ['bg-background text-foreground'],
  'app/components/ui/dialog/DialogScrollContent.vue': ['bg-background text-foreground'],
  'app/components/ui/sheet/SheetContent.vue': [],
  'app/components/ui/dropdown-menu/DropdownMenuContent.vue': [
    'bg-popover p-1 text-popover-foreground',
  ],
  'app/components/ui/dropdown-menu/index.ts': [],
  'app/components/SearchCommand.vue': ['bg-background text-foreground'],
  'app/components/ErrorToast.vue': ['bg-destructive text-destructive-foreground'],
}

describe('every portalled surface pairs its background with a foreground token', () => {
  it('the audited list still matches what actually portals under app/', () => {
    const found = sourceFiles(resolve(root, 'app'), ['.vue', '.ts'])
      .filter((f) => /<Teleport|\b\w*Portal\b/.test(stripComments(readFileSync(f, 'utf-8'))))
      .map((f) => f.slice(root.length + 1))
      .sort()
    expect(
      found,
      'A file portals out of the layout root but is not in PORTALLED. Add it, and give it ' +
        'a bg/text token pair — the layout root div is the only place this app declares ' +
        '`color`, so a portalled subtree inherits the UA default black instead.',
    ).toEqual(Object.keys(PORTALLED).sort())
  })

  for (const [file, pairs] of Object.entries(PORTALLED)) {
    for (const pair of pairs) {
      it(`${file}: carries '${pair}'`, () => {
        expect(stripComments(read(file))).toContain(pair)
      })
    }
  }

  it('sheetVariants pairs bg-background with text-foreground', () => {
    // SheetContent's surface lives in the cva base, not the component.
    expect(stripComments(read('app/components/ui/sheet/index.ts'))).toContain(
      'bg-background text-foreground',
    )
  })

  it('no caller swaps a portalled background without swapping the foreground', () => {
    // `cn`/tailwind-merge keeps only the caller's token per pair, so overriding
    // `bg-background` alone strands the base `text-foreground` on a surface it was not
    // measured against: `--foreground` on `--sidebar-background` is 1.22-1.33:1 in the
    // three light themes, so the mobile sidebar sheet would have broken the other way.
    const offenders: string[] = []
    for (const f of sourceFiles(resolve(root, 'app'))) {
      const source = stripComments(readFileSync(f, 'utf-8'))
      for (const tag of source.matchAll(
        /<(?:SheetContent|DialogContent|DialogScrollContent)\b[\s\S]*?>/g,
      )) {
        const attr = tag[0].match(/\bclass="([^"]*)"/)
        if (!attr) continue
        if (/\bbg-[\w-]+/.test(attr[1]!) && !/\btext-[\w-]*foreground\b/.test(attr[1]!)) {
          offenders.push(`${f.slice(root.length + 1)}: class="${attr[1]}"`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('diagram entity sidebar colour tokens', () => {
  const group = stripComments(read('app/components/diagrams/EntityGroup.vue'))
  const popover = stripComments(read('app/components/diagrams/EntityPopover.vue'))

  it('the entity name carries text-foreground, not bare inheritance', () => {
    const line = group.split('\n').find((l) => l.includes('entity.name }}'))
    expect(line).toBeDefined()
    expect(line).toContain('text-foreground')
  })

  it('the group heading stays muted, so names read brighter than metadata', () => {
    // An entity name is primary content and the label above it is metadata:
    // body text SHOULD outrank the heading. This asserts the heading was not
    // "fixed" by promoting it too.
    expect(group).toContain('text-xs font-semibold text-muted-foreground uppercase')
  })

  it('the popover uses the popover token pair', () => {
    expect(popover).toContain('bg-popover text-popover-foreground')
    expect(popover).not.toContain('bg-white')
  })
})

// ---------------------------------------------------------------------------
// 2. Contrast, computed rather than eyeballed
// ---------------------------------------------------------------------------

const mainCss = read('app/assets/css/main.css')

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0) * 255, f(8) * 255, f(4) * 255]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }) as [number, number, number]
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (hi + 0.05) / (lo + 0.05)
}

/** Parse a shadcn `H S% L%` triplet into RGB. */
function triplet(value: string): [number, number, number] {
  const m = value.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  if (!m) throw new Error(`not an HSL triplet: '${value}'`)
  return hslToRgb(parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!))
}

/**
 * The token block for a theme in main.css. `default` is rendered by the ABSENCE
 * of a data-theme attribute, so its tokens live in `:root`.
 */
function tokensFor(theme: string): Record<string, string> {
  const marker = theme === 'default' ? ':root {' : `[data-theme='${theme}'] {`
  const start = mainCss.indexOf(marker)
  if (start === -1) {
    throw new Error(
      `Theme '${theme}' is in CAMPAIGN_THEMES but has no ${marker} block in app/assets/css/main.css.`,
    )
  }
  const block = mainCss.slice(start, mainCss.indexOf('\n}', start))
  const tokens: Record<string, string> = {}
  for (const decl of block.split(';')) {
    const m = decl.match(/(--[\w-]+):\s*([^;]+)/)
    if (m) tokens[m[1]!] = m[2]!.trim()
  }
  return tokens
}

const AA_BODY = 4.5
const BLACK: [number, number, number] = [0, 0, 0]

// Derived from the registry, never hand-written: a theme added to
// CAMPAIGN_THEMES is contrast-checked without anyone editing this file.
const THEMES = CAMPAIGN_THEMES.map((t) => t.id)

describe('sidebar body text clears WCAG AA in every registered theme', () => {
  it('checks the whole registry', () => {
    expect(THEMES.length).toBe(CAMPAIGN_THEMES.length)
    expect(THEMES).toContain('default')
  })

  for (const theme of THEMES) {
    it(`${theme}: --foreground on --background >= ${AA_BODY}:1`, () => {
      const t = tokensFor(theme)
      const ratio = contrast(triplet(t['--foreground']!), triplet(t['--background']!))
      expect(
        ratio,
        `${theme}: entity names would be ${ratio.toFixed(2)}:1 on the panel`,
      ).toBeGreaterThanOrEqual(AA_BODY)
    })

    it(`${theme}: --popover-foreground on --popover >= ${AA_BODY}:1`, () => {
      const t = tokensFor(theme)
      const ratio = contrast(triplet(t['--popover-foreground']!), triplet(t['--popover']!))
      expect(
        ratio,
        `${theme}: popover body text would be ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_BODY)
    })

    it(`${theme}: --sidebar-foreground on --sidebar-background >= ${AA_BODY}:1`, () => {
      // The pair layouts/default.vue hands the mobile navigation sheet.
      const t = tokensFor(theme)
      const ratio = contrast(
        triplet(t['--sidebar-foreground']!),
        triplet(t['--sidebar-background']!),
      )
      expect(
        ratio,
        `${theme}: mobile sidebar sheet text would be ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(AA_BODY)
    })
  }
})

describe('a portalled background override must bring its own foreground', () => {
  // Why layouts/default.vue passes `text-sidebar-foreground` rather than leaning on
  // sheetVariants' `text-foreground`: on the sidebar surface that token is the WRONG one,
  // and in the light themes it is as unreadable as the bug this all started from. Asserting
  // the failure keeps the pairing from being "simplified" away later.
  const wrongOnSidebar = THEMES.filter((theme) => {
    const t = tokensFor(theme)
    return contrast(triplet(t['--foreground']!), triplet(t['--sidebar-background']!)) < AA_BODY
  })

  it('--foreground fails AA on --sidebar-background in the light themes', () => {
    expect(wrongOnSidebar.length).toBeGreaterThanOrEqual(3)
    expect(wrongOnSidebar).toContain('high-fantasy')
  })

  for (const theme of wrongOnSidebar) {
    it(`${theme}: --sidebar-foreground beats --foreground on --sidebar-background`, () => {
      const t = tokensFor(theme)
      const bg = triplet(t['--sidebar-background']!)
      expect(contrast(triplet(t['--sidebar-foreground']!), bg)).toBeGreaterThan(
        contrast(triplet(t['--foreground']!), bg),
      )
    })
  }
})

describe('the bug the fix removes', () => {
  // Proves the defect was real and theme-dependent rather than cosmetic: the
  // inherited UA black the sidebar used to render was below AA on most themes,
  // and BELOW the muted group heading it sat under — body text dimmer than its
  // own metadata, which is what made the panel look empty.
  const brokenOnDarkThemes = THEMES.filter((theme) => {
    const t = tokensFor(theme)
    return contrast(BLACK, triplet(t['--background']!)) < AA_BODY
  })

  it('inherited black failed AA on the majority of themes', () => {
    expect(brokenOnDarkThemes.length).toBeGreaterThanOrEqual(8)
    expect(brokenOnDarkThemes).toContain('mage-ascension')
  })

  for (const theme of brokenOnDarkThemes) {
    it(`${theme}: --foreground beats both inherited black and the muted heading`, () => {
      const t = tokensFor(theme)
      const bg = triplet(t['--background']!)
      const before = contrast(BLACK, bg)
      const after = contrast(triplet(t['--foreground']!), bg)
      const heading = contrast(triplet(t['--muted-foreground']!), bg)
      expect(after).toBeGreaterThan(before)
      expect(after).toBeGreaterThan(heading)
    })
  }
})
