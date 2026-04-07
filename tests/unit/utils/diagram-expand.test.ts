import { describe, it, expect } from 'vitest'

/**
 * Unit tests for the expand-related-entities logic.
 * Tests the edge-scanning algorithm that identifies which entities
 * to expand for a given org or location.
 */

interface GraphEdge {
  source: string
  target: string
}

function findRelatedIds(
  entityId: string,
  entityType: 'organization' | 'location',
  edges: Record<string, GraphEdge>,
  onCanvas: Set<string>,
): string[] {
  const relatedIds: string[] = []
  for (const [key, edge] of Object.entries(edges)) {
    if (entityType === 'organization') {
      if (
        (key.startsWith('org-member:') || key.startsWith('org-location:')) &&
        edge.source === entityId
      ) {
        if (!onCanvas.has(edge.target)) relatedIds.push(edge.target)
      }
    } else if (entityType === 'location') {
      if (key.startsWith('char-location:') && edge.target === entityId) {
        if (!onCanvas.has(edge.source)) relatedIds.push(edge.source)
      }
      if (key.startsWith('org-location:') && edge.target === entityId) {
        if (!onCanvas.has(edge.source)) relatedIds.push(edge.source)
      }
    }
  }
  return relatedIds
}

describe('expand — organization', () => {
  it('finds member characters and linked locations', () => {
    const edges: Record<string, GraphEdge> = {
      'org-member:org1:char1': { source: 'org1', target: 'ent-a' },
      'org-member:org1:char2': { source: 'org1', target: 'ent-b' },
      'org-location:org1:loc1': { source: 'org1', target: 'loc-x' },
      'org-member:org2:char3': { source: 'org2', target: 'ent-c' }, // different org
    }
    const result = findRelatedIds('org1', 'organization', edges, new Set())
    expect(result).toEqual(['ent-a', 'ent-b', 'loc-x'])
  })

  it('filters out entities already on canvas', () => {
    const edges: Record<string, GraphEdge> = {
      'org-member:org1:char1': { source: 'org1', target: 'ent-a' },
      'org-member:org1:char2': { source: 'org1', target: 'ent-b' },
    }
    const onCanvas = new Set(['ent-a'])
    const result = findRelatedIds('org1', 'organization', edges, onCanvas)
    expect(result).toEqual(['ent-b'])
  })

  it('returns empty when no related edges', () => {
    const edges: Record<string, GraphEdge> = {
      'org-member:org2:char1': { source: 'org2', target: 'ent-a' },
    }
    const result = findRelatedIds('org1', 'organization', edges, new Set())
    expect(result).toEqual([])
  })
})

describe('expand — location', () => {
  it('finds resident characters and linked orgs', () => {
    const edges: Record<string, GraphEdge> = {
      'char-location:ent-a:loc1': { source: 'ent-a', target: 'loc1' },
      'char-location:ent-b:loc1': { source: 'ent-b', target: 'loc1' },
      'org-location:org1:loc1': { source: 'org1', target: 'loc1' },
      'char-location:ent-c:loc2': { source: 'ent-c', target: 'loc2' }, // different location
    }
    const result = findRelatedIds('loc1', 'location', edges, new Set())
    expect(result).toEqual(['ent-a', 'ent-b', 'org1'])
  })

  it('filters out entities already on canvas', () => {
    const edges: Record<string, GraphEdge> = {
      'char-location:ent-a:loc1': { source: 'ent-a', target: 'loc1' },
      'org-location:org1:loc1': { source: 'org1', target: 'loc1' },
    }
    const onCanvas = new Set(['ent-a'])
    const result = findRelatedIds('loc1', 'location', edges, onCanvas)
    expect(result).toEqual(['org1'])
  })

  it('returns empty when all related are on canvas', () => {
    const edges: Record<string, GraphEdge> = {
      'char-location:ent-a:loc1': { source: 'ent-a', target: 'loc1' },
    }
    const onCanvas = new Set(['ent-a'])
    const result = findRelatedIds('loc1', 'location', edges, onCanvas)
    expect(result).toEqual([])
  })
})
