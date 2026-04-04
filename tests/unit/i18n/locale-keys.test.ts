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
]

function getKey(obj: Record<string, any>, path: string[]): string | undefined {
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
})
