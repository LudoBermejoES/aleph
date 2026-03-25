import { describe, it, expect } from 'vitest'
import { stripSecretBlocks } from '../../../server/services/content'

describe('stripSecretBlocks', () => {
  const secretContent = `# Lore

Public info.

:::secret{.dm}
Hidden treasure location.
:::

More public stuff.
`

  it('DM sees all content including secret blocks', () => {
    const result = stripSecretBlocks(secretContent, 'dm')
    expect(result).toContain('Public info.')
    expect(result).toContain('Hidden treasure location.')
    expect(result).toContain('More public stuff.')
  })

  it('co_dm sees all content', () => {
    const result = stripSecretBlocks(secretContent, 'co_dm')
    expect(result).toContain('Hidden treasure location.')
  })

  it('player has secret{.dm} blocks stripped', () => {
    const result = stripSecretBlocks(secretContent, 'player')
    expect(result).toContain('Public info.')
    expect(result).not.toContain('Hidden treasure location.')
    expect(result).toContain('More public stuff.')
  })

  it('visitor has secret blocks stripped', () => {
    const result = stripSecretBlocks(secretContent, 'visitor')
    expect(result).not.toContain('Hidden treasure location.')
  })

  it('editor sees secret{.editor} blocks', () => {
    const md = `Info.\n\n:::secret{.editor}\nEditor notes.\n:::\n`
    expect(stripSecretBlocks(md, 'editor')).toContain('Editor notes.')
    expect(stripSecretBlocks(md, 'player')).not.toContain('Editor notes.')
  })

  it('content without secret blocks is unchanged', () => {
    const plain = '# Hello\n\nJust regular content.\n'
    expect(stripSecretBlocks(plain, 'player')).toBe(plain)
  })

  it('multiple secret blocks are all stripped for non-DM', () => {
    const md = `A.\n\n:::secret{.dm}\nS1.\n:::\n\nB.\n\n:::secret{.dm}\nS2.\n:::\n\nC.\n`
    const result = stripSecretBlocks(md, 'player')
    expect(result).not.toContain('S1.')
    expect(result).not.toContain('S2.')
    expect(result).toContain('A.')
    expect(result).toContain('B.')
    expect(result).toContain('C.')
  })
})
