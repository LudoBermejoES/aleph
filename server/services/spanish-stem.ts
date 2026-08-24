/**
 * Snowball's Spanish stemmer, in TypeScript.
 *
 * FTS5 ships exactly one stemmer, `porter`, and it is English. The campaign is written in
 * Spanish, and `tokenize='porter unicode61'` is half-right in the worst way: plurals fall off
 * by luck (`muertos` -> `muerto`) and `unicode61` folds diacritics (`Inés` -> `ines`), so the
 * search returns results and nobody suspects, while Spanish inflection — the part that
 * matters in a campaign about disappearances — does not exist for it.
 *
 * There is no Spanish tokenizer to swap in: a custom FTS5 tokenizer is a C callback, which
 * `better-sqlite3` cannot register, and that is the same reason `search.ts` hand-rolled a
 * trigram table instead of loading `spellfix1`. So the stemming happens in JS, on both sides
 * of the query, and the result is indexed into a column of its own.
 *
 * Written out here rather than pulled from npm on purpose: it is ~200 lines of pure string
 * work with no dependencies of its own, and every deploy of this app runs `npm ci` and
 * rebuilds native modules on the server — a stemmer is not worth widening that surface.
 *
 * Reference: https://snowballstem.org/algorithms/spanish/stemmer.html
 * The step numbering and suffix lists below follow that page exactly; keep them in that
 * order, longest suffix first, because the algorithm is defined as "longest match wins".
 */

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü'])

const isVowel = (c: string): boolean => VOWELS.has(c)

interface Regions {
  /** R1: after the first non-vowel following a vowel. */
  r1: number
  /** R2: R1's own R1. */
  r2: number
  /** RV: the Romance-specific region the verb suffixes are measured against. */
  rv: number
}

function computeRegions(w: string): Regions {
  const n = w.length
  let r1 = n
  let r2 = n

  for (let i = 1; i < n; i++) {
    if (!isVowel(w[i]!) && isVowel(w[i - 1]!)) {
      r1 = i + 1
      break
    }
  }
  for (let i = r1 + 1; i < n; i++) {
    if (!isVowel(w[i]!) && isVowel(w[i - 1]!)) {
      r2 = i + 1
      break
    }
  }

  // RV, verbatim from the algorithm: if the second letter is a consonant, RV is the region
  // after the next following vowel; if the first two are both vowels, after the next
  // consonant; otherwise (consonant-vowel) after the third letter. End of word if not found.
  let rv = n
  if (n > 3) {
    if (!isVowel(w[1]!)) {
      for (let i = 2; i < n; i++) {
        if (isVowel(w[i]!)) {
          rv = i + 1
          break
        }
      }
    } else if (isVowel(w[0]!) && isVowel(w[1]!)) {
      for (let i = 2; i < n; i++) {
        if (!isVowel(w[i]!)) {
          rv = i + 1
          break
        }
      }
    } else {
      rv = 3
    }
  }

  return { r1, r2, rv }
}

/** The longest suffix in `list` that `w` ends with, or null. */
function longestSuffix(w: string, list: readonly string[]): string | null {
  let best: string | null = null
  for (const s of list) {
    if (w.endsWith(s) && (best === null || s.length > best.length)) best = s
  }
  return best
}

const inRegion = (w: string, suffix: string, region: number): boolean =>
  w.length - suffix.length >= region

// --- Step 0: attached pronouns ---------------------------------------------------------
const PRONOUNS = [
  'selas',
  'selos',
  'sela',
  'selo',
  'las',
  'les',
  'los',
  'nos',
  'me',
  'se',
  'la',
  'le',
  'lo',
] as const
/** (a) — deletion is followed by removing the acute accent. */
const PRONOUN_PRECEDING_ACCENTED = ['iéndo', 'ándo', 'ár', 'ér', 'ír'] as const
/** (b) and (c) — plain deletion. `yendo` only when preceded by `u`. */
const PRONOUN_PRECEDING_PLAIN = ['ando', 'iendo', 'ar', 'er', 'ir'] as const

function deaccent(w: string): string {
  return w
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
}

function step0(w: string, rv: number): string {
  const pronoun = longestSuffix(w, PRONOUNS)
  if (!pronoun || !inRegion(w, pronoun, rv)) return w
  const stem = w.slice(0, w.length - pronoun.length)

  const accented = longestSuffix(stem, PRONOUN_PRECEDING_ACCENTED)
  if (accented && inRegion(stem, accented, rv)) return deaccent(stem)

  const plain = longestSuffix(stem, PRONOUN_PRECEDING_PLAIN)
  if (plain && inRegion(stem, plain, rv)) return stem

  if (stem.endsWith('uyendo') && inRegion(stem, 'yendo', rv)) return stem

  return w
}

