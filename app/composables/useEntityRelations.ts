import { ref, type Ref } from 'vue'

export type EntityType = 'character' | 'organization' | 'location' | 'quest' | 'session' | 'arc'

export interface EntityRef {
  id: string
  type: EntityType
  slug: string
}

export interface EntityRelationRow {
  id: string
  sourceEntityId: string
  targetEntityId: string
  relationTypeId: string | null
  forwardLabel: string
  reverseLabel: string
  attitude: number | null
  description: string | null
  relatedEntityId: string
  relatedEntityName: string | null
  relatedEntitySlug: string | null
  relatedEntityType: string | null
  [key: string]: unknown
}

export interface MemberRow {
  characterId: string
  role: string | null
  character?: { name: string; slug: string; portraitUrl?: string | null }
  [key: string]: unknown
}

export interface InhabitantRow {
  id: string
  name: string
  slug: string
  [key: string]: unknown
}

export interface LocationOrgRow {
  id: string
  name: string
  slug: string
  [key: string]: unknown
}

export interface RelationGroups {
  entityRelations: EntityRelationRow[]
  members: MemberRow[]
  inhabitants: InhabitantRow[]
  locationOrgs: LocationOrgRow[]
}

export function useEntityRelations(campaignId: string, entity: EntityRef) {
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<unknown> = ref(null)
  const groups: Ref<RelationGroups> = ref({
    entityRelations: [],
    members: [],
    inhabitants: [],
    locationOrgs: [],
  })

  async function load() {
    isLoading.value = true
    error.value = null

    try {
      const base = `/api/campaigns/${campaignId}`
      const fetches: Promise<unknown>[] = []

      // Entity relations — always fetch for all entity types
      fetches.push($fetch<EntityRelationRow[]>(`${base}/relations?entity_id=${entity.id}`))

      // Type-specific extras
      if (entity.type === 'organization') {
        fetches.push(
          $fetch<{
            members?: {
              characterId: string
              role: string | null
              characterName: string
              characterSlug: string
            }[]
          }>(`${base}/organizations/${entity.slug}`).then((org) =>
            (org.members ?? []).map((m) => ({
              characterId: m.characterId,
              role: m.role,
              character: { name: m.characterName, slug: m.characterSlug },
            })),
          ),
        )
      } else {
        fetches.push(Promise.resolve([]))
      }

      if (entity.type === 'location') {
        fetches.push($fetch<InhabitantRow[]>(`${base}/locations/${entity.slug}/inhabitants`))
        fetches.push($fetch<LocationOrgRow[]>(`${base}/locations/${entity.slug}/organizations`))
      } else {
        fetches.push(Promise.resolve([]))
        fetches.push(Promise.resolve([]))
      }

      const [entityRelations, members, inhabitants, locationOrgs] = (await Promise.all(
        fetches,
      )) as [EntityRelationRow[], MemberRow[], InhabitantRow[], LocationOrgRow[]]

      groups.value = { entityRelations, members, inhabitants, locationOrgs }
    } catch (e) {
      error.value = e
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function refresh() {
    return load()
  }

  return { isLoading, error, groups, load, refresh }
}
