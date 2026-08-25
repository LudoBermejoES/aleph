// API response types for all campaign resources.
// These reflect the shapes returned by the server API endpoints,
// not the raw DB schema (which may differ due to joins, etc.).

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  theme: string | null
  contentDir: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CampaignListItem {
  id: string
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  role: string
  createdAt: Date
}

// ─── Campaign Members ─────────────────────────────────────────────────────────

export interface CampaignMember {
  id: string
  userId: string
  name: string
  email: string
  role: string
  joinedAt: Date
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Entity {
  id: string
  campaignId: string
  type: string
  name: string
  slug: string
  filePath: string
  visibility: string
  contentHash: string | null
  parentId: string | null
  templateId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  boardSummary?: string | null
  imageUrl?: string | null
  // Detail view only (entity GET by slug)
  content?: string
  frontmatter?: Record<string, unknown>
  fields?: Record<string, unknown>
}

export interface EntityListResult {
  entities: Entity[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface EntityType {
  id: string
  campaignId: string
  slug: string
  name: string
  icon: string | null
  isBuiltin: boolean
  sortOrder: number
}

export interface Tag {
  id: string
  campaignId: string
  name: string
  slug: string
  color: string | null
}

// ─── Characters ───────────────────────────────────────────────────────────────

export interface Character {
  id: string
  entityId: string
  name: string
  slug: string
  characterType: string
  status: string
  visibility: string
  ownerUserId: string | null
  isCompanionOf: string | null
  folderId: string | null
  portraitUrl: string | null
  locationEntityId: string | null
  locationName: string | null
  primaryOrg: { name: string; role: string | null } | null
  updatedAt: Date
  // Detail view only
  content?: string
  description?: string
  backstory?: string | null
  history?: string | null
  currentStatus?: string | null
  templateId?: string | null
  fields?: Record<string, unknown>
  frontmatter?: Record<string, unknown>
  /** Public notes — one per author, readable by whoever can read the character. */
  notes?: CharacterNote[]
}

/**
 * A public note on a character. One row per (character, author), so `authorUserId` is the
 * identity of the note as much as `id` is.
 */
export interface CharacterNote {
  id: string
  authorUserId: string
  /** Present on the character read payload; absent on the caller's own-note route. */
  authorName?: string
  body: string
  createdAt: string | number | Date
  updatedAt: string | number | Date
}

export interface CharacterFolder {
  id: string
  campaignId: string
  name: string
  parentFolderId: string | null
  sortOrder: number
}

export interface CharacterConnection {
  id: string
  characterId: string
  targetEntityId: string
  label: string | null
  description: string | null
  sortOrder: number
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface GameSession {
  id: string
  campaignId: string
  title: string
  slug: string
  sessionNumber: number
  scheduledDate: string | null
  status: string
  summary: string | null
  arcId: string | null
  chapterId: string | null
  subCampaignId?: string | null
  logFilePath: string | null
  createdAt: Date
  updatedAt: Date
  // Resolved names, present on both the list and the single-session responses.
  // `arcSlug`/`subCampaignSlug` come along so a client can link without a second request.
  subCampaignName?: string | null
  subCampaignSlug?: string | null
  arcName?: string | null
  arcSlug?: string | null
  chapterName?: string | null
  // Detail view only (session GET by slug)
  logContent?: string
  attendance?: unknown[]
}

export interface SessionDecision {
  id: string
  sessionId: string
  campaignId: string
  type: string
  title: string
  description: string | null
  entityId: string | null
  createdAt: Date
}

// ─── Quests ───────────────────────────────────────────────────────────────────

export interface Quest {
  id: string
  campaignId: string
  name: string
  slug: string
  description: string | null
  status: string
  parentQuestId: string | null
  entityId: string | null
  isSecret: boolean
  assignedCharacterIdsJson: string | null
  logFilePath: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── Maps ─────────────────────────────────────────────────────────────────────

export interface CampaignMap {
  id: string
  campaignId: string
  name: string
  slug: string
  parentMapId: string | null
  /** 'image' (uploaded/tiled image, CRS.Simple) or 'osm' (OpenStreetMap tiles, WGS84). */
  type: 'image' | 'osm'
  /** Initial view for an 'osm' map only -- null/unused for 'image' maps. */
  centerLat: number | null
  centerLng: number | null
  defaultZoom: number | null
  imagePath: string | null
  width: number | null
  height: number | null
  minZoom: number
  maxZoom: number
  isTiled: boolean
  visibility: string
  createdAt: Date
  updatedAt: Date
}

export interface MapPin {
  id: string
  mapId: string
  entityId: string | null
  childMapId: string | null
  label: string | null
  lat: number
  lng: number
  icon: string | null
  color: string | null
  visibility: string
  groupId: string | null
  /** Linked entity's image, joined server-side (design.md D3). Null if there is no linked
   *  entity, it has no image, or the viewer isn't allowed to see it. */
  entityImageUrl: string | null
  /** Linked entity's type slug, joined server-side (design.md D3) -- picks the marker's
   *  fallback icon when there is no image. Same visibility rule as entityImageUrl. */
  entityType: string | null
  /** The linked entity's slug. Needed to LINK to it: the "view entity" popup link used to
   *  address the generic entity page by ID and 404'd, because that route is keyed by slug.
   *  Same visibility rule as entityImageUrl/entityType. */
  entitySlug: string | null
}

export interface MapLayer {
  id: string
  mapId: string
  name: string
  type: string
  imagePath: string | null
  opacity: number
  sortOrder: number
  visibleDefault: boolean
}

export interface MapRegion {
  id: string
  mapId: string
  name: string | null
  geojson: string
  color: string | null
  opacity: number | null
  entityId: string | null
  visibility: string
}

// ─── Calendars & Timelines ───────────────────────────────────────────────────

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export interface CalendarConfig {
  months: Array<{ name: string; days: number }>
  yearLength: number
  weekdays?: string[]
}

export interface Calendar {
  id: string
  campaignId: string
  name: string
  configJson: string
  currentDateJson: string | null
  createdAt: Date
  updatedAt: Date
  // Detail view — server parses configJson/currentDateJson
  config?: CalendarConfig
  currentDate?: CalendarDate
  moons?: unknown[]
  seasons?: unknown[]
  events?: unknown[]
}

export interface CalendarEvent {
  id: string
  calendarId: string
  name: string
  description: string | null
  dateJson: string
  endDateJson: string | null
  isRecurring: boolean
  recurrenceJson: string | null
  linkedEntityId: string | null
  visibility: string
  createdAt: Date
}

export interface Timeline {
  id: string
  campaignId: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  createdAt: Date
}

export interface TimelineEvent {
  id: string
  timelineId: string
  name: string
  description: string | null
  dateJson: string
  endDateJson: string | null
  era: string | null
  linkedEntityId: string | null
  sortOrder: number
  createdAt: Date
}

// ─── Relations ────────────────────────────────────────────────────────────────

export interface RelationType {
  id: string
  campaignId: string
  slug: string
  forwardLabel: string
  reverseLabel: string
  isBuiltin: boolean
}

/** One image in a location's gallery. Exactly one image of a non-empty gallery is primary. */
export interface LocationImage {
  id: string
  url: string
  filename: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
}

export interface EntityRelation {
  id: string
  campaignId: string
  sourceEntityId: string
  targetEntityId: string
  relationTypeId: string
  forwardLabel: string
  reverseLabel: string
  attitude: number | null
  description: string | null
  metadataJson: string | null
  visibility: string
  isPinned: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  // Entity-centered query additions
  label?: string
  relatedEntityId?: string
  relatedEntityName?: string
  relatedEntitySlug?: string
  relatedEntityType?: string
  sourceName?: string
  sourceSlug?: string
  sourceType?: string
  targetName?: string
  targetSlug?: string
  targetType?: string
  sourceEntityName?: string
  targetEntityName?: string
}

// ─── Inventory & Economy ──────────────────────────────────────────────────────

export interface Item {
  id: string
  campaignId: string
  name: string
  description: string | null
  weight: number | null
  priceJson: string | null
  size: string | null
  rarity: string | null
  type: string | null
  imagePath: string | null
  propertiesJson: string | null
  stackable: boolean
  entityId: string | null
  createdAt: Date
}

export interface Inventory {
  id: string
  campaignId: string
  ownerType: string
  ownerId: string
  name: string | null
}

export interface InventoryItem {
  id: string
  inventoryId: string
  itemId: string
  quantity: number
  position: string | null
  notes: string | null
  acquiredAt: Date | null
}

export interface Currency {
  id: string
  campaignId: string
  name: string
  symbol: string | null
  valueInBase: number
  sortOrder: number
}

export interface Transaction {
  id: string
  campaignId: string
  type: string
  fromEntityId: string | null
  toEntityId: string | null
  itemId: string | null
  quantity: number | null
  amountsJson: string | null
  notes: string | null
  createdAt: Date
}

export interface Shop {
  id: string
  campaignId: string
  name: string
  slug: string
  description: string | null
  locationEntityId: string | null
  shopkeeperEntityId: string | null
  isPlayerOwned: boolean
  ownedByUserId: string | null
  createdAt: Date
}

export interface ShopStockItem {
  id: string
  shopId: string
  itemId: string
  quantity: number
  priceOverrideJson: string | null
  isAvailable: boolean
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphData {
  nodes: Record<string, GraphNode>
  edges: Record<string, GraphEdge>
}

export interface GraphNode {
  id: string
  name: string
  type: string
  slug?: string
  image?: string | null
  boardSummary?: string | null
  organizations?: Array<{ slug: string; name: string }>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  attitude: number | null
  color: string | null
  relationTypeSlug?: string
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export interface SearchResult {
  results: Array<{ id: string; name: string; slug: string; type: string }>
  query: string
}

export interface Mention {
  entityId: string
  entityName: string
  entitySlug: string
  entityType: string
}

export interface WealthBalance {
  currencyId: string
  currencyName: string
  symbol: string | null
  amount: number
}
