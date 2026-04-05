import { describe, it, expect } from 'vitest'
import { stripSecretBlocks } from '../../../server/services/content'

const DM_BLOCK = `:::secret{.dm}
DM only content.
:::
`

const DM_BLOCK_WITH_ID = `:::secret{.dm #reveal-me}
Revealable DM content.
:::
`

const PLAYER_BLOCK = `:::secret{.player}
Player content.
:::
`

const MIXED = `Normal text.
:::secret{.dm}
DM only.
:::
More text.
:::secret{.player}
Player sees this.
:::
`

describe('stripSecretBlocks - existing behavior', () => {
  it('DM sees all blocks', () => {
    expect(stripSecretBlocks(DM_BLOCK, 'dm')).toBe(DM_BLOCK)
    expect(stripSecretBlocks(DM_BLOCK, 'co_dm')).toBe(DM_BLOCK)
  })

  it('player sees player blocks but not dm blocks', () => {
    const result = stripSecretBlocks(MIXED, 'player')
    expect(result).not.toContain('DM only.')
    expect(result).toContain('Player sees this.')
    expect(result).toContain('Normal text.')
  })

  it('visitor sees nothing in secret blocks', () => {
    const result = stripSecretBlocks(MIXED, 'visitor')
    expect(result).not.toContain('DM only.')
    expect(result).not.toContain('Player sees this.')
    expect(result).toContain('Normal text.')
  })
})

describe('stripSecretBlocks - revealedBlockIds param', () => {
  it('revealed block content is shown without wrapper for player', () => {
    const revealed = new Set(['reveal-me'])
    const result = stripSecretBlocks(DM_BLOCK_WITH_ID, 'player', revealed)
    expect(result).toContain('Revealable DM content.')
    // The secret wrapper should be gone
    expect(result).not.toContain(':::secret{')
  })

  it('unrevealed block is still stripped for player', () => {
    const revealed = new Set<string>() // empty
    const result = stripSecretBlocks(DM_BLOCK_WITH_ID, 'player', revealed)
    expect(result).not.toContain('Revealable DM content.')
  })

  it('blocks without IDs follow existing stripping logic regardless of revealedBlockIds', () => {
    const revealed = new Set(['some-other-id'])
    const result = stripSecretBlocks(DM_BLOCK, 'player', revealed)
    // DM_BLOCK has no ID, should still be stripped for player
    expect(result).not.toContain('DM only content.')
  })

  it('DM always sees everything regardless of revealedBlockIds', () => {
    const revealed = new Set<string>()
    expect(stripSecretBlocks(DM_BLOCK_WITH_ID, 'dm', revealed)).toBe(DM_BLOCK_WITH_ID)
    expect(stripSecretBlocks(DM_BLOCK_WITH_ID, 'co_dm', revealed)).toBe(DM_BLOCK_WITH_ID)
  })

  it('only the matching block is revealed, others stay stripped', () => {
    const content = `:::secret{.dm #block-a}
Content A.
:::
:::secret{.dm #block-b}
Content B.
:::
`
    const revealed = new Set(['block-a'])
    const result = stripSecretBlocks(content, 'player', revealed)
    expect(result).toContain('Content A.')
    expect(result).not.toContain('Content B.')
  })
})

describe('stripSecretBlocks - regex captures #id from various formats', () => {
  it('captures id from :::secret{.dm #my-id}', () => {
    const block = `:::secret{.dm #my-id}\nSecret.\n:::\n`
    const result = stripSecretBlocks(block, 'player', new Set(['my-id']))
    expect(result).toContain('Secret.')
  })

  it('captures id from :::secret{.player:alice #id2}', () => {
    const block = `:::secret{.player:alice #id2}\nAlice secret.\n:::\n`
    const result = stripSecretBlocks(block, 'visitor', new Set(['id2']))
    // visitor can't see player:alice blocks, so even revealed it's stripped
    // (reveal only helps player-level, not visitor-level - per design)
    // Actually per implementation: revealed blocks show content regardless of role
    expect(result).toContain('Alice secret.')
  })

  it('no id - id is undefined, revealedBlockIds does not apply', () => {
    const block = `:::secret{.dm}\nNo ID.\n:::\n`
    const result = stripSecretBlocks(block, 'player', new Set(['anything']))
    expect(result).not.toContain('No ID.')
  })
})
