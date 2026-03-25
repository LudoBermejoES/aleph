<template>
  <div class="border border-border rounded-lg overflow-hidden">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
      <!-- Undo/Redo -->
      <button @click="undo" class="p-1.5 rounded text-xs hover:bg-accent" title="Undo (Ctrl+Z)">↩</button>
      <button @click="redo" class="p-1.5 rounded text-xs hover:bg-accent" title="Redo (Ctrl+Shift+Z)">↪</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Text formatting -->
      <button @click="toggleBold" :class="['p-1.5 rounded text-xs font-bold', editor?.isActive('bold') ? 'bg-accent' : 'hover:bg-accent']" title="Bold (Ctrl+B)">B</button>
      <button @click="toggleItalic" :class="['p-1.5 rounded text-xs italic', editor?.isActive('italic') ? 'bg-accent' : 'hover:bg-accent']" title="Italic (Ctrl+I)">I</button>
      <button @click="toggleStrike" :class="['p-1.5 rounded text-xs line-through', editor?.isActive('strike') ? 'bg-accent' : 'hover:bg-accent']" title="Strikethrough">S</button>
      <button @click="toggleCode" :class="['p-1.5 rounded text-xs font-mono', editor?.isActive('code') ? 'bg-accent' : 'hover:bg-accent']" title="Inline Code">&lt;/&gt;</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Headings -->
      <button @click="setHeading(1)" :class="['p-1.5 rounded text-xs', editor?.isActive('heading', { level: 1 }) ? 'bg-accent' : 'hover:bg-accent']" title="Heading 1">H1</button>
      <button @click="setHeading(2)" :class="['p-1.5 rounded text-xs', editor?.isActive('heading', { level: 2 }) ? 'bg-accent' : 'hover:bg-accent']" title="Heading 2">H2</button>
      <button @click="setHeading(3)" :class="['p-1.5 rounded text-xs', editor?.isActive('heading', { level: 3 }) ? 'bg-accent' : 'hover:bg-accent']" title="Heading 3">H3</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Lists -->
      <button @click="toggleBulletList" :class="['p-1.5 rounded text-xs', editor?.isActive('bulletList') ? 'bg-accent' : 'hover:bg-accent']" title="Bullet List">• List</button>
      <button @click="toggleOrderedList" :class="['p-1.5 rounded text-xs', editor?.isActive('orderedList') ? 'bg-accent' : 'hover:bg-accent']" title="Ordered List">1. List</button>
      <button @click="toggleTaskList" :class="['p-1.5 rounded text-xs', editor?.isActive('taskList') ? 'bg-accent' : 'hover:bg-accent']" title="Task List">☑ Tasks</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Blocks -->
      <button @click="toggleBlockquote" :class="['p-1.5 rounded text-xs', editor?.isActive('blockquote') ? 'bg-accent' : 'hover:bg-accent']" title="Blockquote">❝ Quote</button>
      <button @click="toggleCodeBlock" :class="['p-1.5 rounded text-xs font-mono', editor?.isActive('codeBlock') ? 'bg-accent' : 'hover:bg-accent']" title="Code Block">{} Block</button>
      <button @click="insertHorizontalRule" class="p-1.5 rounded text-xs hover:bg-accent" title="Horizontal Rule">— HR</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Link -->
      <button @click="insertLink" :class="['p-1.5 rounded text-xs', editor?.isActive('link') ? 'bg-accent' : 'hover:bg-accent']" title="Insert Link">🔗 Link</button>

      <!-- Table -->
      <button @click="insertTable" class="p-1.5 rounded text-xs hover:bg-accent" title="Insert Table">⊞ Table</button>
    </div>

    <!-- Editor -->
    <div ref="editorEl" class="prose dark:prose-invert max-w-none p-4 min-h-[200px] focus:outline-none" />
  </div>
</template>

<script setup lang="ts">
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import { EntityLink } from '../../server/extensions/entity-link'
import { SecretBlock } from '../../server/extensions/secret-block'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  collaborative?: boolean
  documentName?: string // e.g. "campaign:123:entity:strahd"
  userName?: string
  userColor?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorEl = ref<HTMLElement>()
