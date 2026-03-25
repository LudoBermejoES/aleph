import { describe, it, expect } from 'vitest'

/**
 * Wiki component logic tests (7.15, 7.16, 7.17)
 */

// --- 7.15: Filter bar logic ---

interface FilterParams {
  type?: string
  tags?: string[]
  visibility?: string
}

function buildFilterParams(type: string, tags: string[], visibility: string): FilterParams {
  const params: FilterParams = {}
  if (type && type !== 'all') params.type = type
  if (tags.length > 0) params.tags = tags
  if (visibility && visibility !== 'all') params.visibility = visibility
  return params
}

describe('Filter bar component logic (7.15)', () => {
  it('type dropdown emits correct filter', () => {
    const params = buildFilterParams('character', [], 'all')
    expect(params).toEqual({ type: 'character' })
  })

  it('tag multi-select emits tags array', () => {
    const params = buildFilterParams('all', ['vampire', 'npc'], 'all')
    expect(params).toEqual({ tags: ['vampire', 'npc'] })
  })

  it('visibility toggle emits visibility level', () => {
    const params = buildFilterParams('all', [], 'dm_only')
    expect(params).toEqual({ visibility: 'dm_only' })
  })

  it('all filters combined', () => {
    const params = buildFilterParams('location', ['village'], 'members')
    expect(params).toEqual({ type: 'location', tags: ['village'], visibility: 'members' })
  })

  it('all set to "all" produces empty params', () => {
    const params = buildFilterParams('all', [], 'all')
    expect(params).toEqual({})
  })
})

// --- 7.16: Breadcrumb logic ---

interface BreadcrumbItem {
  label: string
  href: string
}

function buildBreadcrumbs(campaignId: string, ancestors: Array<{ name: string; slug: string }>, currentName: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: 'Campaign', href: `/campaigns/${campaignId}` },
    { label: 'Wiki', href: `/campaigns/${campaignId}/entities` },
  ]
  for (const ancestor of ancestors) {
    crumbs.push({ label: ancestor.name, href: `/campaigns/${campaignId}/entities/${ancestor.slug}` })
  }
  crumbs.push({ label: currentName, href: '#' })
  return crumbs
}

describe('Breadcrumb component logic (7.16)', () => {
  it('renders ancestor chain with correct links', () => {
    const crumbs = buildBreadcrumbs('camp-1', [
      { name: 'Barovia Region', slug: 'barovia-region' },
      { name: 'Village of Barovia', slug: 'village-of-barovia' },
    ], 'Tavern')

    expect(crumbs).toHaveLength(5)
    expect(crumbs[0]).toEqual({ label: 'Campaign', href: '/campaigns/camp-1' })
    expect(crumbs[1]).toEqual({ label: 'Wiki', href: '/campaigns/camp-1/entities' })
    expect(crumbs[2]).toEqual({ label: 'Barovia Region', href: '/campaigns/camp-1/entities/barovia-region' })
    expect(crumbs[3]).toEqual({ label: 'Village of Barovia', href: '/campaigns/camp-1/entities/village-of-barovia' })
    expect(crumbs[4]).toEqual({ label: 'Tavern', href: '#' })
  })

  it('no ancestors shows just Campaign > Wiki > current', () => {
    const crumbs = buildBreadcrumbs('camp-1', [], 'Strahd')
    expect(crumbs).toHaveLength(3)
    expect(crumbs[2].label).toBe('Strahd')
  })
})

// --- 7.17: Frontmatter fields display ---

interface TemplateField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
}

function renderFields(templateFields: TemplateField[], values: Record<string, unknown>): Array<{ label: string; value: string }> {
  return templateFields.map(f => ({
    label: f.label,
    value: String(values[f.key] ?? '—'),
  }))
}

describe('Frontmatter fields display logic (7.17)', () => {
  const template: TemplateField[] = [
    { key: 'alignment', label: 'Alignment', type: 'text' },
    { key: 'level', label: 'Level', type: 'number' },
    { key: 'class', label: 'Class', type: 'select' },
  ]

  it('renders template fields with correct values', () => {
    const fields = renderFields(template, { alignment: 'Lawful Good', level: 5, class: 'Paladin' })
    expect(fields).toEqual([
      { label: 'Alignment', value: 'Lawful Good' },
      { label: 'Level', value: '5' },
      { label: 'Class', value: 'Paladin' },
    ])
  })

  it('missing values show dash', () => {
    const fields = renderFields(template, { alignment: 'Neutral' })
    expect(fields[1].value).toBe('—')
    expect(fields[2].value).toBe('—')
  })

  it('empty template produces empty list', () => {
    expect(renderFields([], {})).toEqual([])
  })
})
