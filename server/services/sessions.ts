import { hasMinRole } from '../utils/permissions'
import type { CampaignRole } from '../utils/permissions'

/**
 * Valid quest status transitions.
 */
export const VALID_QUEST_TRANSITIONS: Record<string, string[]> = {
  active: ['completed', 'failed', 'abandoned'],
  completed: [],
  failed: ['active'],
  abandoned: ['active'],
}

/**
 * Calculate the next session number given the current maximum.
 */
export function nextSessionNumber(currentMax: number): number {
  return currentMax + 1
}

/**
 * Check if a quest status transition is valid.
 */
export function canTransitionQuestStatus(from: string, to: string): boolean {
  const allowed = VALID_QUEST_TRANSITIONS[from]
  if (!allowed) return false
  return allowed.includes(to)
}

/**
 * Filter secret quests for non-DM/co-DM roles.
 */
export function filterSecretQuests<T extends { isSecret: boolean }>(quests: T[], role: string): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return quests
  return quests.filter(q => !q.isSecret)
}

/**
 * Filter consequences to only revealed ones for non-DM roles.
 */
export function filterRevealedConsequences<T extends { revealed: boolean }>(
  consequences: T[],
  role: string,
): T[] {
  if (hasMinRole(role as CampaignRole, 'co_dm')) return consequences
  return consequences.filter(c => c.revealed)
}
