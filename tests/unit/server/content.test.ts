import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestContentDir, type TestContentDir } from '../../helpers/content'
import {
  readEntityFile,
  writeEntityFile,
  deleteEntityFile,
  slugify,
  contentHash,
  baseEntityFrontmatter,
} from '../../../server/services/content'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

describe('Slug Generation', () => {
  it('converts to lowercase kebab-case', () => {
    expect(slugify('The Lost Temple')).toBe('the-lost-temple')
  })

  it('handles special characters', () => {
    expect(slugify("Strahd's Castle!")).toBe('strahd-s-castle')
  })

  it('strips diacritics', () => {
    expect(slugify('Château Résistance')).toBe('chateau-resistance')
  })

  it('handles unicode', () => {
    expect(slugify('Ñoño Über Elf')).toBe('nono-uber-elf')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello')
  })
})

describe('Content Hash', () => {
  it('produces same hash for identical content', () => {
    const hash1 = contentHash('hello world')
    const hash2 = contentHash('hello world')
    expect(hash1).toBe(hash2)
  })

  it('produces different hash for different content', () => {
    const hash1 = contentHash('hello world')
    const hash2 = contentHash('hello world!')
    expect(hash1).not.toBe(hash2)
  })

  it('returns a 32-character hex string', () => {
    const hash = contentHash('test')
    expect(hash).toMatch(/^[a-f0-9]{32}$/)
  })
})

describe('Frontmatter Schema', () => {
  it('accepts valid entity frontmatter', () => {
    const result = baseEntityFrontmatter.safeParse({
      type: 'character',
      name: 'Strahd von Zarovich',
      aliases: ['Strahd', 'The Devil'],
      tags: ['vampire', 'villain'],
      visibility: 'members',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = baseEntityFrontmatter.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = baseEntityFrontmatter.safeParse({ type: 'character' })
    expect(result.success).toBe(false)
  })

  it('applies defaults for optional fields', () => {
    const result = baseEntityFrontmatter.parse({
      type: 'location',
      name: 'Barovia',
    })
    expect(result.aliases).toEqual([])
    expect(result.tags).toEqual([])
    expect(result.visibility).toBe('members')
    expect(result.fields).toEqual({})
  })

  it('rejects invalid visibility value', () => {
    const result = baseEntityFrontmatter.safeParse({
      type: 'character',
      name: 'Test',
      visibility: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('Content Hash — save produces correct hash', () => {
  let testDir: TestContentDir

  beforeEach(() => {
    testDir = createTestContentDir()
  })

  afterEach(() => {
    testDir.cleanup()
  })

  it('writeEntityFile returns hash matching readEntityFile hash', async () => {
    const filePath = join(testDir.root, 'npc', 'vistani.md')
    const fm = {
      type: 'character' as const,
      name: 'Vistani Elder',
      aliases: [] as string[],
      tags: ['npc'],
      visibility: 'members' as const,
      fields: {},
    }
    const body = '# Vistani Elder\n\nA wise traveler.'

    const writeHash = await writeEntityFile(filePath, fm, body)
    const readResult = await readEntityFile(filePath)

    expect(writeHash).toBe(readResult.contentHash)
    expect(writeHash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('hash changes when content is modified', async () => {
    const filePath = join(testDir.root, 'npc', 'madam-eva.md')
    const fm = {
      type: 'character' as const,
      name: 'Madam Eva',
      aliases: [] as string[],
      tags: [],
      visibility: 'members' as const,
      fields: {},
    }

    const hash1 = await writeEntityFile(filePath, fm, '# Madam Eva\n\nOriginal content.')
    const hash2 = await writeEntityFile(filePath, fm, '# Madam Eva\n\nUpdated content.')

    expect(hash1).not.toBe(hash2)
  })
})

describe('File CRUD (temp dir)', () => {
  let testDir: TestContentDir

  beforeEach(() => {
    testDir = createTestContentDir()
  })

  afterEach(() => {
    testDir.cleanup()
  })

  it('writeEntityFile creates file with frontmatter and body', async () => {
    const filePath = join(testDir.root, 'character', 'strahd.md')

    await writeEntityFile(filePath, {
      type: 'character',
      name: 'Strahd von Zarovich',
      aliases: ['Strahd'],
      tags: ['vampire'],
      visibility: 'members',
      fields: {},
    }, '# Strahd\n\nA powerful vampire lord.')

    expect(existsSync(filePath)).toBe(true)

    const raw = readFileSync(filePath, 'utf-8')
    expect(raw).toContain('name: Strahd von Zarovich')
    expect(raw).toContain('type: character')
    expect(raw).toContain('# Strahd')
    expect(raw).toContain('A powerful vampire lord.')
  })

  it('readEntityFile returns parsed frontmatter and content', async () => {
    const filePath = testDir.writeFile('location/barovia.md', `---
type: location
name: Village of Barovia
aliases:
  - Barovia
tags:
  - village
visibility: public
---
# Village of Barovia

A gloomy village.
`)

    const result = await readEntityFile(filePath)
    expect(result.frontmatter.name).toBe('Village of Barovia')
    expect(result.frontmatter.type).toBe('location')
    expect(result.frontmatter.aliases).toEqual(['Barovia'])
    expect(result.frontmatter.visibility).toBe('public')
    expect(result.content).toContain('A gloomy village.')
    expect(result.contentHash).toMatch(/^[a-f0-9]{32}$/)
  })

  it('round-trip: write then read produces same data', async () => {
    const filePath = join(testDir.root, 'item', 'sword.md')
    const fm = {
      type: 'item',
      name: 'Sunblade',
      aliases: [] as string[],
      tags: ['weapon', 'legendary'],
      visibility: 'members' as const,
      fields: {},
    }
    const body = '# Sunblade\n\nA radiant weapon.'

    await writeEntityFile(filePath, fm, body)
    const result = await readEntityFile(filePath)

    expect(result.frontmatter.name).toBe('Sunblade')
    expect(result.frontmatter.type).toBe('item')
    expect(result.frontmatter.tags).toEqual(['weapon', 'legendary'])
    expect(result.content.trim()).toContain('A radiant weapon.')
  })

  it('deleteEntityFile removes the file', async () => {
    const filePath = testDir.writeFile('npc/test.md', '---\ntype: character\nname: Test\n---\nContent')
    expect(existsSync(filePath)).toBe(true)

    await deleteEntityFile(filePath)
    expect(existsSync(filePath)).toBe(false)
  })

  it('deleteEntityFile does not throw for non-existent file', async () => {
    await expect(deleteEntityFile('/nonexistent/path.md')).resolves.not.toThrow()
  })
})
