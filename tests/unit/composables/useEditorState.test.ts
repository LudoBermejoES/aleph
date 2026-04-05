import { describe, it, expect, vi } from 'vitest'
import { useEditorState } from '../../../app/composables/useEditorState'

function makeMockEditor(activeMap: Record<string, boolean>) {
  return {
    isActive: (name: string, opts?: any) => {
      if (name === 'heading' && opts?.level) return activeMap[`heading${opts.level}`] ?? false
      return activeMap[name] ?? false
    },
  } as any
}

describe('useEditorState', () => {
  it('returns all-false initial state', () => {
    const { editorState } = useEditorState()
    expect(editorState.isBold).toBe(false)
    expect(editorState.isItalic).toBe(false)
    expect(editorState.isH1).toBe(false)
  })

  it('updateEditorState reflects active marks', () => {
    const { editorState, updateEditorState } = useEditorState()
    const mockEditor = makeMockEditor({
      bold: true,
      italic: false,
      heading1: true,
      bulletList: true,
    })
    updateEditorState(mockEditor)
    expect(editorState.isBold).toBe(true)
    expect(editorState.isItalic).toBe(false)
    expect(editorState.isH1).toBe(true)
    expect(editorState.isBulletList).toBe(true)
    expect(editorState.isH2).toBe(false)
  })

  it('updateEditorState updates all 13 fields', () => {
    const { editorState, updateEditorState } = useEditorState()
    const all = makeMockEditor({
      bold: true,
      italic: true,
      strike: true,
      code: true,
      heading1: true,
      heading2: true,
      heading3: true,
      bulletList: true,
      orderedList: true,
      taskList: true,
      blockquote: true,
      codeBlock: true,
      link: true,
    })
    updateEditorState(all)
    const keys: (keyof typeof editorState)[] = [
      'isBold',
      'isItalic',
      'isStrike',
      'isCode',
      'isH1',
      'isH2',
      'isH3',
      'isBulletList',
      'isOrderedList',
      'isTaskList',
      'isBlockquote',
      'isCodeBlock',
      'isLink',
    ]
    for (const key of keys) {
      expect(editorState[key], `${key} should be true`).toBe(true)
    }
  })
})