// --- Step 1: standard (derivational) suffixes ------------------------------------------
const S1_PLAIN = [
  'amientos',
  'imientos',
  'amiento',
  'imiento',
  'anzas',
  'anza',
  'icos',
  'icas',
  'ismos',
  'ables',
  'ibles',
  'istas',
  'osos',
  'osas',
  'ico',
  'ica',
  'ismo',
  'able',
  'ible',
  'ista',
  'oso',
  'osa',
] as const
const S1_IC = [
  'aciones',
  'adoras',
  'adores',
  'ancias',
  'antes',
  'ación',
  'adora',
  'ador',
  'ancia',
  'ante',
] as const
const S1_IVO = ['ivas', 'ivos', 'iva', 'ivo'] as const
const S1_IDAD = ['idades', 'idad'] as const

function step1(w: string, r: Regions): { word: string; removed: boolean } {
  const word = step1Inner(w, r)
  // "Do step 2a if no ending was removed by step 1" — a suffix that matched but fell
  // outside R2 removes nothing, so step 2 must still run. Comparing the strings is the
  // only honest way to answer that; a "did a suffix match" flag gets it wrong.
  return { word, removed: word !== w }
}

function step1Inner(w: string, r: Regions): string {
  const del = (s: string) => w.slice(0, w.length - s.length)

  let s = longestSuffix(w, S1_PLAIN)
  if (s) return inRegion(w, s, r.r2) ? del(s) : w

  s = longestSuffix(w, S1_IC)
  if (s) {
    let out = inRegion(w, s, r.r2) ? del(s) : w
    if (out !== w && out.endsWith('ic') && inRegion(out, 'ic', r.r2)) out = out.slice(0, -2)
    return out
  }

  s = longestSuffix(w, ['logías', 'logía'])
  if (s) return inRegion(w, s, r.r2) ? del(s) + 'log' : w

  s = longestSuffix(w, ['uciones', 'ución'])
  if (s) return inRegion(w, s, r.r2) ? del(s) + 'u' : w

  s = longestSuffix(w, ['encias', 'encia'])
  if (s) return inRegion(w, s, r.r2) ? del(s) + 'ente' : w

  if (w.endsWith('amente')) {
    let out = w
    if (inRegion(w, 'amente', r.r1)) out = del('amente')
    if (out.endsWith('iv') && inRegion(out, 'iv', r.r2)) {
      out = out.slice(0, -2)
      if (out.endsWith('at') && inRegion(out, 'at', r.r2)) out = out.slice(0, -2)
    } else if (
      (out.endsWith('os') || out.endsWith('ic') || out.endsWith('ad')) &&
      inRegion(out, 'os', r.r2)
    ) {
      out = out.slice(0, -2)
    }
    return out
  }

  if (w.endsWith('mente')) {
    let out = inRegion(w, 'mente', r.r2) ? del('mente') : w
    for (const t of ['ante', 'able', 'ible']) {
      if (out !== w && out.endsWith(t) && inRegion(out, t, r.r2)) {
        out = out.slice(0, -t.length)
        break
      }
    }
    return out
  }

  s = longestSuffix(w, S1_IDAD)
  if (s) {
    let out = inRegion(w, s, r.r2) ? del(s) : w
    for (const t of ['abil', 'ic', 'iv']) {
      if (out !== w && out.endsWith(t) && inRegion(out, t, r.r2)) {
        out = out.slice(0, -t.length)
        break
      }
    }
    return out
  }

  s = longestSuffix(w, S1_IVO)
  if (s) {
    let out = inRegion(w, s, r.r2) ? del(s) : w
    if (out !== w && out.endsWith('at') && inRegion(out, 'at', r.r2)) out = out.slice(0, -2)
    return out
  }

  return w
}

// --- Step 2a/2b: verb suffixes ----------------------------------------------------------
const S2A = [
  'yeron',
  'yendo',
  'yamos',
  'yais',
  'yan',
  'yen',
  'yas',
  'yes',
  'ya',
  'ye',
  'yo',
  'yó',
] as const

