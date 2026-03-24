import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface TestContentDir {
  root: string
  campaignDir: (campaignSlug: string) => string
  writeFile: (relativePath: string, content: string) => string
  cleanup: () => void
}

/**
 * Create a temporary content directory for testing markdown file operations.
 * Call cleanup() in afterEach to remove the temp directory.
 */
export function createTestContentDir(): TestContentDir {
  const root = mkdtempSync(join(tmpdir(), 'aleph-test-content-'))

  return {
    root,

    campaignDir(campaignSlug: string): string {
      const dir = join(root, 'campaigns', campaignSlug)
      mkdirSync(dir, { recursive: true })
      return dir
    },

    writeFile(relativePath: string, content: string): string {
      const fullPath = join(root, relativePath)
      mkdirSync(join(fullPath, '..'), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')
      return fullPath
    },

    cleanup() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}
