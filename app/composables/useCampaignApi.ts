import type {
  Campaign,
  CampaignListItem,
  CampaignMember,
  EntityRelation,
  RelationType,
  GraphData,
  SearchResult,
} from '~/types/api'

import { useCharacterApi } from './useCharacterApi'
import { useSessionApi } from './useSessionApi'
import { useEntityApi } from './useEntityApi'
import { useMapApi } from './useMapApi'
import { useInventoryApi } from './useInventoryApi'
import { useCalendarApi } from './useCalendarApi'

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

  function addMemberDirect(body: { userId: string; role: string }) {
    return $fetch<{ id: string; userId: string; name: string; role: string }>(
      `${base}/members/direct`,
      { method: 'POST', body },
    )
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

  // ─── Graph ──────────────────────────────────────────────────────────────────

  function getGraph() {
    return $fetch<GraphData>(`${base}/graph`)
  }

  // ─── Search ─────────────────────────────────────────────────────────────────

  function search(params: { q: string; type?: string; limit?: number }) {
    return $fetch<SearchResult>(`${base}/search`, { params })
  }

  // ─── Dice ───────────────────────────────────────────────────────────────────

  function roll(body: { formula: string; sessionId?: string }) {
    return $fetch<{ formula: string; result: number; total: number; rolls: number[] }>(
      `${base}/roll`,
      { method: 'POST', body },
    )
  }

  // ─── Organizations ──────────────────────────────────────────────────────────

  function getOrganizations() {
    return $fetch<Record<string, unknown>[]>(`${base}/organizations`, { params: { pageSize: '0' } })
  }

  function getOrganization(slug: string) {
    return $fetch<Record<string, unknown>>(`${base}/organizations/${slug}`)
  }

  function createOrganization(body: {
    name: string
    description?: string
    type?: string
    status?: string
    templateId?: string
    fields?: Record<string, unknown>
  }) {
    return $fetch<Record<string, unknown>>(`${base}/organizations`, { method: 'POST', body })
  }

  function updateOrganization(
    slug: string,
    body: {
      name?: string
      description?: string
      type?: string
      status?: string
      templateId?: string
      fields?: Record<string, unknown>
    },
  ) {
    return $fetch<Record<string, unknown>>(`${base}/organizations/${slug}`, { method: 'PUT', body })
  }

  function deleteOrganization(slug: string) {
    return $fetch(`${base}/organizations/${slug}`, { method: 'DELETE' })
  }

  function addOrganizationMember(slug: string, body: { characterId: string; role?: string }) {
    return $fetch<Record<string, unknown>>(`${base}/organizations/${slug}/members`, {
      method: 'POST',
      body,
    })
  }

  function removeOrganizationMember(slug: string, characterId: string) {
    return $fetch(`${base}/organizations/${slug}/members/${characterId}`, { method: 'DELETE' })
  }

  // ─── Locations ──────────────────────────────────────────────────────────────

  function getLocations(params?: {
    parentId?: string
    subtype?: string
    search?: string
    pageSize?: string
  }) {
    return $fetch<Record<string, unknown>[]>(`${base}/locations`, {
      params: { pageSize: '0', ...params },
    })
  }

  function getLocation(slug: string, params?: Record<string, string>) {
    return $fetch<Record<string, unknown>>(`${base}/locations/${slug}`, { params })
  }

  function createLocation(body: {
    name: string
    subtype?: string
    parentId?: string
    visibility?: string
    content?: string
    templateId?: string
    fields?: Record<string, unknown>
  }) {
    return $fetch<Record<string, unknown>>(`${base}/locations`, { method: 'POST', body })
  }

  function updateLocation(
    slug: string,
    body: {
      name?: string
      subtype?: string
      parentId?: string | null
      visibility?: string
      content?: string
      templateId?: string
      fields?: Record<string, unknown>
    },
  ) {
    return $fetch<Record<string, unknown>>(`${base}/locations/${slug}`, { method: 'PUT', body })
  }

  function deleteLocation(slug: string) {
    return $fetch(`${base}/locations/${slug}`, { method: 'DELETE' })
  }

  function getSubLocations(slug: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/locations/${slug}/sub-locations`)
  }

  function getLocationInhabitants(slug: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/locations/${slug}/inhabitants`)
  }

  function addLocationInhabitant(slug: string, characterId: string) {
    return $fetch(`${base}/locations/${slug}/inhabitants`, {
      method: 'POST',
      body: { characterId },
    })
  }

  function removeLocationInhabitant(slug: string, characterId: string) {
    return $fetch(`${base}/locations/${slug}/inhabitants/${characterId}`, { method: 'DELETE' })
  }

  function getLocationOrganizations(slug: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/locations/${slug}/organizations`)
  }

  function addLocationOrganization(slug: string, organizationId: string) {
    return $fetch(`${base}/locations/${slug}/organizations`, {
      method: 'POST',
      body: { organizationId },
    })
  }

  function removeLocationOrganization(slug: string, organizationId: string) {
    return $fetch(`${base}/locations/${slug}/organizations/${organizationId}`, { method: 'DELETE' })
  }

  function getOrganizationLocations(orgSlug: string) {
    return $fetch<Record<string, unknown>[]>(`${base}/organizations/${orgSlug}/locations`)
  }

  return {
    ...useEntityApi(campaignId),
    ...useCharacterApi(campaignId),
    ...useSessionApi(campaignId),
    ...useMapApi(campaignId),
    ...useCalendarApi(campaignId),
    ...useInventoryApi(campaignId),
    // Campaign
    getCampaign,
    // Members
    getMembers,
    updateMember,
    removeMember,
    createInvite,
    addMemberDirect,
    // Relations
    getRelations,
    getRelation,
    createRelation,
    updateRelation,
    deleteRelation,
    getRelationTypes,
    // Graph
    getGraph,
    // Search & dice
    search,
    roll,
    // Organizations
    getOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    addOrganizationMember,
    removeOrganizationMember,
    // Locations
    getLocations,
    getLocation,
    createLocation,
    updateLocation,
    deleteLocation,
    getSubLocations,
    getLocationInhabitants,
    addLocationInhabitant,
    removeLocationInhabitant,
    getLocationOrganizations,
    addLocationOrganization,
    removeLocationOrganization,
    getOrganizationLocations,
  }
}

export function listCampaigns(): Promise<CampaignListItem[]> {
  return $fetch<CampaignListItem[]>('/api/campaigns')
}

export function createCampaignEntry(body: {
  name: string
  description?: string
  theme?: string
}): Promise<{ id: string; slug: string }> {
  return $fetch<{ id: string; slug: string }>('/api/campaigns', { method: 'POST', body })
}

export function updateCampaignEntry(
  id: string,
  body: { name?: string; description?: string | null; isPublic?: boolean; theme?: string | null },
): Promise<{ success: boolean }> {
  return $fetch<{ success: boolean }>(`/api/campaigns/${id}`, { method: 'PUT', body })
}

export function searchUsers(q: string): Promise<{ id: string; name: string; email: string }[]> {
  return $fetch('/api/users/search', { params: { q } })
}