let editor: Editor | null = null
let provider: HocuspocusProvider | null = null
let ydoc: Y.Doc | null = null

onMounted(async () => {
  if (!editorEl.value) return

  const extensions: any[] = [
    Markdown,
    EntityLink,
    SecretBlock,
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: props.placeholder || 'Start writing...' }),
  ]

  if (props.collaborative && props.documentName) {
    ydoc = new Y.Doc()

    let wsToken = ''
    try {
      const res = await fetch('/api/ws/token', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        wsToken = data.token
      }
    } catch { /* fallback to empty token */ }

    provider = new HocuspocusProvider({
      url: `ws://${window.location.hostname}:3334`,
      name: props.documentName,
      document: ydoc,
      token: wsToken,
    })

    extensions.push(
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: props.userName || 'Anonymous',
          color: props.userColor || '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      }),
    )
  } else {
    extensions.unshift(StarterKit)
  }

  editor = new Editor({
    element: editorEl.value,
    extensions,
    content: '',
    onUpdate: ({ editor: e }) => {
      emit('update:modelValue', e.getMarkdown())
    },
  })

  if (!props.collaborative && props.modelValue) {
    const parsed = editor.markdown.parse(props.modelValue)
    editor.commands.setContent(parsed)
  }
})

watch(() => props.modelValue, (newVal) => {
  if (!editor || props.collaborative) return
  const currentMd = editor.getMarkdown()
  if (newVal !== currentMd) {
    const parsed = editor.markdown.parse(newVal)
    editor.commands.setContent(parsed)
  }
})

// Formatting commands
function toggleBold() { editor?.chain().focus().toggleBold().run() }
function toggleItalic() { editor?.chain().focus().toggleItalic().run() }
function toggleStrike() { editor?.chain().focus().toggleStrike().run() }
function toggleCode() { editor?.chain().focus().toggleCode().run() }
function setHeading(level: 1 | 2 | 3) { editor?.chain().focus().toggleHeading({ level }).run() }
function toggleBulletList() { editor?.chain().focus().toggleBulletList().run() }
function toggleOrderedList() { editor?.chain().focus().toggleOrderedList().run() }
function toggleTaskList() { editor?.chain().focus().toggleTaskList().run() }
function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run() }
function toggleCodeBlock() { editor?.chain().focus().toggleCodeBlock().run() }
function insertHorizontalRule() { editor?.chain().focus().setHorizontalRule().run() }
function undo() { editor?.chain().focus().undo().run() }
function redo() { editor?.chain().focus().redo().run() }

function insertLink() {
  const url = prompt('Enter URL:')
  if (url) {
    editor?.chain().focus().setLink({ href: url }).run()
  }
}

function insertTable() {
  editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

onUnmounted(() => {
  provider?.destroy()
  provider = null
  ydoc?.destroy()
  ydoc = null
  editor?.destroy()
  editor = null
})
</script>

<style>
.ProseMirror:focus {
  outline: none;
}
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  height: 0;
}
/* Task list styles */
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}
.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.ProseMirror ul[data-type="taskList"] li > label {
  flex: 0 0 auto;
  margin-top: 0.25rem;
}
/* Table styles */
.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}
.ProseMirror th, .ProseMirror td {
  border: 1px solid hsl(var(--border));
  padding: 0.5rem;
  min-width: 80px;
}
.ProseMirror th {
  background: hsl(var(--muted));
  font-weight: 600;
}
/* Collaboration cursor styles */
.collaboration-cursor__caret {
  position: relative;
  border-left: 2px solid;
  margin-left: -1px;
  pointer-events: none;
  word-break: normal;
}
.collaboration-cursor__label {
  position: absolute;
  top: -1.4em;
  left: -1px;
  font-size: 10px;
  font-weight: 600;
  line-height: normal;
  padding: 0.1rem 0.3rem;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
  user-select: none;
  color: white;
}
</style>
