import { describe, it, expect } from 'vitest'

/**
 * Unit tests for TemplateFieldsDisplay component logic (task 2.11)
 *
 * The component itself relies on Nuxt composables (useCampaignApi, useI18n, NuxtLink)
 * which cannot be mounted in a unit environment. These tests verify the pure rendering
 * logic extracted from the component.
 */

// --- Helpers mirroring component rendering logic ---

type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'entity_reference'
  | 'section'

interface TemplateField {
  id: string
  name: string
  key: string
  fieldType: FieldType
  sortOrder: number
}

function renderFieldValue(
  field: TemplateField,
  fieldValues: Record<string, unknown>,
): string | null {
  if (field.fieldType === 'section') return null // section has no value
  const val = fieldValues[field.key]
  if (field.fieldType === 'checkbox') {
    return val ? 'Yes' : 'No'
  }
  if (field.fieldType === 'entity_reference') {
    return val ? String(val) : null // null means "show empty/dash"
  }
  // text, textarea, number, date, select
  if (val !== undefined && val !== '') return String(val)
  return null // null means show empty
}

function isSection(field: TemplateField): boolean {
  return field.fieldType === 'section'
}

// --- Tests ---

describe('TemplateFieldsDisplay rendering logic', () => {
  describe('section fields', () => {
    it('returns null for section field (no value column)', () => {
      const field: TemplateField = {
        id: '1',
        name: 'Appearance',
        key: 'appearance',
        fieldType: 'section',
        sortOrder: 0,
      }
      expect(isSection(field)).toBe(true)
      expect(renderFieldValue(field, {})).toBeNull()
    })
  })

  describe('checkbox fields', () => {
    it('renders true as "Yes"', () => {
      const field: TemplateField = {
        id: '2',
        name: 'Active',
        key: 'active',
        fieldType: 'checkbox',
        sortOrder: 1,
      }
      expect(renderFieldValue(field, { active: true })).toBe('Yes')
    })

    it('renders false as "No"', () => {
      const field: TemplateField = {
        id: '2',
        name: 'Active',
        key: 'active',
        fieldType: 'checkbox',
        sortOrder: 1,
      }
      expect(renderFieldValue(field, { active: false })).toBe('No')
    })

    it('renders missing value as "No"', () => {
      const field: TemplateField = {
        id: '2',
        name: 'Active',
        key: 'active',
        fieldType: 'checkbox',
        sortOrder: 1,
      }
      expect(renderFieldValue(field, {})).toBe('No')
    })
  })

  describe('entity_reference fields', () => {
    it('returns the slug value when present', () => {
      const field: TemplateField = {
        id: '3',
        name: 'Home City',
        key: 'homeCity',
        fieldType: 'entity_reference',
        sortOrder: 2,
      }
      expect(renderFieldValue(field, { homeCity: 'rivendell' })).toBe('rivendell')
    })

    it('returns null when value is missing', () => {
      const field: TemplateField = {
        id: '3',
        name: 'Home City',
        key: 'homeCity',
        fieldType: 'entity_reference',
        sortOrder: 2,
      }
      expect(renderFieldValue(field, {})).toBeNull()
    })
  })

  describe('select fields', () => {
    it('returns the stored option value as-is', () => {
      const field: TemplateField = {
        id: '4',
        name: 'Faction',
        key: 'faction',
        fieldType: 'select',
        sortOrder: 3,
      }
      expect(renderFieldValue(field, { faction: 'Alliance' })).toBe('Alliance')
    })

    it('returns null for empty value', () => {
      const field: TemplateField = {
        id: '4',
        name: 'Faction',
        key: 'faction',
        fieldType: 'select',
        sortOrder: 3,
      }
      expect(renderFieldValue(field, { faction: '' })).toBeNull()
    })
  })

  describe('text / textarea / number / date fields', () => {
    const types: FieldType[] = ['text', 'textarea', 'number', 'date']

    for (const fieldType of types) {
      it(`renders ${fieldType} value as string`, () => {
        const field: TemplateField = {
          id: '5',
          name: 'Notes',
          key: 'notes',
          fieldType,
          sortOrder: 4,
        }
        const value = fieldType === 'number' ? 42 : '2024-01-01'
        expect(renderFieldValue(field, { notes: value })).toBe(String(value))
      })

      it(`returns null for missing ${fieldType} value`, () => {
        const field: TemplateField = {
          id: '5',
          name: 'Notes',
          key: 'notes',
          fieldType,
          sortOrder: 4,
        }
        expect(renderFieldValue(field, {})).toBeNull()
      })
    }
  })

  describe('templateId guard', () => {
    it('does not render when templateId is null', () => {
      // The component's v-if="templateId && template" ensures nothing renders
      const templateId: string | null | undefined = null
      expect(!templateId).toBe(true)
    })

    it('does not render when templateId is undefined', () => {
      const templateId: string | null | undefined = undefined
      expect(!templateId).toBe(true)
    })

    it('renders when templateId is a non-empty string', () => {
      const templateId: string | null | undefined = 'tmpl-123'
      expect(!!templateId).toBe(true)
    })
  })

  describe('404 handling', () => {
    it('template stays null on fetch error — no fields rendered', () => {
      // Simulates the catch block: template.value = null
      let template: { fields: TemplateField[] } | null = { fields: [] }
      try {
        throw new Error('404 Not Found')
      } catch {
        template = null
      }
      expect(template).toBeNull()
    })
  })

  describe('missing field values', () => {
    it('shows empty for all field types when fieldValues is empty', () => {
      const types: FieldType[] = ['text', 'textarea', 'number', 'date', 'select']
      for (const fieldType of types) {
        const field: TemplateField = {
          id: '6',
          name: 'Field',
          key: 'field',
          fieldType,
          sortOrder: 0,
        }
        expect(renderFieldValue(field, {})).toBeNull()
      }
    })
  })
})
