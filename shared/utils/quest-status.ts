/**
 * The quest status vocabulary and the transitions between its values.
 *
 * WHY THIS IS A SHARED MODULE, and not four strings typed wherever they are needed: this file
 * exists because the vocabulary used to be declared TWICE and the two copies disagreed. The
 * transition table in `server/services/sessions.ts` knew `abandoned`; the zod schemas on
 * POST/PUT knew `on_hold`. Neither knew the other's word, so two of the four declared statuses
 * could not be set at all — `abandoned` passed the table and failed zod, `on_hold` did the
 * reverse — while the form's hard-coded dropdown (a third declaration) went on offering
 * `abandoned` as a visible, enabled control the server refused.
 *
 * It had a victim: a quest created as `on_hold` fell outside the table's domain, so every exit
 * was refused and it was frozen permanently in production. See
 * `openspec/changes/archive/*-fix-quest-status-vocabulary/`.
 *
 * So: one declaration, read by the schemas, the transition check, the form and the tests. Adding
 * a status means editing this file and nothing else.
 */

export const QUEST_STATUSES = ['active', 'completed', 'failed', 'abandoned'] as const

export type QuestStatus = (typeof QUEST_STATUSES)[number]

/** What a quest is created as when the caller does not say. */
export const DEFAULT_QUEST_STATUS: QuestStatus = 'active'

/**
 * Which statuses each status may move to.
 *
 * `completed -> active` is deliberate: reopening is the operation a Narrator actually needs when a
 * thread declared closed comes back, or when the wrong row was clicked. There is no
 * `completed -> failed`, because that is not a correction but a contradiction — reopen first, then
 * fail. The same asymmetry applies to `abandoned`.
 */
export const QUEST_STATUS_TRANSITIONS: Record<QuestStatus, readonly QuestStatus[]> = {
  active: ['completed', 'failed', 'abandoned'],
  completed: ['active'],
  failed: ['active'],
  abandoned: ['active'],
}

export function isQuestStatus(value: string): value is QuestStatus {
  return (QUEST_STATUSES as readonly string[]).includes(value)
}

/**
 * Whether a quest may move from `from` to `to`.
 *
 * An UNRECOGNISED `from` can always reach `active`, and that rule is the generalisation of the
 * incident above rather than defensive decoration. The mechanism that froze that quest was this
 * function returning false for every target because the stored value was not a key of the map. A
 * stray value can still arrive — a direct SQL edit, a restored backup, an import from an older
 * export — and when it does the row must stay rescuable by a Narrator instead of needing a DBA.
 *
 * Throwing on read was considered and rejected: it turns a recoverable row into an unreadable one.
 */
export function canTransitionQuestStatus(from: string, to: string): boolean {
  if (!isQuestStatus(to)) return false
  if (!isQuestStatus(from)) return to === 'active'
  return QUEST_STATUS_TRANSITIONS[from].includes(to)
}
