import { describe, it, expect } from 'vitest'
import { selectArchivesToKeep } from '../../../server/services/backup'
import type { BackupArchive } from '../../../server/services/backup'

function makeArchive(daysAgo: number): BackupArchive {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(3, 0, 0, 0)
  return {
    key: `backups/aleph-${d.toISOString().replace(/[:.]/g, '-')}.tar.gz`,
    size: 100_000_000,
    lastModified: d,
  }
}

describe('selectArchivesToKeep', () => {
  it('keeps all when fewer than max copies', () => {
    const archives = [makeArchive(0), makeArchive(1)]
    const { kept, pruned } = selectArchivesToKeep(archives)
    expect(kept).toHaveLength(2)
    expect(pruned).toHaveLength(0)
  })

  it('keeps exactly 3 when there are more', () => {
    const archives = Array.from({ length: 10 }, (_, i) => makeArchive(i))
    const { kept, pruned } = selectArchivesToKeep(archives)
    expect(kept).toHaveLength(3)
    expect(pruned).toHaveLength(7)
  })

  it('keeps the 3 most recent', () => {
    const archives = Array.from({ length: 5 }, (_, i) => makeArchive(i))
    const { kept } = selectArchivesToKeep(archives)
    const newest3 = [...archives]
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 3)
      .map((a) => a.key)
    expect(kept).toEqual(newest3)
  })

  it('prunes the oldest ones', () => {
    const archives = Array.from({ length: 5 }, (_, i) => makeArchive(i))
    const { pruned } = selectArchivesToKeep(archives)
    const oldest2 = [...archives]
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(3)
      .map((a) => a.key)
    expect(pruned).toEqual(oldest2)
  })

  it('returns empty for empty input', () => {
    const { kept, pruned } = selectArchivesToKeep([])
    expect(kept).toHaveLength(0)
    expect(pruned).toHaveLength(0)
  })

  it('never prunes the most recent archive', () => {
    const archives = Array.from({ length: 50 }, (_, i) => makeArchive(i))
    const { pruned } = selectArchivesToKeep(archives)
    const newestKey = [...archives].sort(
      (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
    )[0].key
    expect(pruned).not.toContain(newestKey)
  })

  it('respects custom max copies', () => {
    const archives = Array.from({ length: 10 }, (_, i) => makeArchive(i))
    const { kept, pruned } = selectArchivesToKeep(archives, 5)
    expect(kept).toHaveLength(5)
    expect(pruned).toHaveLength(5)
  })
})
