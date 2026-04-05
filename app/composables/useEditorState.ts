import type { Editor } from '@tiptap/core'

export interface EditorState {
  isBold: boolean
  isItalic: boolean
  isStrike: boolean
  isCode: boolean
  isH1: boolean
  isH2: boolean
  isH3: boolean
  isBulletList: boolean
  isOrderedList: boolean
  isTaskList: boolean
  isBlockquote: boolean
  isCodeBlock: boolean
  isLink: boolean
}

export function useEditorState() {
  const editorState = reactive<EditorState>({
    isBold: false,
    isItalic: false,
    isStrike: false,
    isCode: false,
    isH1: false,
    isH2: false,
    isH3: false,
    isBulletList: false,
    isOrderedList: false,
    isTaskList: false,
    isBlockquote: false,
    isCodeBlock: false,
    isLink: false,
  })

  function updateEditorState(editor: Editor) {
    editorState.isBold = editor.isActive('bold')
    editorState.isItalic = editor.isActive('italic')
    editorState.isStrike = editor.isActive('strike')
    editorState.isCode = editor.isActive('code')
    editorState.isH1 = editor.isActive('heading', { level: 1 })
    editorState.isH2 = editor.isActive('heading', { level: 2 })
    editorState.isH3 = editor.isActive('heading', { level: 3 })
    editorState.isBulletList = editor.isActive('bulletList')
    editorState.isOrderedList = editor.isActive('orderedList')
    editorState.isTaskList = editor.isActive('taskList')
    editorState.isBlockquote = editor.isActive('blockquote')
    editorState.isCodeBlock = editor.isActive('codeBlock')
    editorState.isLink = editor.isActive('link')
  }

  return { editorState, updateEditorState }
}
