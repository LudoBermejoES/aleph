import { describe, it, expect } from 'vitest'
import { stemSpanishWord, stemSpanishText } from '../../../server/services/spanish-stem'

/**
 * Snowball's Spanish algorithm, checked at the level that matters here: two forms of the
 * same lemma must land on the same stem. Absolute stems are asserted only where the value
 * is load-bearing (the postlude's accent removal, which is what keeps `Inés`/`Ines` working).
 */
describe('stemSpanishWord', () => {
  const SAME: Array<[string, string]> = [
    ['asesinar', 'asesinó'],
    ['asesina', 'asesino'],
    ['correr', 'corriendo'],
    ['desaparecer', 'desapareció'],
    ['investigar', 'investigando'],
    ['hablar', 'hablaron'],
    ['matar', 'mataron'],
    ['perdido', 'perdidas'],
    ['muerto', 'muertos'],
    ['anciana', 'ancianas'],
    ['vampiro', 'vampiros'],
    ['sacrificar', 'sacrificarán'],
    ['Ines', 'Inés'],
  ]
  it.each(SAME)('%s and %s share a stem', (a, b) => {
    expect(stemSpanishWord(a)).toBe(stemSpanishWord(b))
  })

  const DIFFERENT: Array<[string, string]> = [
    ['casa', 'castillo'],
    ['muerte', 'muralla'],
    ['sangre', 'sanidad'],
    ['perro', 'persona'],
  ]
  it.each(DIFFERENT)('%s and %s do not collapse together', (a, b) => {
    expect(stemSpanishWord(a)).not.toBe(stemSpanishWord(b))
  })

  it('removes acute accents last, which is what keeps the diacritic folding working', () => {
    expect(stemSpanishWord('Inés')).toBe('ines')
    expect(stemSpanishWord('José')).toBe(stemSpanishWord('Jose'))
    expect(stemSpanishWord('CADÁVER')).toBe('cadav')
  })

  it('leaves very short words alone', () => {
    for (const w of ['el', 'la', 'de', 'un', 'y', '']) {
      expect(stemSpanishWord(w)).toBe(w.toLowerCase())
    }
  })

  it('is idempotent enough not to keep eating a word it already stemmed', () => {
    for (const w of ['asesinar', 'corriendo', 'ciudades', 'nacionalidad']) {
      const once = stemSpanishWord(w)
      expect(stemSpanishWord(once).length).toBeGreaterThanOrEqual(Math.min(3, once.length))
    }
  })
})

describe('stemSpanishText', () => {
  it('keeps only stems that differ from the word they came from', () => {
    // `otto` is its own stem, so it contributes nothing: it is already in the text columns,
    // and repeating it would give the document a second helping of the same match.
    const stems = stemSpanishText('otto asesinó a las ancianas').split(' ').filter(Boolean)
    expect(stems).toContain('asesin')
    expect(stems).toContain('ancian')
    expect(stems).not.toContain('otto')
  })

  it('deduplicates', () => {
    const stems = stemSpanishText('mataron matar mataba matando').split(' ').filter(Boolean)
    expect(new Set(stems).size).toBe(stems.length)
    expect(stems).toContain('mat')
  })

  it('splits on punctuation and markdown, and keeps ñ and accents out of the way', () => {
    const stems = stemSpanishText('## El **Muñoz**: desapareció (¿o no?)')
    expect(stems).toContain('desaparec')
    expect(stems).not.toContain('**')
  })

  it('is empty for empty input', () => {
    expect(stemSpanishText('')).toBe('')
    expect(stemSpanishText('  ')).toBe('')
  })
})
