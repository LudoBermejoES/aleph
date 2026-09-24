import { hasMinRole } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'

/**
 * Quest statuses and their transitions now live in `#shared/utils/quest-status`, because this
 * table and the zod enums on POST/PUT used to be two independent declarations of the same
 * vocabulary and they disagreed: this one knew `abandoned`, they knew `on_hold`, and neither knew
 * the other's word. Re-exported under the old names so no caller had to change.
 */
export {
  QUEST_STATUSES,
  QUEST_STATUS_TRANSITIONS,
  QUEST_STATUS_TRANSITIONS as VALID_QUEST_TRANSITIONS,
  canTransitionQuestStatus,
  isQuestStatus,
} from '#shared/utils/quest-status'
export type { QuestStatus } from '#shared/utils/quest-status'

/**
 * Calculate the next session number given the current maximum.
 */
export function nextSessionNumber(currentMax: number): number {
  return currentMax + 1
}

/**
 * Filter secret quests for non-DM/co-DM roles.
 */
export function filterSecretQuests<T extends { isSecret: boolean }>(
  quests: T[],
  role: string,
): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return quests
  return quests.filter((q) => !q.isSecret)
}

/**
 * Filter consequences to only revealed ones for non-DM roles.
 */
export function filterRevealedConsequences<T extends { revealed: boolean }>(
  consequences: T[],
  role: string,
): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return consequences
  return consequences.filter((c) => c.revealed)
}
