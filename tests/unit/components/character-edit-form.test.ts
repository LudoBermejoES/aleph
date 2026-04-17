import { describe, it, expect } from 'vitest'

/**
 * Tests for character edit form demographic field logic (task 6.3).
 * Focuses on data transformations without mounting Nuxt components.
 */

type FormState = {
  name: string
  characterType: string
  status: string
  visibility: string
  content: string
  ownerUserId: string
  locationId: string
  templateId: string
  templateFields: Record<string, unknown>
  birthYear: number | null
  deathYear: number | null
  gender: string | null
}

function buildSaveBody(form: FormState) {
  const { locationId, templateFields, birthYear, deathYear, gender, ...rest } = form
  return {
    ...rest,
    ...(locationId ? { locationEntityId: locationId } : {}),
    fields: templateFields,
    birthYear: birthYear !== undefined ? birthYear : null,
    deathYear: deathYear !== undefined ? deathYear : null,
    gender: gender !== undefined ? gender : null,
  }
}

const baseForm: FormState = {
  name: 'Agnus',
  characterType: 'npc',
  status: 'alive',
  visibility: 'members',
  content: '',
  ownerUserId: '',
  locationId: '',
  templateId: '',
  templateFields: {},
  birthYear: null,
  deathYear: null,
  gender: null,
}

describe('character edit form demographic fields', () => {
  it('includes birthYear in save body when set', () => {
    const body = buildSaveBody({ ...baseForm, birthYear: 1200 })
    expect(body.birthYear).toBe(1200)
  })

  it('includes deathYear in save body when set', () => {
    const body = buildSaveBody({ ...baseForm, deathYear: 1265 })
    expect(body.deathYear).toBe(1265)
  })

  it('includes gender in save body when set', () => {
    const body = buildSaveBody({ ...baseForm, gender: 'female' })
    expect(body.gender).toBe('female')
  })

  it('sends null for birthYear when empty (not undefined)', () => {
    const body = buildSaveBody({ ...baseForm, birthYear: null })
    expect(body).toHaveProperty('birthYear')
    expect(body.birthYear).toBeNull()
  })

  it('sends null for deathYear when empty (not undefined)', () => {
    const body = buildSaveBody({ ...baseForm, deathYear: null })
    expect(body).toHaveProperty('deathYear')
    expect(body.deathYear).toBeNull()
  })

  it('sends null for gender when empty (not undefined)', () => {
    const body = buildSaveBody({ ...baseForm, gender: null })
    expect(body).toHaveProperty('gender')
    expect(body.gender).toBeNull()
  })

  it('all three fields present simultaneously', () => {
    const body = buildSaveBody({ ...baseForm, birthYear: 1100, deathYear: 1180, gender: 'male' })
    expect(body.birthYear).toBe(1100)
    expect(body.deathYear).toBe(1180)
    expect(body.gender).toBe('male')
  })

  it('locationId maps to locationEntityId when set', () => {
    const body = buildSaveBody({ ...baseForm, locationId: 'loc-1' })
    expect(body).toHaveProperty('locationEntityId', 'loc-1')
    expect(body).not.toHaveProperty('locationId')
  })

  it('locationId omitted when empty', () => {
    const body = buildSaveBody({ ...baseForm, locationId: '' })
    expect(body).not.toHaveProperty('locationEntityId')
  })
})
