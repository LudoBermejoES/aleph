// --- Frontmatter Merging ---

/**
 * Merge updated frontmatter into existing, preserving created_at/created.
 */
export function mergeFrontmatter(
  existing: Record<string, unknown>,
  updated: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...existing, ...updated }

  // Never overwrite created/created_at
  if (existing.created !== undefined) result.created = existing.created
  if (existing.created_at !== undefined) result.created_at = existing.created_at

  // Always update modified
  result.modified = new Date().toISOString()

  return result
}

// --- Custom Extensions ---
import { EntityLink } from '../extensions/entity-link'
import { SecretBlock } from '../extensions/secret-block'

// --- Tiptap Markdown Conversion (server-side with jsdom) ---

let _domInitialized = false

function ensureDom() {
  if (_domInitialized) return
  try {
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    ;(global as any).window = dom.window
    ;(global as any).document = dom.window.document
    ;(global as any).navigator = dom.window.navigator
    ;(global as any).Node = dom.window.Node
    ;(global as any).HTMLElement = dom.window.HTMLElement
    _domInitialized = true
  } catch {
    // jsdom not available -- functions will throw
  }
}

/**
 * Convert markdown string to Tiptap JSON document.
 */
export function markdownToTiptap(md: string): Record<string, unknown> {
  ensureDom()
  const { Editor } = require('@tiptap/core')
  const StarterKit = require('@tiptap/starter-kit').default
  const { Markdown } = require('@tiptap/markdown')

  const editor = new Editor({
    extensions: [StarterKit, Markdown, EntityLink, SecretBlock],
    content: '',
  })

  // Use the markdown.parse API for proper markdown → JSON conversion
  const parsed = editor.markdown.parse(md)
  editor.destroy()
  return parsed
}

/**
 * Convert Tiptap JSON document to markdown string.
 */
export function tiptapToMarkdown(json: Record<string, unknown>): string {
  ensureDom()
  const { Editor } = require('@tiptap/core')
  const StarterKit = require('@tiptap/starter-kit').default
  const { Markdown } = require('@tiptap/markdown')

  const editor = new Editor({
    extensions: [StarterKit, Markdown, EntityLink, SecretBlock],
    content: json,
  })

  const md = editor.getMarkdown()
  editor.destroy()
  return md
}

/**
 * Check if markdown survives a round-trip through Tiptap.
 */
export function isRoundTripSafe(md: string): boolean {
  if (!md.trim()) return true
  try {
    const json = markdownToTiptap(md)
    const result = tiptapToMarkdown(json)
    const normalize = (s: string) => s.trim().replace(/\n{3,}/g, '\n\n')
    return normalize(result) === normalize(md)
  } catch {
    return false
  }
}
