import { eq, isNotNull, and } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { mapPins } from '../schema/maps'
import { entities } from '../schema/entities'

export interface PinLabelBackfillResult {
  /** Pins whose label equalled their entity's current name (trimmed, case-insensitive) and
   *  were nulled by this run. */
  nulled: number
  /** Pins examined that were left untouched (no entity, or label genuinely differs). */
  skipped: number
}

/**
 * add-pin-rename/design.md D3: a pin's `label` used to be a copy of its linked entity's name,
 * taken at creation time (`onPinDrop`, and the CLI's then-required `pin-add --label`). Under
 * this change's new priority rule (a non-null label now OVERRIDES the entity's live name),
 * every pin created under the old behaviour would be wrongly treated as "deliberately
 * renamed" forever -- reintroducing, one layer down, the exact staleness bug that priority
 * rule exists to fix. This includes pins that were hand-repaired (via SQL) to match their
 * entity's CURRENT name specifically to paper over that staleness before this fix existed.
 *
 * Nulls `mapPins.label` wherever it equals (trimmed, case-insensitive) its linked entity's
 * CURRENT `name` -- indistinguishable from "never had a custom label" either way, so nulling
 * it costs nothing and correctly resumes following the live entity name.
 *
 * Deliberately leaves alone:
 *  - pins with no linked entity (`entityId IS NULL`) -- the new priority rule never reaches
 *    `entityName` for them, so there is nothing stale about their label in this sense.
 *  - pins whose label DIFFERS from their entity's current name -- genuinely ambiguous (could
 *    be a deliberate custom name, could be a stale copy from an earlier, uncaught rename) and
 *    not this backfill's to guess. `add-pin-rename`'s own UI is what resolves that case going
 *    forward, by giving the owner a real rename affordance instead of delete-and-recreate.
 *
 * Idempotent: a pin already nulled here has `label = null`, so it is excluded by
 * `isNotNull(mapPins.label)` on every subsequent run and the comparison never re-fires.
 * Runs on every boot like the other backfills in this directory (a pure `.sql` migration
 * cannot express a cross-table, mutable-column comparison like this one).
 */
export function backfillPinLabelEntityMatch(db: BetterSQLite3Database): PinLabelBackfillResult {
  const result: PinLabelBackfillResult = { nulled: 0, skipped: 0 }

  const rows = db
    .select({
      pinId: mapPins.id,
      label: mapPins.label,
      entityName: entities.name,
    })
    .from(mapPins)
    .innerJoin(entities, eq(mapPins.entityId, entities.id))
    .where(and(isNotNull(mapPins.entityId), isNotNull(mapPins.label)))
    .all()

  for (const row of rows) {
    const label = (row.label ?? '').trim().toLowerCase()
    const entityName = row.entityName.trim().toLowerCase()
    if (label && label === entityName) {
      db.update(mapPins).set({ label: null }).where(eq(mapPins.id, row.pinId)).run()
      result.nulled++
    } else {
      result.skipped++
    }
  }

  return result
}
