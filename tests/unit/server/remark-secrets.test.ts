import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkDirective from 'remark-directive'
import remarkStringify from 'remark-stringify'
import { remarkStripSecrets } from '../../../server/services/remark-strip-secrets'

async function processMarkdown(md: string, userRole: string, userId?: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(remarkStripSecrets, { userRole, userId })
    .use(remarkStringify)
    .process(md)
  return String(result).trim()
}

describe('remarkStripSecrets', () => {
  const mdWithDmSecret = `# Village Elder

The village elder is respected by all.

:::secret{.dm}
He is actually a vampire in disguise.
:::

Everyone trusts him.`

  const mdWithPlayerSecret = `# Treasure Room

The room glitters with gold.

:::secret{.player:alice,bob}
Alice and Bob noticed a hidden trapdoor.
:::

The chest is locked.`

  it('DM sees all content including dm secrets', async () => {
    const result = await processMarkdown(mdWithDmSecret, 'dm')
    expect(result).toContain('village elder is respected')
    expect(result).toContain('vampire in disguise')
    expect(result).toContain('Everyone trusts him')
  })

  it('player does NOT see dm secret block', async () => {
    const result = await processMarkdown(mdWithDmSecret, 'player')
    expect(result).toContain('village elder is respected')
    expect(result).not.toContain('vampire in disguise')
    expect(result).toContain('Everyone trusts him')
  })

  it('visitor does NOT see dm secret block', async () => {
    const result = await processMarkdown(mdWithDmSecret, 'visitor')
    expect(result).not.toContain('vampire in disguise')
  })

  it('co_dm sees dm secret block', async () => {
    const result = await processMarkdown(mdWithDmSecret, 'co_dm')
    expect(result).toContain('vampire in disguise')
  })

  it('named player (alice) sees player-specific secret', async () => {
    const result = await processMarkdown(mdWithPlayerSecret, 'player', 'alice')
    expect(result).toContain('hidden trapdoor')
  })

  it('named player (bob) sees player-specific secret', async () => {
    const result = await processMarkdown(mdWithPlayerSecret, 'player', 'bob')
    expect(result).toContain('hidden trapdoor')
  })

  it('other player (charlie) does NOT see player-specific secret', async () => {
    const result = await processMarkdown(mdWithPlayerSecret, 'player', 'charlie')
    expect(result).not.toContain('hidden trapdoor')
    expect(result).toContain('room glitters with gold')
    expect(result).toContain('chest is locked')
  })

  it('DM sees player-specific secret regardless', async () => {
    const result = await processMarkdown(mdWithPlayerSecret, 'dm')
    expect(result).toContain('hidden trapdoor')
  })

  it('non-secret content passes through unmodified', async () => {
    const plain = `# Simple Page

Just some text with **bold** and *italic*.

- List item 1
- List item 2`

    const result = await processMarkdown(plain, 'player')
    expect(result).toContain('Simple Page')
    expect(result).toContain('bold')
    expect(result).toContain('List item 1')
  })

  it('handles multiple secret blocks in one document', async () => {
    const md = `# Mixed

Public info.

:::secret{.dm}
DM only info.
:::

More public info.

:::secret{.player:alice}
Alice only info.
:::

Final public info.`

    const resultPlayer = await processMarkdown(md, 'player', 'bob')
    expect(resultPlayer).toContain('Public info')
    expect(resultPlayer).not.toContain('DM only info')
    expect(resultPlayer).not.toContain('Alice only info')
    expect(resultPlayer).toContain('Final public info')

    const resultDm = await processMarkdown(md, 'dm')
    expect(resultDm).toContain('DM only info')
    expect(resultDm).toContain('Alice only info')
  })
})
