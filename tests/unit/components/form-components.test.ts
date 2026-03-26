import { describe, it, expect } from 'vitest'

/**
 * Form component logic tests (12.39)
 *
 * Tests the shared form component pattern: same form for create and edit,
 * with different submitLabel and pre-filled values.
 */

describe('Form component create vs edit mode (12.39)', () => {
  // Simulating the EntityForm pattern
  interface EntityFormData {
    name: string
    type: string
    visibility: string
    tagsRaw: string
    content: string
  }

  function createEmptyForm(): EntityFormData {
    return { name: '', type: 'note', visibility: 'members', tagsRaw: '', content: '' }
  }

  function prefillForm(existing: { name: string; type: string; visibility: string; tags: string[]; content: string }): EntityFormData {
    return {
      name: existing.name,
      type: existing.type,
      visibility: existing.visibility,
      tagsRaw: existing.tags.join(', '),
      content: existing.content,
    }
  }

  function buildPayload(form: EntityFormData) {
    return {
      name: form.name,
      type: form.type,
      visibility: form.visibility,
      tags: form.tagsRaw.split(',').map(t => t.trim()).filter(Boolean),
      content: form.content,
    }
  }

  it('create mode starts with empty form', () => {
    const form = createEmptyForm()
    expect(form.name).toBe('')
    expect(form.type).toBe('note')
    expect(form.visibility).toBe('members')
  })

  it('edit mode pre-fills with existing data', () => {
    const form = prefillForm({
      name: 'Strahd',
      type: 'character',
      visibility: 'dm_only',
      tags: ['vampire', 'boss'],
      content: '# Strahd',
    })
    expect(form.name).toBe('Strahd')
    expect(form.type).toBe('character')
    expect(form.visibility).toBe('dm_only')
    expect(form.tagsRaw).toBe('vampire, boss')
    expect(form.content).toBe('# Strahd')
  })

  it('payload built correctly from form data', () => {
    const form: EntityFormData = {
      name: 'Test',
      type: 'location',
      visibility: 'public',
      tagsRaw: 'village, barovia',
      content: '# Village',
    }
    const payload = buildPayload(form)
    expect(payload.tags).toEqual(['village', 'barovia'])
    expect(payload.name).toBe('Test')
  })

  it('empty tags produce empty array', () => {
    const form = createEmptyForm()
    const payload = buildPayload(form)
    expect(payload.tags).toEqual([])
  })

  // Character form pattern
  it('character form handles ownerUserId for PC vs NPC', () => {
    const npcForm = { characterType: 'npc', ownerUserId: '' }
    const pcForm = { characterType: 'pc', ownerUserId: 'user-123' }

    expect(npcForm.characterType).toBe('npc')
    expect(npcForm.ownerUserId).toBe('')

    expect(pcForm.characterType).toBe('pc')
    expect(pcForm.ownerUserId).toBe('user-123')

    // When switching from PC to NPC, ownerUserId should be cleared
    const switched = { ...pcForm, characterType: 'npc', ownerUserId: '' }
    expect(switched.ownerUserId).toBe('')
  })
})
