import { z } from 'zod'

/**
 * Shared shape for writing a session-attendance XP value. Kept in one place so the endpoint
 * and its tests agree on what a legal request looks like — see
 * openspec/changes/add-session-attendance-xp/design.md for the decisions this encodes:
 *
 * - Integer, never fractional (M20-style XP is always whole numbers).
 * - Never negative: XP penalties are a different, unbuilt feature.
 * - Nullable: `null` clears a previously-recorded value ("not recorded" — distinct from `0`,
 *   "recorded, awarded nothing"). The field is required in the body (not `.optional()`) so a
 *   caller must say which of "set to N" or "clear" they mean; there is no silent no-op.
 */
export const attendanceXpSchema = z.object({
  xp: z.number().int().nonnegative().nullable(),
})

export type AttendanceXpInput = z.infer<typeof attendanceXpSchema>

/**
 * A non-null XP award requires the row to already be marked `attended: true`. Clearing a value
 * (`xp: null`) is always allowed, regardless of attendance — that's a correction, not an award.
 *
 * This is the one rule that makes "XP for someone who didn't attend" a hard error instead of a
 * silently-accepted inconsistency, enforced at the same boundary that persists the value so the
 * UI can't get out ahead of it.
 */
export function canSetAttendanceXp(
  attended: boolean | null | undefined,
  xp: number | null,
): boolean {
  if (xp === null) return true
  return attended === true
}
