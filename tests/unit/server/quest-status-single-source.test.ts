import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { QUEST_STATUSES } from '../../../shared/utils/quest-status'

/**
 * The defect this change fixed was not the wrong word — it was that the vocabulary was declared
 * TWICE and the copies could disagree in silence for months. Replacing `on_hold` with `abandoned`
 * in the zod enums would have fixed the symptom and left the mechanism intact.
 *
 * So this guard checks the mechanism: no layer may spell the statuses out for itself.
 */
describe('the quest status vocabulary has a single source', () => {
  const files = {
    post: 'server/api/campaigns/[id]/quests/index.post.ts',
    put: 'server/api/campaigns/[id]/quests/[slug]/index.put.ts',
    service: 'server/services/sessions.ts',
    form: 'app/components/forms/QuestForm.vue',
  }
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

  it.each(Object.entries(files))('%s reads the shared module', (_name, rel) => {
    expect(read(rel)).toMatch(/quest-status['"]/)
  })

  it.each(Object.entries(files))('%s spells out no status literal of its own', (_name, rel) => {
    const src = read(rel)
    // A status inside a quoted string is a second declaration. Comments are stripped first so the
    // explanations of WHY this rule exists do not trip the rule itself.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
      .replace(/<!--[\s\S]*?-->/g, '')
    for (const status of QUEST_STATUSES) {
      expect(code, `${rel} hard-codes "${status}"`).not.toMatch(new RegExp(`['"\`]${status}['"\`]`))
    }
  })

  it('no file anywhere still knows the word on_hold', () => {
    for (const rel of Object.values(files)) {
      expect(read(rel).replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('on_hold')
    }
  })
})
