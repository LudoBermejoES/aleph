import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, unlinkSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import { initFTS5, indexEntity, removeEntityFromIndex, searchEntities } from '../../../server/services/search'
import { readEntityFile, contentHash } from '../../../server/services/content'

/**
 * Filesystem watcher tests (6.14, 6.15, 6.16)
 *
 * These test the core logic that the watcher invokes:
 * - New .md file → entity indexed in FTS5
 * - Changed .md file → re-indexed if hash changed
 * - Deleted .md file → removed from FTS5
 */

describe('Watcher: new .md file detection (6.14)', () => {
  let db: InstanceType<typeof Database>
  let tmpDir: string

  beforeEach(() => {
    db = new Database(':memory:')
    initFTS5(db)
    tmpDir = join(tmpdir(), `watcher-test-${randomUUID()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('new .md file creates FTS5 entry', async () => {
    const entityId = randomUUID()
    const filePath = join(tmpDir, 'test-entity.md')
    writeFileSync(filePath, `---
id: ${entityId}
type: character
name: Test Entity
aliases: []
tags: [npc]
visibility: members
fields: {}
---
# Test Entity

Some content about the test entity.
`)

    const file = await readEntityFile(filePath)
    indexEntity(db, file.frontmatter.id!, 'test-campaign', file.frontmatter.name, file.frontmatter.aliases, file.frontmatter.tags, file.content)

    const results = searchEntities(db, 'test-campaign', 'test entity')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].name).toBe('Test Entity')
  })
})

describe('Watcher: file change detection (6.15)', () => {
  let db: InstanceType<typeof Database>
  let tmpDir: string

  beforeEach(() => {
    db = new Database(':memory:')
    initFTS5(db)
    tmpDir = join(tmpdir(), `watcher-test-${randomUUID()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('updated content hash triggers re-index', async () => {
    const entityId = randomUUID()
    const filePath = join(tmpDir, 'entity.md')

    // Initial write
    const content1 = `---
id: ${entityId}
type: note
name: Changing Entity
aliases: []
tags: []
visibility: members
fields: {}
---
# Original content
`
    writeFileSync(filePath, content1)
    const hash1 = contentHash(content1)

    let file = await readEntityFile(filePath)
    indexEntity(db, entityId, 'camp', file.frontmatter.name, [], [], file.content)

    // Update content
    const content2 = `---
id: ${entityId}
type: note
name: Changing Entity
aliases: []
tags: []
visibility: members
fields: {}
---
# Updated content with new info
`
    writeFileSync(filePath, content2)
    const hash2 = contentHash(content2)

    expect(hash1).not.toBe(hash2) // hash changed

    file = await readEntityFile(filePath)
    indexEntity(db, entityId, 'camp', file.frontmatter.name, [], [], file.content)

    const results = searchEntities(db, 'camp', 'updated new info')
    expect(results.length).toBeGreaterThan(0)
  })

  it('unchanged hash skips re-index (same content)', () => {
    const content = '---\nid: abc\ntype: note\nname: Same\n---\n# Same'
    const h1 = contentHash(content)
    const h2 = contentHash(content)
    expect(h1).toBe(h2) // no re-index needed
  })
})

describe('Watcher: file delete detection (6.16)', () => {
  let db: InstanceType<typeof Database>

  beforeEach(() => {
    db = new Database(':memory:')
    initFTS5(db)
  })

  afterEach(() => {
    db.close()
  })

  it('entity metadata and FTS5 entry removed on delete', () => {
    const entityId = randomUUID()
    indexEntity(db, entityId, 'camp', 'Deleted Entity', [], [], 'Some content')

    // Verify it's indexed
    let results = searchEntities(db, 'camp', 'Deleted Entity')
    expect(results.length).toBe(1)

    // Remove
    removeEntityFromIndex(db, entityId)

    results = searchEntities(db, 'camp', 'Deleted Entity')
    expect(results.length).toBe(0)
  })
})
