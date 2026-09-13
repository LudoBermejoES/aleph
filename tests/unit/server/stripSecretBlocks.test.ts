import { describe, it, expect } from 'vitest'
import { stripSecretBlocks } from '../../../server/services/content'
import { FILTERED_INDEX_ROLE } from '../../../server/services/search'

const DM_BLOCK = `:::secret{.dm}
DM only content.
:::
`

const DM_BLOCK_WITH_ID = `:::secret{.dm #reveal-me}
Revealable DM content.
:::
`

const _PLAYER_BLOCK = `:::secret{.player}
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
    const result = stripSecretBlocks(DM_BLOCK_WITH_ID, 'player', undefined, revealed)
    expect(result).toContain('Revealable DM content.')
    // The secret wrapper should be gone
    expect(result).not.toContain(':::secret{')
  })

  it('unrevealed block is still stripped for player', () => {
    const revealed = new Set<string>() // empty
    const result = stripSecretBlocks(DM_BLOCK_WITH_ID, 'player', undefined, revealed)
    expect(result).not.toContain('Revealable DM content.')
  })

  it('blocks without IDs follow existing stripping logic regardless of revealedBlockIds', () => {
    const revealed = new Set(['some-other-id'])
    const result = stripSecretBlocks(DM_BLOCK, 'player', undefined, revealed)
    // DM_BLOCK has no ID, should still be stripped for player
    expect(result).not.toContain('DM only content.')
  })

  it('DM always sees everything regardless of revealedBlockIds', () => {
    const revealed = new Set<string>()
    expect(stripSecretBlocks(DM_BLOCK_WITH_ID, 'dm', undefined, revealed)).toBe(DM_BLOCK_WITH_ID)
    expect(stripSecretBlocks(DM_BLOCK_WITH_ID, 'co_dm', undefined, revealed)).toBe(DM_BLOCK_WITH_ID)
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
    const result = stripSecretBlocks(content, 'player', undefined, revealed)
    expect(result).toContain('Content A.')
    expect(result).not.toContain('Content B.')
  })
})

describe('stripSecretBlocks - regex captures #id from various formats', () => {
  it('captures id from :::secret{.dm #my-id}', () => {
    const block = `:::secret{.dm #my-id}\nSecret.\n:::\n`
    const result = stripSecretBlocks(block, 'player', undefined, new Set(['my-id']))
    expect(result).toContain('Secret.')
  })

  it('captures id from :::secret{.player:alice #id2}', () => {
    const block = `:::secret{.player:alice #id2}\nAlice secret.\n:::\n`
    const result = stripSecretBlocks(block, 'visitor', undefined, new Set(['id2']))
    // A reveal shows the content regardless of role OR user-list membership — reveals are an
    // explicit DM action that overrides both checks, per the reveal-first ordering below.
    expect(result).toContain('Alice secret.')
  })

  it('no id - id is undefined, revealedBlockIds does not apply', () => {
    const block = `:::secret{.dm}\nNo ID.\n:::\n`
    const result = stripSecretBlocks(block, 'player', undefined, new Set(['anything']))
    expect(result).not.toContain('No ID.')
  })
})

/**
 * The measured defect: `:::secret{.player:aliceId,bobId}` is documented (see
 * `remark-strip-secrets.ts`) as visible only to the LISTED users plus DM/co_dm — but the
 * function every API response actually goes through only ever compared ROLE LEVELS, so it
 * degraded to plain `.player` and any player, listed or not, could read it. Each test below is
 * red against the pre-fix code, which ignored everything after the colon.
 */
describe('stripSecretBlocks - user-specific secret blocks (:::secret{.player:id1,id2})', () => {
  const ALICE = 'user-alice-id'
  const BOB = 'user-bob-id'
  const CHARLIE = 'user-charlie-id'
  const NEEDLE = 'THE-HIDDEN-TRAPDOOR'
  const block = `Public intro.\n\n:::secret{.player:${ALICE},${BOB}}\n${NEEDLE}\n:::\n\nPublic outro.\n`

  it('a listed user sees it', () => {
    const result = stripSecretBlocks(block, 'player', ALICE)
    expect(result).toContain(NEEDLE)
    expect(result).toContain('Public intro.')
    expect(result).toContain('Public outro.')
  })

  it('the second listed user sees it too', () => {
    expect(stripSecretBlocks(block, 'player', BOB)).toContain(NEEDLE)
  })

  it('a DIFFERENT player, same role, does NOT see it — this is the reported leak', () => {
    const result = stripSecretBlocks(block, 'player', CHARLIE)
    expect(result).not.toContain(NEEDLE)
    expect(result).toContain('Public intro.')
    expect(result).toContain('Public outro.')
  })

  it('DM sees it regardless of the list', () => {
    expect(stripSecretBlocks(block, 'dm', CHARLIE)).toContain(NEEDLE)
    expect(stripSecretBlocks(block, 'dm')).toContain(NEEDLE)
  })

  it('co_dm sees it regardless of the list', () => {
    expect(stripSecretBlocks(block, 'co_dm', CHARLIE)).toContain(NEEDLE)
  })

  it('with no userId at all, nobody below co_dm sees it', () => {
    expect(stripSecretBlocks(block, 'player')).not.toContain(NEEDLE)
    expect(stripSecretBlocks(block, 'visitor')).not.toContain(NEEDLE)
  })

  it('tolerates whitespace after the commas in the id list', () => {
    // The outer `:::secret{.SPEC}` regex requires SPEC to contain no whitespace at all (a
    // space right after the colon, or before the closing `}`, stops it from being recognised
    // as a secret block in the first place — a pre-existing regex constraint, not something
    // this fix changes). Space after a comma, mid-list, is the realistic case a DM would type
    // and is what the split-and-trim in the implementation exists to tolerate.
    const spaced = `:::secret{.player:${ALICE}, ${BOB}}\n${NEEDLE}\n:::\n`
    expect(stripSecretBlocks(spaced, 'player', ALICE)).toContain(NEEDLE)
    expect(stripSecretBlocks(spaced, 'player', BOB)).toContain(NEEDLE)
    expect(stripSecretBlocks(spaced, 'player', CHARLIE)).not.toContain(NEEDLE)
  })

  it('role-only blocks (.dm/.editor) are unaffected by a userId being passed', () => {
    const dmBlock = `:::secret{.dm}\nDM only.\n:::\n`
    expect(stripSecretBlocks(dmBlock, 'player', CHARLIE)).not.toContain('DM only.')
    expect(stripSecretBlocks(dmBlock, 'dm', CHARLIE)).toContain('DM only.')

    const editorBlock = `:::secret{.editor}\nEditor notes.\n:::\n`
    expect(stripSecretBlocks(editorBlock, 'editor', CHARLIE)).toContain('Editor notes.')
    expect(stripSecretBlocks(editorBlock, 'player', CHARLIE)).not.toContain('Editor notes.')
  })

  it('the shared FILTERED search index (no per-request userId) never carries a user-listed block', () => {
    // This is the index-side half of the fix: `embeddings.ts`/`search.ts` call
    // stripSecretBlocks(body, FILTERED_INDEX_ROLE) with no userId, because the index has no
    // single reader. A user-list block must therefore be treated as invisible there, exactly
    // like a `.dm` block, never left in on the theory that "visitor" can't match a role anyway.
    const result = stripSecretBlocks(block, FILTERED_INDEX_ROLE)
    expect(result).not.toContain(NEEDLE)
    expect(result).toContain('Public intro.')
  })
})
