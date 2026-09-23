import { describe, it, expect } from 'vitest'
import { flattenToPlainText, buildExcerpt } from '../../../shared/utils/text-excerpt'

describe('flattenToPlainText', () => {
  it('strips fenced code blocks entirely', () => {
    expect(flattenToPlainText('Before\n```js\nconst x = 1\n```\nAfter')).toBe('Before After')
  })

  it('keeps inline code text but drops the backticks', () => {
    expect(flattenToPlainText('Run `npm install` first')).toBe('Run npm install first')
  })

  it('drops images entirely, including alt text', () => {
    expect(flattenToPlainText('See ![a photo](https://x/y.png) here')).toBe('See here')
  })

  it("keeps a link's visible text, drops the URL", () => {
    expect(flattenToPlainText('Visit [the club](https://example.com/club) tonight')).toBe(
      'Visit the club tonight',
    )
  })

  it('strips literal HTML tags', () => {
    expect(flattenToPlainText('A <a href="/x">linked</a> name and <strong>bold</strong>')).toBe(
      'A linked name and bold',
    )
  })

  it('strips heading markers', () => {
    expect(flattenToPlainText('# Berghain\n\nA techno club.')).toBe('Berghain A techno club.')
  })

  it('strips blockquote markers', () => {
    expect(flattenToPlainText('> A quoted line\nNormal line')).toBe('A quoted line Normal line')
  })

  it('strips bullet-list markers', () => {
    expect(flattenToPlainText('- one\n- two\n* three')).toBe('one two three')
  })

  it('strips ordered-list markers', () => {
    expect(flattenToPlainText('1. first\n2) second')).toBe('first second')
  })

  it('strips horizontal rules', () => {
    expect(flattenToPlainText('Before\n---\nAfter')).toBe('Before After')
  })

  it('strips emphasis and strikethrough markers, keeping the text', () => {
    expect(flattenToPlainText('**bold** and *italic* and ~~gone~~')).toBe(
      'bold and italic and gone',
    )
  })

  it('collapses blank lines between paragraphs to a single space', () => {
    expect(flattenToPlainText('First paragraph.\n\n\nSecond paragraph.')).toBe(
      'First paragraph. Second paragraph.',
    )
  })

  it('returns an empty string for empty input', () => {
    expect(flattenToPlainText('')).toBe('')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(flattenToPlainText('   \n\n  ')).toBe('')
  })
})

describe('buildExcerpt', () => {
  it('leaves text shorter than the limit untouched', () => {
    expect(buildExcerpt('Short text.', 200)).toBe('Short text.')
  })

  it('truncates longer text at a word boundary and appends an ellipsis', () => {
    const long = 'word '.repeat(100).trim() // 499 chars of "word word word ..."
    const result = buildExcerpt(long, 50)
    expect(result.length).toBeLessThanOrEqual(51) // 50 + ellipsis char
    expect(result.endsWith('…')).toBe(true)
    // Never cuts a word in half: strip the ellipsis and every remaining token is "word".
    const withoutEllipsis = result.slice(0, -1).trim()
    expect(withoutEllipsis.split(' ').every((tok) => tok === 'word')).toBe(true)
  })

  it('flattens markdown before truncating', () => {
    const result = buildExcerpt('# Heading\n\nSome **bold** prose that follows.', 200)
    expect(result).toBe('Heading Some bold prose that follows.')
  })

  it('returns an empty string for empty input', () => {
    expect(buildExcerpt('', 200)).toBe('')
  })

  it('returns an empty string for whitespace/markdown-only input that flattens to nothing', () => {
    expect(buildExcerpt('   \n\n   ', 200)).toBe('')
  })

  it('uses the default max length when none is given', () => {
    const long = 'x'.repeat(500)
    const result = buildExcerpt(long)
    expect(result.length).toBeLessThanOrEqual(201)
  })
})

/**
 * Regression: the quests list printed `{{ q.description }}` raw inside a <p>, so a real quest
 * description rendered as a wall of text with literal `**` and every newline collapsed by HTML.
 * The sample below is the opening of «Las guardas de la capilla y la tercera planta» as stored
 * in the Berlín en tinieblas campaign -- blank-line paragraphs, bold spans and a bullet list,
 * which is the exact combination that broke, rather than a fixture clean enough to pass anyway.
 */
describe('buildExcerpt on a real quest description', () => {
  const QUEST_DESCRIPTION = [
    'El 20 de agosto, en el patio, cayó del cielo un periódico enrollado.',
    '',
    'Lo importante no fue el periódico. Fue que **un objeto entró en la capilla, atravesó sus',
    'protecciones sin provocar una sola fluctuación**. Nadie del grupo notó nada.',
    '',
    'De ahí salió la lista entera de lo que no habían pensado:',
    '- **Timon Sauerbeck sabe su dirección.**',
    '- El portal sigue sin sellar.',
  ].join('\n')

  it('leaves no markdown syntax for the browser to print literally', () => {
    const result = buildExcerpt(QUEST_DESCRIPTION, 240)
    expect(result).not.toContain('**')
    expect(result).not.toContain('\n')
    expect(result).not.toMatch(/^\s*-\s/m)
  })

  it('keeps the words, so the excerpt still reads as prose', () => {
    const result = buildExcerpt(QUEST_DESCRIPTION, 240)
    expect(result.startsWith('El 20 de agosto, en el patio, cayó del cielo')).toBe(true)
    expect(result).toContain('un objeto entró en la capilla')
  })

  it('truncates on a word boundary and marks the cut', () => {
    const result = buildExcerpt(QUEST_DESCRIPTION, 240)
    expect(result.length).toBeLessThanOrEqual(241)
    expect(result.endsWith('…')).toBe(true)

    // Not merely "it ends with an ellipsis": the last word before it must be a WHOLE word of
    // the source, which is what distinguishes a word-boundary cut from a mid-word slice that
    // also ends in an ellipsis.
    const lastWord = result.slice(0, -1).trimEnd().split(' ').pop() as string
    const flattened = flattenToPlainText(QUEST_DESCRIPTION)
    expect(flattened.split(' ')).toContain(lastWord)
  })
})
