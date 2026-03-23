import matter from 'gray-matter'
import { readFile, readdir, stat } from 'fs/promises'
import { join, relative, extname, basename } from 'path'

export interface EntityFile {
  frontmatter: Record<string, unknown>
  content: string
  filePath: string
  relativePath: string
}

/**
 * Read a markdown file and parse its frontmatter
 */
export async function readEntityFile(filePath: string): Promise<EntityFile> {
  const raw = await readFile(filePath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    frontmatter: data,
    content,
    filePath,
    relativePath: filePath,
  }
}

/**
 * Recursively find all .md files in a directory
 */
export async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath))
    } else if (extname(entry.name) === '.md') {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Generate a URL-safe slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
