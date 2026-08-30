/**
 * Pure logic behind `SessionXpPanel.vue` — seeding the panel's rows, and turning what the DM
 * typed into the body of the single `PUT /api/campaigns/:id/sessions/:slug/xp` that saves them.
 *
 * It lives outside the component so the rules can be tested against the spec directly
 * (`openspec/changes/add-per-character-session-xp/specs/session-participant-management/spec.md`)
 * instead of against a copy of the template's logic.
 *
 * Two rules from that change's `design.md` are encoded here and are easy to break by accident:
 *
 * - **Decision 2 — a row's existence means "recorded"**. There is no nullable `xp` server-side:
 *   an award row exists (possibly with `0`) or it does not. So a panel row whose input is BLANK
 *   is deliberately NOT sent: blank means "nothing recorded for this character", which is a
 *   different fact from `0` ("recorded, awarded nothing"). Never coalesce the two.
 * - **Decision 5 — the `PUT` replaces the whole award set**. Whatever this module returns is the
 *   complete list of what should survive; a character missing from it loses its award. That is
 *   why removing a row from the panel is enough to clear an award, and why the caller must never
 *   send a partial list as if it were a patch.
 */

/** An award as `GET .../sessions/:slug` reports it inside `xpAwards`. */
export interface SessionXpAward {
  characterId: string
  characterName?: string | null
  characterSlug?: string | null
  xp: number
}

/**
 * Only the part of an attendance row this module reads. `characterId` is nullable in live data —
 * measured: 2 of the 6 rows of the 2026-08-24 session carry none — because attendance is a fact
 * about a PERSON and a person can turn up with no character (a guest, a player between
 * characters). Such a row simply contributes no character to the panel.
 */
export interface SessionAttendanceRosterEntry {
  characterId?: string | null
}

/** One editable line of the panel. `xp` stays a string: it is what the `<input>` holds. */
export interface SessionXpRow {
  characterId: string
  xp: string
}

/** The parsed meaning of one XP input. Blank and invalid are distinct: only invalid blocks Save. */
export type SessionXpInput = { kind: 'blank' } | { kind: 'value'; xp: number } | { kind: 'invalid' }

/**
 * Character ids named by a session's attendance roster, in roster order, without repeats.
 * Rows with no `characterId` (or an empty/whitespace one) are skipped rather than producing an
 * empty row.
 */
export function rosterCharacterIds(attendance: SessionAttendanceRosterEntry[] = []): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const entry of attendance) {
    const id = typeof entry?.characterId === 'string' ? entry.characterId.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/**
 * The panel's initial rows: every roster character first (pre-seeded, in roster order), then any
 * character that already has an award for this session but is absent from the roster — a
 * character may legitimately be awarded without attending (design decision 4), and the panel must
 * not hide an award it would then silently delete on the next save.
 *
 * A character with a saved award seeds with that value (including `0`); one without seeds BLANK.
 */
export function buildXpRows(
  attendance: SessionAttendanceRosterEntry[] = [],
  awards: SessionXpAward[] = [],
): SessionXpRow[] {
  const byCharacter = new Map<string, number>()
  for (const award of awards) {
    if (award && typeof award.characterId === 'string' && Number.isFinite(award.xp)) {
      byCharacter.set(award.characterId, award.xp)
    }
  }

  const rows: SessionXpRow[] = []
  const placed = new Set<string>()
  for (const characterId of rosterCharacterIds(attendance)) {
    const xp = byCharacter.get(characterId)
    rows.push({ characterId, xp: xp === undefined ? '' : String(xp) })
    placed.add(characterId)
  }
  for (const award of awards) {
    if (!award?.characterId || placed.has(award.characterId)) continue
    if (!Number.isFinite(award.xp)) continue
    rows.push({ characterId: award.characterId, xp: String(award.xp) })
    placed.add(award.characterId)
  }
  return rows
}

/**
 * What one XP input currently means. The server refuses negative and fractional values with a
 * 422, so the panel refuses them first — visibly, rather than by sending a request it knows will
 * fail.
 */
export function parseXpInput(raw: string | number | null | undefined): SessionXpInput {
  const text = typeof raw === 'number' ? String(raw) : (raw ?? '').trim()
  if (text === '') return { kind: 'blank' }
  const xp = Number(text)
  if (!Number.isInteger(xp) || xp < 0) return { kind: 'invalid' }
  return { kind: 'value', xp }
}

/** True when at least one row holds something the server would reject. Blank rows are fine. */
export function hasInvalidXp(rows: SessionXpRow[]): boolean {
  return rows.some((row) => parseXpInput(row.xp).kind === 'invalid')
}

/**
 * The body of the save: the COMPLETE list of awards that should exist for the session afterwards.
 * Blank rows are omitted (nothing recorded), invalid rows are omitted too — `hasInvalidXp` is what
 * stops the save, this never invents a value for one. A row removed from the panel is simply not
 * here, and the replacing `PUT` therefore deletes its award.
 */
export function toAwardsBody(rows: SessionXpRow[]): { characterId: string; xp: number }[] {
  const awards: { characterId: string; xp: number }[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row?.characterId || seen.has(row.characterId)) continue
    const parsed = parseXpInput(row.xp)
    if (parsed.kind !== 'value') continue
    seen.add(row.characterId)
    awards.push({ characterId: row.characterId, xp: parsed.xp })
  }
  return awards
}
