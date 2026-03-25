<template>
  <div class="border border-border rounded-lg overflow-hidden">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
      <button @click="toggleBold" :class="['p-1.5 rounded text-xs', editor?.isActive('bold') ? 'bg-accent' : 'hover:bg-accent']" title="Bold">
        <strong>B</strong>
      </button>
      <button @click="toggleItalic" :class="['p-1.5 rounded text-xs', editor?.isActive('italic') ? 'bg-accent' : 'hover:bg-accent']" title="Italic">
        <em>I</em>
      </button>
      <div class="w-px h-4 bg-border mx-1" />
      <button @click="setHeading(1)" :class="['p-1.5 rounded text-xs', editor?.isActive('heading', { level: 1 }) ? 'bg-accent' : 'hover:bg-accent']">H1</button>
      <button @click="setHeading(2)" :class="['p-1.5 rounded text-xs', editor?.isActive('heading', { level: 2 }) ? 'bg-accent' : 'hover:bg-accent']">H2</button>
      <button @click="setHeading(3)" :class="['p-1.5 rounded text-xs', editor?.isActive('heading', { level: 3 }) ? 'bg-accent' : 'hover:bg-accent']">H3</button>
      <div class="w-px h-4 bg-border mx-1" />
      <button @click="toggleBulletList" :class="['p-1.5 rounded text-xs', editor?.isActive('bulletList') ? 'bg-accent' : 'hover:bg-accent']">List</button>
      <button @click="toggleBlockquote" :class="['p-1.5 rounded text-xs', editor?.isActive('blockquote') ? 'bg-accent' : 'hover:bg-accent']">Quote</button>
      <button @click="toggleCode" :class="['p-1.5 rounded text-xs', editor?.isActive('code') ? 'bg-accent' : 'hover:bg-accent']">Code</button>
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
    Placeholder.configure({ placeholder: props.placeholder || 'Start writing...' }),
  ]

  if (props.collaborative && props.documentName) {
    // Collaborative mode: use Y.js + Hocuspocus
    ydoc = new Y.Doc()

    // Fetch a short-lived WS token via HTTP (HttpOnly session cookie sent automatically)
    let wsToken = ''
    try {
      const res = await fetch('/api/ws/token', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        wsToken = data.token
      }
    } catch { /* fallback to empty token — Hocuspocus will reject */ }

    provider = new HocuspocusProvider({
      url: `ws://${window.location.hostname}:3334`,
      name: props.documentName,
      document: ydoc,
      token: wsToken,
    })

    extensions.push(
      StarterKit.configure({ history: false }), // Disable built-in history (Y.js handles undo/redo)
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
    // Solo mode: standard StarterKit with history
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

  // Load initial markdown (solo mode only -- collab mode loads from Hocuspocus)
  if (!props.collaborative && props.modelValue) {
    const parsed = editor.markdown.parse(props.modelValue)
    editor.commands.setContent(parsed)
  }
})

watch(() => props.modelValue, (newVal) => {
  if (!editor || props.collaborative) return // Don't update in collab mode
  const currentMd = editor.getMarkdown()
  if (newVal !== currentMd) {
    const parsed = editor.markdown.parse(newVal)
    editor.commands.setContent(parsed)
  }
})

function toggleBold() { editor?.chain().focus().toggleBold().run() }
function toggleItalic() { editor?.chain().focus().toggleItalic().run() }
function setHeading(level: 1 | 2 | 3) { editor?.chain().focus().toggleHeading({ level }).run() }
function toggleBulletList() { editor?.chain().focus().toggleBulletList().run() }
function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run() }
function toggleCode() { editor?.chain().focus().toggleCode().run() }

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
