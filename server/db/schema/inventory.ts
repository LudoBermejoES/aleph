import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { campaigns } from './campaigns'
import { user } from './auth'

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  weight: real('weight'),
  priceJson: text('price_json'), // { "gold": 50 }
  size: text('size'),
  rarity: text('rarity').default('common'), // common, uncommon, rare, very_rare, legendary
  type: text('type'), // weapon, armor, potion, scroll, etc.
  imagePath: text('image_path'),
  propertiesJson: text('properties_json'),
  stackable: integer('stackable', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const inventories = sqliteTable('inventories', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  ownerType: text('owner_type').notNull(), // character, party, shop, faction
  ownerId: text('owner_id').notNull(),
  name: text('name').default('Inventory'),
})

export const inventoryItems = sqliteTable('inventory_items', {
  id: text('id').primaryKey(),
  inventoryId: text('inventory_id').notNull().references(() => inventories.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  quantity: integer('quantity').notNull().default(1),
  position: text('position').default('backpack'), // equipped, backpack, wagon, storage
  notes: text('notes'),
  acquiredAt: integer('acquired_at', { mode: 'timestamp' }),
})

export const currencies = sqliteTable('currencies', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  symbol: text('symbol'),
  valueInBase: integer('value_in_base').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const wealth = sqliteTable('wealth', {
  id: text('id').primaryKey(),
  ownerType: text('owner_type').notNull(), // character, party, shop, faction
  ownerId: text('owner_id').notNull(),
  currencyId: text('currency_id').notNull().references(() => currencies.id),
  amount: integer('amount').notNull().default(0),
})

export const shops = sqliteTable('shops', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  locationEntityId: text('location_entity_id'),
  shopkeeperEntityId: text('shopkeeper_entity_id'),
  isPlayerOwned: integer('is_player_owned', { mode: 'boolean' }).notNull().default(false),
  ownedByUserId: text('owned_by_user_id').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const shopStock = sqliteTable('shop_stock', {
  id: text('id').primaryKey(),
  shopId: text('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  quantity: integer('quantity').notNull().default(-1), // -1 = unlimited
  priceOverrideJson: text('price_override_json'),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
})

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // purchase, sale, loot, trade, gift, loss
  fromEntityId: text('from_entity_id'),
  toEntityId: text('to_entity_id'),
  itemId: text('item_id').references(() => items.id),
  quantity: integer('quantity'),
  amountsJson: text('amounts_json'), // { "gold": 50, "silver": 5 }
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
