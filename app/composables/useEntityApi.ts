import type { Entity, EntityListResult, EntityType, Tag, Mention } from '~/types/api'

export function useEntityApi(campaignId: string) {
  const base = `/api/campaigns/${campaignId}`

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

  function updateEntityType(typeId: string, body: Record<string, unknown>) {
    return $fetch(`${base}/entity-types/${typeId}`, { method: 'PUT', body })
  }

  function deleteEntityType(typeId: string) {
    return $fetch(`${base}/entity-types/${typeId}`, { method: 'DELETE' })
  }

  function getTags() {
    return $fetch<Tag[]>(`${base}/tags`)
  }

  function getMentions(params?: { entity_id?: string }) {
    return $fetch<Mention[]>(`${base}/mentions`, { params })
  }

  return {
    getEntities,
    getEntity,
    createEntity,
    updateEntity,
    deleteEntity,
    getEntityTypes,
    updateEntityType,
    deleteEntityType,
    getTags,
    getMentions,
  }
}
