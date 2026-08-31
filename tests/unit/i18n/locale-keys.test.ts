import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const en = JSON.parse(readFileSync(resolve(__dirname, '../../../i18n/locales/en.json'), 'utf-8'))
const es = JSON.parse(readFileSync(resolve(__dirname, '../../../i18n/locales/es.json'), 'utf-8'))

const newKeys = [
  ['common', 'campaign'],
  ['errors', 'pageNotFound'],
  ['errors', 'backToCampaigns'],
  ['auth', 'tagline'],
  ['editor', 'draftBanner'],
  ['editor', 'restoreDraft'],
  ['editor', 'discardDraft'],
  ['editor', 'toolbar', 'undo'],
  ['editor', 'toolbar', 'redo'],
  ['editor', 'toolbar', 'bold'],
  ['editor', 'toolbar', 'italic'],
  ['editor', 'toolbar', 'strikethrough'],
  ['editor', 'toolbar', 'inlineCode'],
  ['editor', 'toolbar', 'heading1'],
  ['editor', 'toolbar', 'heading2'],
  ['editor', 'toolbar', 'heading3'],
  ['editor', 'toolbar', 'bulletList'],
  ['editor', 'toolbar', 'orderedList'],
  ['editor', 'toolbar', 'taskList'],
  ['editor', 'toolbar', 'blockquote'],
  ['editor', 'toolbar', 'codeBlock'],
  ['editor', 'toolbar', 'horizontalRule'],
  ['editor', 'toolbar', 'insertLink'],
  ['editor', 'toolbar', 'insertTable'],
  ['editor', 'toolbar', 'insertImage'],
  ['sessions', 'xpAwards'],
  ['sessions', 'xpAddCharacter'],
  ['sessions', 'xpNoAwards'],
  ['sessions', 'xpUnknownCharacter'],
  // El control de ventana completa del visor de mapas (add-map-fullscreen-toggle). Tres
  // cadenas que un usuario lee en el propio mapa: si una se queda en un solo idioma, el botón
  // muestra la clave cruda.
  ['maps', 'expand'],
  ['maps', 'collapse'],
  ['maps', 'collapseHint'],
]

/**
 * Keys whose feature is gone. XP is awarded per CHARACTER now and never requires attendance
 * (add-per-character-session-xp, design decision 4), so this string has no caller left; keeping
 * it would invite a template to point at a rule the server no longer enforces.
 */
const removedKeys = [['sessions', 'xpRequiresAttendance']]

function getKey(obj: Record<string, unknown>, path: string[]): string | undefined {
  return path.reduce((acc, k) => acc?.[k], obj)
}

describe('i18n locale keys', () => {
  for (const path of newKeys) {
    const key = path.join('.')

    it(`en.json has non-empty key: ${key}`, () => {
      const value = getKey(en, path)
      expect(value, `en.json missing key: ${key}`).toBeDefined()
      expect(typeof value).toBe('string')
      expect((value as string).trim()).not.toBe('')
    })

    it(`es.json has non-empty key: ${key}`, () => {
      const value = getKey(es, path)
      expect(value, `es.json missing key: ${key}`).toBeDefined()
      expect(typeof value).toBe('string')
      expect((value as string).trim()).not.toBe('')
    })
  }

  for (const path of removedKeys) {
    const key = path.join('.')

    it(`en.json no longer defines: ${key}`, () => {
      expect(getKey(en, path), `en.json still defines removed key: ${key}`).toBeUndefined()
    })

    it(`es.json no longer defines: ${key}`, () => {
      expect(getKey(es, path), `es.json still defines removed key: ${key}`).toBeUndefined()
    })
  }
})
