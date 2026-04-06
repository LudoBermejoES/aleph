import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { user } from './auth'

export const diagrams = sqliteTable(
  'diagrams',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    diagramType: text('diagram_type').notNull().default('freeform'),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    campaignIdx: index('diagrams_campaign_idx').on(t.campaignId),
  }),
)

export const diagramSnapshots = sqliteTable(
  'diagram_snapshots',
  {
    id: text('id').primaryKey(),
    diagramId: text('diagram_id')
      .notNull()
      .references(() => diagrams.id, { onDelete: 'cascade' }),
    snapshot: text('snapshot').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    diagramIdx: index('diagram_snapshots_diagram_idx').on(t.diagramId),
  }),
)
