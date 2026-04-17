import { describe, it, expect } from 'vitest'

// Test the pure ASCII tree renderer logic by extracting the logic inline
// (since it's not exported — we test the same algorithm directly)

function formatNodeLabel(node) {
  let label = node.name
  if (node.birthYear !== null || node.deathYear !== null) {
    const b = node.birthYear ?? '?'
    const d = node.deathYear != null ? `–${node.deathYear}` : ''
    label += ` (${b}${d})`
  }
  return label
}

function renderAsciiTree(nodes, edges) {
  if (!nodes || nodes.length === 0) return '(empty tree)\n'

  const spouseEdges = edges.filter((e) => e.type === 'spouse_of')
  const spouseOf = new Map()
  for (const e of spouseEdges) {
    spouseOf.set(e.sourceEntityId, e.targetEntityId)
    spouseOf.set(e.targetEntityId, e.sourceEntityId)
  }

  const byGeneration = new Map()
  for (const node of nodes) {
    if (!byGeneration.has(node.generation)) byGeneration.set(node.generation, [])
    byGeneration.get(node.generation).push(node)
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  const placed = new Set()
  let output = ''

  for (const gen of generations) {
    const indent = '  '.repeat(Math.abs(gen))
    const genNodes = byGeneration.get(gen).sort((a, b) => a.x - b.x)
    for (const node of genNodes) {
      if (placed.has(node.entityId)) continue
      placed.add(node.entityId)
      const spouseId = spouseOf.get(node.entityId)
      const spouse = spouseId
        ? nodes.find((n) => n.entityId === spouseId && n.generation === gen)
        : null
      let line = formatNodeLabel(node)
      if (spouse && !placed.has(spouse.entityId)) {
        placed.add(spouse.entityId)
        line += ` = ${formatNodeLabel(spouse)}`
      }
      output += `${indent}${line}\n`
    }
  }
  return output
}

// Test the argument parser logic for --birth-year / --death-year / --gender
function parseUpdateArgs(opts) {
  const body = {}
  if (opts.birthYear !== undefined) {
    body.birthYear = opts.birthYear === '' ? null : parseInt(opts.birthYear, 10)
  }
  if (opts.deathYear !== undefined) {
    body.deathYear = opts.deathYear === '' ? null : parseInt(opts.deathYear, 10)
  }
  if (opts.gender !== undefined) {
    body.gender = opts.gender === '' ? null : opts.gender
  }
  return body
}

describe('character update argument parser', () => {
  it('parses --birth-year as integer', () => {
    expect(parseUpdateArgs({ birthYear: '1200' })).toEqual({ birthYear: 1200 })
  })

  it('parses --death-year as integer', () => {
    expect(parseUpdateArgs({ deathYear: '1260' })).toEqual({ deathYear: 1260 })
  })

  it('parses empty string --death-year as null', () => {
    expect(parseUpdateArgs({ deathYear: '' })).toEqual({ deathYear: null })
  })

  it('parses empty string --gender as null', () => {
    expect(parseUpdateArgs({ gender: '' })).toEqual({ gender: null })
  })

  it('includes only provided fields', () => {
    expect(parseUpdateArgs({ birthYear: '1000' })).toEqual({ birthYear: 1000 })
    expect(parseUpdateArgs({ gender: 'female' })).toEqual({ gender: 'female' })
  })

  it('does not include omitted fields', () => {
    const body = parseUpdateArgs({ birthYear: '1000' })
    expect(body.deathYear).toBeUndefined()
    expect(body.gender).toBeUndefined()
  })
})

describe('ASCII tree renderer', () => {
  const nodes = [
    {
      entityId: 'gp',
      name: 'Grandparent',
      generation: -1,
      x: 0,
      birthYear: 900,
      deathYear: 960,
      gender: null,
    },
    {
      entityId: 'p',
      name: 'Parent',
      generation: 0,
      x: -80,
      birthYear: 930,
      deathYear: null,
      gender: null,
    },
    {
      entityId: 's',
      name: 'Spouse',
      generation: 0,
      x: 80,
      birthYear: 935,
      deathYear: null,
      gender: null,
    },
    {
      entityId: 'c',
      name: 'Child',
      generation: 1,
      x: 0,
      birthYear: null,
      deathYear: null,
      gender: null,
    },
  ]
  const edges = [{ type: 'spouse_of', sourceEntityId: 'p', targetEntityId: 's' }]

  it('renders nodes sorted by generation then x', () => {
    const out = renderAsciiTree(nodes, edges)
    const lines = out.trim().split('\n')
    // Grandparent (gen -1) should come first, then Parent+Spouse (gen 0), then Child (gen 1)
    expect(lines[0]).toContain('Grandparent')
    expect(lines[1]).toContain('Parent')
    expect(lines[2]).toContain('Child')
  })

  it('places spouse pair on same line with "="', () => {
    const out = renderAsciiTree(nodes, edges)
    const line = out.split('\n').find((l) => l.includes('Parent'))
    expect(line).toContain(' = ')
    expect(line).toContain('Spouse')
  })

  it('indents by generation depth', () => {
    const out = renderAsciiTree(nodes, edges)
    const gpLine = out.split('\n').find((l) => l.includes('Grandparent'))
    const childLine = out.split('\n').find((l) => l.includes('Child'))
    // gen -1 → 1 level of indent; gen 1 → 1 level of indent
    expect(gpLine).toMatch(/^ {2}/)
    expect(childLine).toMatch(/^ {2}/)
  })

  it('returns empty tree message for empty nodes', () => {
    expect(renderAsciiTree([], [])).toBe('(empty tree)\n')
    expect(renderAsciiTree(null, [])).toBe('(empty tree)\n')
  })

  it('formatNodeLabel includes year range when present', () => {
    const node = { name: 'Agnus', birthYear: 1000, deathYear: 1060 }
    expect(formatNodeLabel(node)).toBe('Agnus (1000–1060)')
  })

  it('formatNodeLabel uses ? for unknown birthYear', () => {
    const node = { name: 'Unknown', birthYear: null, deathYear: 1060 }
    expect(formatNodeLabel(node)).toBe('Unknown (?–1060)')
  })

  it('formatNodeLabel omits years when both null', () => {
    const node = { name: 'NoYears', birthYear: null, deathYear: null }
    expect(formatNodeLabel(node)).toBe('NoYears')
  })

  it('is deterministic across calls', () => {
    expect(renderAsciiTree(nodes, edges)).toBe(renderAsciiTree(nodes, edges))
  })
})
