import { describe, it, expect } from 'vitest'

// Logic extracted from RelationFormDialog for unit testing
// These match the validation and mode-detection logic in the component

interface SourceEntity {
  id: string
  type: string
  slug: string
  name: string
}

interface RelationData {
  id: string
  sourceEntityId: string
  targetEntityId: string
  relatedEntityId: string
  relatedEntityName: string | null
  relatedEntitySlug: string | null
  relatedEntityType: string | null
  relationTypeId: string | null
  forwardLabel: string
  reverseLabel: string
  attitude: number | null
  description: string | null
}

function isAddMode(relation: RelationData | undefined): boolean {
  return relation === undefined
}

function isValid(formTargetEntityId: string | null, formForwardLabel: string): boolean {
  return !!formTargetEntityId && !!formForwardLabel.trim()
}

function buildSavePayload(
  source: SourceEntity,
  targetEntityId: string,
  relationTypeId: string | null,
  forwardLabel: string,
  reverseLabel: string,
  attitude: number | null,
  description: string | null,
) {
  return {
    sourceEntityId: source.id,
    targetEntityId,
    relationTypeId,
    forwardLabel,
    reverseLabel,
    attitude,
    description,
  }
}

function prefillFromRelation(relation: RelationData) {
  return {
    targetEntityId: relation.relatedEntityId,
    targetEntityName: relation.relatedEntityName,
    targetEntitySlug: relation.relatedEntitySlug,
    relationTypeId: relation.relationTypeId,
    forwardLabel: relation.forwardLabel,
    reverseLabel: relation.reverseLabel,
    attitude: relation.attitude,
    description: relation.description,
  }
}

const sourceEntity: SourceEntity = {
  id: 'char-1',
  type: 'character',
  slug: 'alice',
  name: 'Alice',
}

const existingRelation: RelationData = {
  id: 'rel-1',
  sourceEntityId: 'char-1',
  targetEntityId: 'char-2',
  relatedEntityId: 'char-2',
  relatedEntityName: 'Bob',
  relatedEntitySlug: 'bob',
  relatedEntityType: 'character',
  relationTypeId: 'ally',
  forwardLabel: 'ally of',
  reverseLabel: 'ally of',
  attitude: 50,
  description: 'Old friends',
}

describe('RelationFormDialog — mode detection', () => {
  it('is in add mode when no relation is passed', () => {
    expect(isAddMode(undefined)).toBe(true)
  })

  it('is in edit mode when a relation is passed', () => {
    expect(isAddMode(existingRelation)).toBe(false)
  })
})

describe('RelationFormDialog — pre-fill in edit mode', () => {
  it('pre-fills all fields from existing relation', () => {
    const prefilled = prefillFromRelation(existingRelation)
    expect(prefilled.targetEntityId).toBe('char-2')
    expect(prefilled.relationTypeId).toBe('ally')
    expect(prefilled.forwardLabel).toBe('ally of')
    expect(prefilled.attitude).toBe(50)
    expect(prefilled.description).toBe('Old friends')
  })
})

describe('RelationFormDialog — validation', () => {
  it('invalid when target entity not selected', () => {
    expect(isValid(null, 'ally of')).toBe(false)
  })

  it('invalid when forward label is empty', () => {
    expect(isValid('char-2', '')).toBe(false)
    expect(isValid('char-2', '   ')).toBe(false)
  })

  it('valid with target and label', () => {
    expect(isValid('char-2', 'ally of')).toBe(true)
  })
})

describe('RelationFormDialog — save payload', () => {
  it('includes source entity id', () => {
    const payload = buildSavePayload(sourceEntity, 'char-2', 'ally', 'ally of', 'ally of', 50, null)
    expect(payload.sourceEntityId).toBe('char-1')
    expect(payload.targetEntityId).toBe('char-2')
    expect(payload.relationTypeId).toBe('ally')
    expect(payload.attitude).toBe(50)
    expect(payload.description).toBeNull()
  })
})
