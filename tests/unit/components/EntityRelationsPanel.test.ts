import { describe, it, expect } from 'vitest'

// Tests for the pure logic extracted from EntityRelationsPanel:
// - Delete routing (which endpoint to call per relation mode)
// - Group counting (empty state detection)
// - Permission guard (editor+ can mutate)

type EntityType = 'character' | 'organization' | 'location'
type CampaignRole = 'dm' | 'co_dm' | 'editor' | 'player' | 'visitor'

const EDITOR_ROLES: CampaignRole[] = ['dm', 'co_dm', 'editor']
const READONLY_ROLES: CampaignRole[] = ['player', 'visitor']

function canEdit(role: CampaignRole): boolean {
  return EDITOR_ROLES.includes(role)
}

interface RelationDeleteTarget {
  mode: 'entity-relation' | 'org-member' | 'char-location' | 'org-location'
  relationId?: string
  characterId?: string
  organizationId?: string
  orgSlug?: string
  locationSlug?: string
}

function buildDeleteUrl(
  campaignId: string,
  entityType: EntityType,
  entitySlug: string,
  target: RelationDeleteTarget,
): string {
  switch (target.mode) {
    case 'entity-relation':
      return `/api/campaigns/${campaignId}/relations/${target.relationId}`
    case 'org-member':
      return `/api/campaigns/${campaignId}/organizations/${entitySlug}/members/${target.characterId}`
    case 'char-location':
      return `/api/campaigns/${campaignId}/locations/${target.locationSlug}/inhabitants/${target.characterId}`
    case 'org-location':
      return `/api/campaigns/${campaignId}/locations/${target.locationSlug}/organizations/${target.organizationId}`
    default:
      throw new Error(`Unknown delete mode: ${(target as { mode: string }).mode}`)
  }
}

function hasAnyRelations(groups: {
  entityRelations: unknown[]
  members: unknown[]
  inhabitants: unknown[]
  locationOrgs: unknown[]
}): boolean {
  return (
    groups.entityRelations.length > 0 ||
    groups.members.length > 0 ||
    groups.inhabitants.length > 0 ||
    groups.locationOrgs.length > 0
  )
}

const CAMPAIGN = 'camp-1'

describe('EntityRelationsPanel — permission guard', () => {
  it('allows editing for editor roles', () => {
    for (const role of EDITOR_ROLES) {
      expect(canEdit(role)).toBe(true)
    }
  })

  it('blocks editing for read-only roles', () => {
    for (const role of READONLY_ROLES) {
      expect(canEdit(role)).toBe(false)
    }
  })
})

describe('EntityRelationsPanel — delete URL routing', () => {
  it('routes entity-relation delete to /relations/:id', () => {
    const url = buildDeleteUrl(CAMPAIGN, 'character', 'alice', {
      mode: 'entity-relation',
      relationId: 'rel-1',
    })
    expect(url).toBe(`/api/campaigns/${CAMPAIGN}/relations/rel-1`)
  })

  it('routes org-member delete to /organizations/:slug/members/:characterId', () => {
    const url = buildDeleteUrl(CAMPAIGN, 'organization', 'iron-circle', {
      mode: 'org-member',
      characterId: 'char-1',
    })
    expect(url).toBe(`/api/campaigns/${CAMPAIGN}/organizations/iron-circle/members/char-1`)
  })

  it('routes char-location delete to /locations/:slug/inhabitants/:characterId', () => {
    const url = buildDeleteUrl(CAMPAIGN, 'character', 'alice', {
      mode: 'char-location',
      locationSlug: 'the-shire',
      characterId: 'char-1',
    })
    expect(url).toBe(`/api/campaigns/${CAMPAIGN}/locations/the-shire/inhabitants/char-1`)
  })

  it('routes org-location delete to /locations/:slug/organizations/:organizationId', () => {
    const url = buildDeleteUrl(CAMPAIGN, 'location', 'the-shire', {
      mode: 'org-location',
      locationSlug: 'the-shire',
      organizationId: 'org-1',
    })
    expect(url).toBe(`/api/campaigns/${CAMPAIGN}/locations/the-shire/organizations/org-1`)
  })
})

describe('EntityRelationsPanel — empty state detection', () => {
  it('empty when all groups are empty', () => {
    expect(
      hasAnyRelations({ entityRelations: [], members: [], inhabitants: [], locationOrgs: [] }),
    ).toBe(false)
  })

  it('not empty when entityRelations has items', () => {
    expect(
      hasAnyRelations({ entityRelations: [{}], members: [], inhabitants: [], locationOrgs: [] }),
    ).toBe(true)
  })

  it('not empty when members has items', () => {
    expect(
      hasAnyRelations({ entityRelations: [], members: [{}], inhabitants: [], locationOrgs: [] }),
    ).toBe(true)
  })
})
