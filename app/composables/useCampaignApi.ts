import type {
  CampaignListItem,
  CampaignMember,
  Character,
  CharacterFolder,
  CharacterConnection,
  Entity,
  EntityListResult,
  EntityType,
  EntityRelation,
  RelationType,
  GameSession,
  SessionDecision,
  Quest,
  CampaignMap,
  MapPin,
  MapLayer,
  MapRegion,
  Calendar,
  CalendarDate,
  CalendarEvent,
  Timeline,
  Inventory,
  Item,
  Currency,
  Transaction,
  Shop,
  Tag,
  GraphData,
  SearchResult,
  Mention,
  WealthBalance,
} from '~/types/api'

export function useCampaignApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

  // ─── Campaigns ──────────────────────────────────────────────────────────────

  function getCampaign() {
    return $fetch<Campaign>(`/api/campaigns/${campaignId}`)
  }

  // ─── Members ────────────────────────────────────────────────────────────────

  function getMembers() {
    return $fetch<CampaignMember[]>(`${base}/members`)
  }

  function updateMember(userId: string, body: { role: string }) {
    return $fetch(`${base}/members/${userId}`, { method: 'PUT', body })
  }

  function removeMember(userId: string) {
    return $fetch(`${base}/members/${userId}`, { method: 'DELETE' })
  }

  function createInvite(body: { role: string; expiresInDays?: number }) {
    return $fetch<{ token: string; url: string }>(`${base}/invite`, { method: 'POST', body })
  }

  // ─── Entities ───────────────────────────────────────────────────────────────

  function getEntities(params?: Record<string, string | number>) {
    return $fetch<EntityListResult>(`${base}/entities`, { params })
  }

  function getEntity(slug: string) {
    return $fetch<Entity>(`${base}/entities/${slug}`)
  }

  function createEntity(body: Partial<Entity>) {
    return $fetch<Entity>(`${base}/entities`, { method: 'POST', body })
  }

  function updateEntity(slug: string, body: Partial<Entity>) {
    return $fetch<Entity>(`${base}/entities/${slug}`, { method: 'PUT', body })
  }

  function deleteEntity(slug: string) {
    return $fetch(`${base}/entities/${slug}`, { method: 'DELETE' })
  }

  function getEntityTypes() {
    return $fetch<EntityType[]>(`${base}/entity-types`)
  }

  function getTags() {
    return $fetch<Tag[]>(`${base}/tags`)
  }

  function getMentions(params?: { entity_id?: string }) {
    return $fetch<Mention[]>(`${base}/mentions`, { params })
  }

  // ─── Characters ─────────────────────────────────────────────────────────────

  function getCharacters(params?: Record<string, string>) {
    return $fetch<Character[]>(`${base}/characters`, { params })
  }

  function getCharacter(slug: string) {
    return $fetch<Character>(`${base}/characters/${slug}`)
  }

  function createCharacter(body: Record<string, unknown>) {
    return $fetch<Character>(`${base}/characters`, { method: 'POST', body })
  }

  function updateCharacter(slug: string, body: Record<string, unknown>) {
    return $fetch<Character>(`${base}/characters/${slug}`, { method: 'PUT', body })
  }

  function deleteCharacter(slug: string) {
    return $fetch(`${base}/characters/${slug}`, { method: 'DELETE' })
  }

  function getCharacterOrganizations(slug: string) {
    return $fetch<any[]>(`${base}/characters/${slug}/organizations`)
  }

  function getCharacterConnections(slug: string) {
    return $fetch<CharacterConnection[]>(`${base}/characters/${slug}/connections`)
  }

  function getCharacterFolders() {
    return $fetch<CharacterFolder[]>(`${base}/character-folders`)
  }

  // ─── Sessions ───────────────────────────────────────────────────────────────

  function getSessions(params?: Record<string, string>) {
    return $fetch<GameSession[]>(`${base}/sessions`, { params })
  }

  function getSession(slug: string) {
    return $fetch<GameSession>(`${base}/sessions/${slug}`)
  }

  function createSession(body: Record<string, unknown>) {
    return $fetch<GameSession>(`${base}/sessions`, { method: 'POST', body })
  }

  function updateSession(slug: string, body: Record<string, unknown>) {
    return $fetch<GameSession>(`${base}/sessions/${slug}`, { method: 'PUT', body })
  }

  function deleteSession(slug: string) {
    return $fetch(`${base}/sessions/${slug}`, { method: 'DELETE' })
  }

  function getSessionDecisions(slug: string) {
    return $fetch<SessionDecision[]>(`${base}/sessions/${slug}/decisions`)
  }

  // ─── Quests ─────────────────────────────────────────────────────────────────

  function getQuests(params?: Record<string, string>) {
    return $fetch<Quest[]>(`${base}/quests`, { params })
  }

  function getQuest(slug: string) {
    return $fetch<Quest>(`${base}/quests/${slug}`)
  }

  function createQuest(body: Record<string, unknown>) {
    return $fetch<Quest>(`${base}/quests`, { method: 'POST', body })
  }

  function updateQuest(slug: string, body: Record<string, unknown>) {
    return $fetch<Quest>(`${base}/quests/${slug}`, { method: 'PUT', body })
  }

  function deleteQuest(slug: string) {
    return $fetch(`${base}/quests/${slug}`, { method: 'DELETE' })
  }

  // ─── Maps ───────────────────────────────────────────────────────────────────

  function getMaps(params?: Record<string, string>) {
    return $fetch<CampaignMap[]>(`${base}/maps`, { params })
  }

  function getMap(slug: string) {
    return $fetch<CampaignMap>(`${base}/maps/${slug}`)
  }

  function createMap(body: Record<string, unknown>) {
    return $fetch<CampaignMap>(`${base}/maps`, { method: 'POST', body })
  }

  function updateMap(slug: string, body: Record<string, unknown>) {
    return $fetch<CampaignMap>(`${base}/maps/${slug}`, { method: 'PUT', body })
  }

  function deleteMap(slug: string) {
    return $fetch(`${base}/maps/${slug}`, { method: 'DELETE' })
  }

  function uploadMapImage(slug: string, formData: FormData) {
    return $fetch(`${base}/maps/${slug}/upload`, { method: 'POST', body: formData })
  }

  function getMapLayers(slug: string) {
    return $fetch<MapLayer[]>(`${base}/maps/${slug}/layers`)
  }

  function getMapPins(slug: string) {
    return $fetch<MapPin[]>(`${base}/maps/${slug}/pins`)
  }

  function getMapRegions(slug: string) {
    return $fetch<MapRegion[]>(`${base}/maps/${slug}/regions`)
  }

  function updateMapRegions(slug: string, body: unknown) {
    return $fetch(`${base}/maps/${slug}/regions`, { method: 'PUT', body })
  }

  // ─── Calendars ──────────────────────────────────────────────────────────────

  function getCalendars() {
    return $fetch<Calendar[]>(`${base}/calendars`)
  }

  function getCalendar(calendarId: string) {
    return $fetch<Calendar>(`${base}/calendars/${calendarId}`)
  }

  function createCalendar(body: Record<string, unknown>) {
    return $fetch<Calendar>(`${base}/calendars`, { method: 'POST', body })
  }

  function updateCalendar(calendarId: string, body: Record<string, unknown>) {
    return $fetch<Calendar>(`${base}/calendars/${calendarId}`, { method: 'PUT', body })
  }

  function deleteCalendar(calendarId: string) {
    return $fetch(`${base}/calendars/${calendarId}`, { method: 'DELETE' })
  }

  function getCalendarEvents(calendarId: string, params?: Record<string, string | number>) {
    return $fetch<CalendarEvent[]>(`${base}/calendars/${calendarId}/events`, { params })
  }

  function advanceCalendarDate(calendarId: string, body: Record<string, unknown>) {
    return $fetch<{ currentDate: CalendarDate }>(`${base}/calendars/${calendarId}/advance`, { method: 'POST', body })
  }

  // ─── Timelines ──────────────────────────────────────────────────────────────

  function getTimelines() {
    return $fetch<Timeline[]>(`${base}/timelines`)
  }

  function getTimeline(slug: string) {
    return $fetch<Timeline>(`${base}/timelines/${slug}`)
  }

  function createTimeline(body: Record<string, unknown>) {
    return $fetch<Timeline>(`${base}/timelines`, { method: 'POST', body })
  }

  function updateTimeline(slug: string, body: Record<string, unknown>) {
    return $fetch<Timeline>(`${base}/timelines/${slug}`, { method: 'PUT', body })
  }

  function deleteTimeline(slug: string) {
    return $fetch(`${base}/timelines/${slug}`, { method: 'DELETE' })
  }

  function createTimelineEvent(slug: string, body: Record<string, unknown>) {
    return $fetch(`${base}/timelines/${slug}/events`, { method: 'POST', body })
  }

  // ─── Relations ──────────────────────────────────────────────────────────────

  function getRelations(params?: { entity_id?: string }) {
    return $fetch<EntityRelation[]>(`${base}/relations`, { params })
  }

  function getRelation(relationId: string) {
    return $fetch<EntityRelation>(`${base}/relations/${relationId}`)
  }

  function createRelation(body: Record<string, unknown>) {
    return $fetch<EntityRelation>(`${base}/relations`, { method: 'POST', body })
  }

  function updateRelation(relationId: string, body: Record<string, unknown>) {
    return $fetch<EntityRelation>(`${base}/relations/${relationId}`, { method: 'PUT', body })
  }

  function deleteRelation(relationId: string) {
    return $fetch(`${base}/relations/${relationId}`, { method: 'DELETE' })
  }

  function getRelationTypes() {
    return $fetch<RelationType[]>(`${base}/relation-types`)
  }

  // ─── Inventories ────────────────────────────────────────────────────────────

  function getInventories(params?: Record<string, string>) {
    return $fetch<Inventory[]>(`${base}/inventories`, { params })
  }

  function createInventory(body: Record<string, unknown>) {
    return $fetch<Inventory>(`${base}/inventories`, { method: 'POST', body })
  }

  function transferInventoryItems(fromInventoryId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/inventories/${fromInventoryId}/transfer`, { method: 'POST', body })
  }

  // ─── Items ──────────────────────────────────────────────────────────────────

  function getItems(params?: Record<string, string>) {
    return $fetch<Item[]>(`${base}/items`, { params })
  }

  function getItem(itemId: string) {
    return $fetch<Item>(`${base}/items/${itemId}`)
  }

  function createItem(body: Record<string, unknown>) {
    return $fetch<Item>(`${base}/items`, { method: 'POST', body })
  }

  function updateItem(itemId: string, body: Record<string, unknown>) {
    return $fetch<Item>(`${base}/items/${itemId}`, { method: 'PUT', body })
  }

  function deleteItem(itemId: string) {
    return $fetch(`${base}/items/${itemId}`, { method: 'DELETE' })
  }

  // ─── Currencies & Transactions ───────────────────────────────────────────────

  function getCurrencies() {
    return $fetch<Currency[]>(`${base}/currencies`)
  }

  function createCurrency(body: Record<string, unknown>) {
    return $fetch<Currency>(`${base}/currencies`, { method: 'POST', body })
  }

  function updateCurrency(currencyId: string, body: Record<string, unknown>) {
    return $fetch<Currency>(`${base}/currencies/${currencyId}`, { method: 'PUT', body })
  }

  function deleteCurrency(currencyId: string) {
    return $fetch(`${base}/currencies/${currencyId}`, { method: 'DELETE' })
  }

  function getTransactions(params?: Record<string, string>) {
    return $fetch<Transaction[]>(`${base}/transactions`, { params })
  }

  function getWealth(params?: { owner_id?: string; owner_type?: string }) {
    return $fetch<WealthBalance[]>(`${base}/wealth`, { params })
  }

  // ─── Shops ──────────────────────────────────────────────────────────────────

  function getShops() {
    return $fetch<Shop[]>(`${base}/shops`)
  }

  function getShop(slug: string) {
    return $fetch<Shop>(`${base}/shops/${slug}`)
  }

  function createShop(body: Record<string, unknown>) {
    return $fetch<Shop>(`${base}/shops`, { method: 'POST', body })
  }

  function updateShop(slug: string, body: Record<string, unknown>) {
    return $fetch<Shop>(`${base}/shops/${slug}`, { method: 'PUT', body })
  }

  function deleteShop(slug: string) {
    return $fetch(`${base}/shops/${slug}`, { method: 'DELETE' })
  }

  // ─── Graph ──────────────────────────────────────────────────────────────────

  // ─── Organizations ──────────────────────────────────────────────────────────

  function getOrganizations() {
    return $fetch<any[]>(`${base}/organizations`)
  }

  function getOrganization(slug: string) {
    return $fetch<any>(`${base}/organizations/${slug}`)
  }

  function createOrganization(body: { name: string; description?: string; type?: string; status?: string }) {
    return $fetch<any>(`${base}/organizations`, { method: 'POST', body })
  }

  function updateOrganization(slug: string, body: { name?: string; description?: string; type?: string; status?: string }) {
    return $fetch<any>(`${base}/organizations/${slug}`, { method: 'PUT', body })
  }

  function deleteOrganization(slug: string) {
    return $fetch(`${base}/organizations/${slug}`, { method: 'DELETE' })
  }

  function addOrganizationMember(slug: string, body: { characterId: string; role?: string }) {
    return $fetch<any>(`${base}/organizations/${slug}/members`, { method: 'POST', body })
  }

  function removeOrganizationMember(slug: string, characterId: string) {
    return $fetch(`${base}/organizations/${slug}/members/${characterId}`, { method: 'DELETE' })
  }

  function getGraph() {
    return $fetch<GraphData>(`${base}/graph`)
  }

  // ─── Search ─────────────────────────────────────────────────────────────────

  function search(params: { q: string; type?: string; limit?: number }) {
    return $fetch<SearchResult>(`${base}/search`, { params })
  }

  // ─── Dice ───────────────────────────────────────────────────────────────────

  function roll(body: { formula: string; sessionId?: string }) {
    return $fetch<{ formula: string; result: number; total: number; rolls: number[] }>(`${base}/roll`, { method: 'POST', body })
  }

  return {
    // Campaign
    getCampaign,
    // Members
    getMembers, updateMember, removeMember, createInvite,
    // Entities
    getEntities, getEntity, createEntity, updateEntity, deleteEntity,
    getEntityTypes, getTags, getMentions,
    // Characters
    getCharacters, getCharacter, createCharacter, updateCharacter, deleteCharacter,
    getCharacterConnections, getCharacterFolders, getCharacterOrganizations,
    // Sessions
    getSessions, getSession, createSession, updateSession, deleteSession,
    getSessionDecisions,
    // Quests
    getQuests, getQuest, createQuest, updateQuest, deleteQuest,
    // Maps
    getMaps, getMap, createMap, updateMap, deleteMap, uploadMapImage,
    getMapLayers, getMapPins, getMapRegions, updateMapRegions,
    // Calendars
    getCalendars, getCalendar, createCalendar, updateCalendar, deleteCalendar,
    getCalendarEvents, advanceCalendarDate,
    // Timelines
    getTimelines, getTimeline, createTimeline, updateTimeline, deleteTimeline,
    createTimelineEvent,
    // Relations
    getRelations, getRelation, createRelation, updateRelation, deleteRelation,
    getRelationTypes,
    // Inventories
    getInventories, createInventory, transferInventoryItems,
    // Items
    getItems, getItem, createItem, updateItem, deleteItem,
    // Currencies & transactions
    getCurrencies, createCurrency, updateCurrency, deleteCurrency,
    getTransactions, getWealth,
    // Shops
    getShops, getShop, createShop, updateShop, deleteShop,
    // Graph
    getGraph,
    // Search & dice
    search, roll,
    // Organizations
    getOrganizations, getOrganization, createOrganization, updateOrganization, deleteOrganization,
    addOrganizationMember, removeOrganizationMember,
  }
}

export function listCampaigns(): Promise<CampaignListItem[]> {
  return $fetch<CampaignListItem[]>('/api/campaigns')
}

export function createCampaignEntry(body: { name: string; description?: string; theme?: string }): Promise<{ id: string; slug: string }> {
  return $fetch<{ id: string; slug: string }>('/api/campaigns', { method: 'POST', body })
}

export function updateCampaignEntry(id: string, body: { name?: string; description?: string; isPublic?: boolean; theme?: string }): Promise<{ success: boolean }> {
  return $fetch<{ success: boolean }>(`/api/campaigns/${id}`, { method: 'PUT', body })
}
