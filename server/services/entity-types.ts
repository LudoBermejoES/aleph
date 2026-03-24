import { randomUUID } from 'crypto'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { entityTypes } from '../db/schema/entity-types'

const BUILTIN_TYPES = [
  { slug: 'character', name: 'Character', icon: 'user', sortOrder: 1 },
  { slug: 'location', name: 'Location', icon: 'map-pin', sortOrder: 2 },
  { slug: 'faction', name: 'Faction', icon: 'shield', sortOrder: 3 },
  { slug: 'item', name: 'Item', icon: 'package', sortOrder: 4 },
  { slug: 'event', name: 'Event', icon: 'calendar', sortOrder: 5 },
  { slug: 'lore', name: 'Lore', icon: 'book-open', sortOrder: 6 },
  { slug: 'quest', name: 'Quest', icon: 'flag', sortOrder: 7 },
  { slug: 'note', name: 'Note', icon: 'file-text', sortOrder: 8 },
  { slug: 'session', name: 'Session', icon: 'clock', sortOrder: 9 },
]

/**
 * Create built-in entity types for a campaign.
 * Call when a campaign is first created.
 */
export function seedEntityTypes(db: BetterSQLite3Database, campaignId: string): void {
  for (const type of BUILTIN_TYPES) {
    db.insert(entityTypes).values({
      id: randomUUID(),
      campaignId,
      slug: type.slug,
      name: type.name,
      icon: type.icon,
      isBuiltin: true,
      sortOrder: type.sortOrder,
    }).run()
  }
}