/** Longest-first is enforced by `longestSuffix`, so the order here is only for reading. */
const S2B_GU = ['emos', 'éis', 'en', 'es'] as const
const S2B_PLAIN = [
  'arían',
  'arías',
  'arán',
  'arás',
  'aríais',
  'aría',
  'aréis',
  'aríamos',
  'aremos',
  'ará',
  'aré',
  'erían',
  'erías',
  'erán',
  'erás',
  'eríais',
  'ería',
  'eréis',
  'eríamos',
  'eremos',
  'erá',
  'eré',
  'irían',
  'irías',
  'irán',
  'irás',
  'iríais',
  'iría',
  'iréis',
  'iríamos',
  'iremos',
  'irá',
  'iré',
  'aba',
  'ada',
  'ida',
  'ía',
  'ara',
  'iera',
  'ad',
  'ed',
  'id',
  'ase',
  'iese',
  'aste',
  'iste',
  'an',
  'aban',
  'ían',
  'aran',
  'ieran',
  'asen',
  'iesen',
  'aron',
  'ieron',
  'ado',
  'ido',
  'ando',
  'iendo',
  'ió',
  'ar',
  'er',
  'ir',
  'as',
  'abas',
  'adas',
  'idas',
  'ías',
  'aras',
  'ieras',
  'ases',
  'ieses',
  'ís',
  'áis',
  'abais',
  'íais',
  'arais',
  'ierais',
  'aseis',
  'ieseis',
  'asteis',
  'isteis',
  'ados',
  'idos',
  'amos',
  'ábamos',
  'íamos',
  'imos',
  'áramos',
  'iéramos',
  'iésemos',
  'ásemos',
] as const

function step2(w: string, r: Regions, step1Removed: boolean): string {
  if (step1Removed) return w

  const a = longestSuffix(w, S2A)
  if (a && inRegion(w, a, r.rv)) {
    const before = w.length - a.length
    if (before > 0 && w[before - 1] === 'u') return w.slice(0, before)
    return w
  }

  const b = longestSuffix(w, S2B_PLAIN)
  const g = longestSuffix(w, S2B_GU)
  // Longest match across both lists; the `gu` rule only fires for the S2B_GU members.
  const pick = !b ? g : !g ? b : g.length > b.length ? g : b
  if (!pick || !inRegion(w, pick, r.rv)) return w

  let out = w.slice(0, w.length - pick.length)
  if ((S2B_GU as readonly string[]).includes(pick) && out.endsWith('gu')) out = out.slice(0, -1)
  return out
}

// --- Step 3: residual suffix ------------------------------------------------------------
function step3(w: string, r: Regions): string {
  const s = longestSuffix(w, ['os', 'a', 'o', 'á', 'í', 'ó'])
  if (s && inRegion(w, s, r.rv)) return w.slice(0, w.length - s.length)

  const e = longestSuffix(w, ['e', 'é'])
  if (e && inRegion(w, e, r.rv)) {
    const out = w.slice(0, w.length - e.length)
    // `sigue` -> `sig`, not `sigu`: drop the silent u of a `gu` when the u itself is in RV.
    if (out.endsWith('gu') && inRegion(out, 'u', r.rv)) return out.slice(0, -1)
    return out
  }
  return w
}

/**
 * Stem one Spanish word. Input is lowercased first; the acute accents the algorithm needs
 * along the way are removed at the end (its "postlude"), which is also why `Inés` and `Ines`
 * come out identical — the diacritic folding that works today by accident is preserved here
 * on purpose.
 *
 * Words of 2 characters or fewer are returned unchanged: the algorithm's regions are not
 * defined for them and there is nothing to gain.
 */
export function stemSpanishWord(word: string): string {
  const lower = word.toLowerCase()
  if (lower.length <= 2) return deaccent(lower)

  const r = computeRegions(lower)
  let w = step0(lower, r.rv)
  const s1 = step1(w, r)
  w = step2(s1.word, r, s1.removed)
  w = step3(w, r)
  return deaccent(w)
}

/** Anything that is not a letter or digit separates words. Keeps `ñ` and accented vowels. */
const WORD_SPLIT = /[^\p{L}\p{N}]+/u

/**
 * Stem every word of `text`, keeping only the stems that DIFFER from the word they came
 * from. A stem equal to its surface form adds nothing: the surface form is already indexed
 * in `name`/`aliases`/`tags`/`body`, and re-indexing it would double a document's credit for
 * an ordinary match and quietly shift the ranking the proposal put out of scope.
 *
 * Duplicates are dropped for the same reason — the stem column is a reachability aid, not a
 * second copy of the text to be scored by term frequency.
 */
export function stemSpanishText(text: string): string {
  if (!text) return ''
  const out = new Set<string>()
  for (const raw of text.split(WORD_SPLIT)) {
    if (!raw || raw.length <= 2) continue
    const stem = stemSpanishWord(raw)
    if (stem && stem !== raw.toLowerCase()) out.add(stem)
  }
  return Array.from(out).join(' ')
}
