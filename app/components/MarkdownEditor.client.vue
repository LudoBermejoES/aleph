<template>
  <div class="border border-border rounded-lg overflow-hidden">
    <!-- Draft restore banner -->
    <div v-if="hasDraft" class="flex items-center justify-between gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700 text-sm">
      <span class="text-yellow-800 dark:text-yellow-200">You have unsaved changes from a previous session.</span>
      <div class="flex gap-2 shrink-0">
        <button type="button" class="px-2 py-0.5 rounded bg-yellow-200 dark:bg-yellow-700 hover:bg-yellow-300 dark:hover:bg-yellow-600 text-yellow-900 dark:text-yellow-100 text-xs font-medium" @click="onRestoreDraft">Restore draft</button>
        <button type="button" class="px-2 py-0.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-800 text-yellow-700 dark:text-yellow-300 text-xs" @click="onDiscardDraft">Discard</button>
      </div>
    </div>
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
      <!-- Undo/Redo -->
      <button type="button" @mousedown.prevent="undo" class="p-1.5 rounded text-xs hover:bg-accent" title="Undo (Ctrl+Z)">↩</button>
      <button type="button" @mousedown.prevent="redo" class="p-1.5 rounded text-xs hover:bg-accent" title="Redo (Ctrl+Shift+Z)">↪</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Text formatting -->
      <button type="button" @mousedown.prevent="toggleBold" :class="['p-1.5 rounded text-xs font-bold', editorState?.isBold ? 'bg-accent' : 'hover:bg-accent']" title="Bold (Ctrl+B)">B</button>
      <button type="button" @mousedown.prevent="toggleItalic" :class="['p-1.5 rounded text-xs italic', editorState?.isItalic ? 'bg-accent' : 'hover:bg-accent']" title="Italic (Ctrl+I)">I</button>
      <button type="button" @mousedown.prevent="toggleStrike" :class="['p-1.5 rounded text-xs line-through', editorState?.isStrike ? 'bg-accent' : 'hover:bg-accent']" title="Strikethrough">S</button>
      <button type="button" @mousedown.prevent="toggleCode" :class="['p-1.5 rounded text-xs font-mono', editorState?.isCode ? 'bg-accent' : 'hover:bg-accent']" title="Inline Code">&lt;/&gt;</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Headings -->
      <button type="button" @mousedown.prevent="setHeading(1)" :class="['p-1.5 rounded text-xs', editorState?.isH1 ? 'bg-accent' : 'hover:bg-accent']" title="Heading 1">H1</button>
      <button type="button" @mousedown.prevent="setHeading(2)" :class="['p-1.5 rounded text-xs', editorState?.isH2 ? 'bg-accent' : 'hover:bg-accent']" title="Heading 2">H2</button>
      <button type="button" @mousedown.prevent="setHeading(3)" :class="['p-1.5 rounded text-xs', editorState?.isH3 ? 'bg-accent' : 'hover:bg-accent']" title="Heading 3">H3</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Lists -->
      <button type="button" @mousedown.prevent="toggleBulletList" :class="['p-1.5 rounded text-xs', editorState?.isBulletList ? 'bg-accent' : 'hover:bg-accent']" title="Bullet List">• List</button>
      <button type="button" @mousedown.prevent="toggleOrderedList" :class="['p-1.5 rounded text-xs', editorState?.isOrderedList ? 'bg-accent' : 'hover:bg-accent']" title="Ordered List">1. List</button>
      <button type="button" @mousedown.prevent="toggleTaskList" :class="['p-1.5 rounded text-xs', editorState?.isTaskList ? 'bg-accent' : 'hover:bg-accent']" title="Task List">☑ Tasks</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Blocks -->
      <button type="button" @mousedown.prevent="toggleBlockquote" :class="['p-1.5 rounded text-xs', editorState?.isBlockquote ? 'bg-accent' : 'hover:bg-accent']" title="Blockquote">❝ Quote</button>
      <button type="button" @mousedown.prevent="toggleCodeBlock" :class="['p-1.5 rounded text-xs font-mono', editorState?.isCodeBlock ? 'bg-accent' : 'hover:bg-accent']" title="Code Block">{} Block</button>
      <button type="button" @mousedown.prevent="insertHorizontalRule" class="p-1.5 rounded text-xs hover:bg-accent" title="Horizontal Rule">— HR</button>
      <div class="w-px h-4 bg-border mx-1" />

      <!-- Link -->
      <button type="button" @mousedown.prevent="insertLink" :class="['p-1.5 rounded text-xs', editorState?.isLink ? 'bg-accent' : 'hover:bg-accent']" title="Insert Link">🔗 Link</button>

      <!-- Table -->
      <button type="button" @mousedown.prevent="insertTable" class="p-1.5 rounded text-xs hover:bg-accent" title="Insert Table">⊞ Table</button>

      <!-- Image (only shown when campaignId provided) -->
      <template v-if="campaignId">
        <div class="w-px h-4 bg-border mx-1" />
        <button type="button" @mousedown.prevent="triggerImagePicker" class="p-1.5 rounded text-xs hover:bg-accent" title="Insert Image">🖼 Image</button>
        <input ref="imageInputEl" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onImageFilePicked" />
      </template>
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
import { ImagePlus } from 'tiptap-image-plus'
import { FileHandler } from '@tiptap/extension-file-handler'
import { EntityLink } from '../../server/extensions/entity-link'
import { SecretBlock } from '../../server/extensions/secret-block'
import { EntityMention } from '../extensions/entity-mention'
import { uploadImage } from '../composables/useImageUpload'
import { useEditorDraft } from '../composables/useEditorDraft'

// Override the node name back to 'image' so @tiptap/markdown serialises it as ![](url)
const ImagePlusFixed = ImagePlus.extend({ name: 'image' })

const props = defineProps<{
  modelValue: string
  placeholder?: string
  collaborative?: boolean
  documentName?: string // e.g. "campaign:123:entity:strahd"
  userName?: string
  userColor?: string
  campaignId?: string
  draftKey?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorEl = ref<HTMLElement>()
const imageInputEl = ref<HTMLInputElement>()
let editor: Editor | null = null
let provider: HocuspocusProvider | null = null
let ydoc: Y.Doc | null = null

const draftKeyRef = computed(() => props.draftKey ?? null)
const serverContentRef = computed(() => props.modelValue)
const { hasDraft, draftContent, scheduleDraftWrite, discardDraft } = useEditorDraft(draftKeyRef, serverContentRef)

function onRestoreDraft() {
  if (!editor || draftContent.value === null) return
  const parsed = editor.markdown.parse(draftContent.value)
  editor.commands.setContent(parsed)
  emit('update:modelValue', draftContent.value)
  discardDraft()
}

function onDiscardDraft() {
  discardDraft()
}

const editorState = reactive({
  isBold: false, isItalic: false, isStrike: false, isCode: false,
  isH1: false, isH2: false, isH3: false,
  isBulletList: false, isOrderedList: false, isTaskList: false,
  isBlockquote: false, isCodeBlock: false, isLink: false,
})

function updateEditorState() {
  if (!editor) return
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

async function initEditor() {
  if (!editorEl.value || editor) return

  const extensions: any[] = [
    Markdown,
    EntityLink,
    SecretBlock,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: props.placeholder || 'Start writing...' }),
    ImagePlusFixed.configure({ allowBase64: false }),
    ...(props.campaignId ? [FileHandler.configure({
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      onPaste: async (ed, files) => {
        for (const file of files) {
          try {
            const url = await uploadImage(props.campaignId!, file)
            ed.chain().focus().setImage({ src: url }).run()
          } catch { /* silently skip */ }
        }
      },
      onDrop: async (ed, files, pos) => {
        for (const file of files) {
          try {
            const url = await uploadImage(props.campaignId!, file)
            ed.chain().focus().setImage({ src: url }).run()
            ed.commands.setNodeSelection(pos)
          } catch { /* silently skip */ }
        }
      },
    })] : []),
  ]

  // Add entity mention autocomplete if campaignId is provided
  if (props.campaignId) {
    try {
    extensions.push(
      EntityMention.configure({
        campaignId: props.campaignId,
        suggestion: {
          char: '@',
          items: async ({ query }: { query: string }) => {
            if (!query || query.length < 1) return []
            try {
              const res = await useCampaignApi(props.campaignId).getEntities({ search: query, limit: '8' })
              const items = res.entities.map((e) => ({
                id: e.id,
                name: e.name,
                slug: e.slug,
                type: e.type,
              }))
              return items
            } catch {
              return []
            }
          },
          command: ({ editor: ed, range, props: item }: any) => {
            ed.chain().focus().deleteRange(range).insertContent({
              type: 'entityMention',
              attrs: { slug: item.slug, label: item.name, id: item.id },
            }).run()
          },
          render: () => {
            let dropdown: HTMLElement | null = null
            let selectedIndex = 0
            let currentItems: any[] = []
            let currentCommand: any = null

            function updateDropdown(items: any[], command: any, clientRect: (() => DOMRect) | null) {
              currentItems = items
              currentCommand = command
              selectedIndex = 0

              if (!items.length) {
                removeDropdown()
                return
              }

              if (!dropdown) {
                dropdown = document.createElement('div')
                dropdown.setAttribute('data-testid', 'entity-suggestions')
                dropdown.className = 'fixed z-[9999] bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto'
                document.body.appendChild(dropdown)
              }

              if (clientRect) {
                const rect = clientRect()
                dropdown.style.left = `${rect.left}px`
                dropdown.style.top = `${rect.bottom + 4}px`
                dropdown.style.minWidth = '200px'
              }

              renderItems()
            }

            function renderItems() {
              if (!dropdown) return
              dropdown.innerHTML = ''
              currentItems.forEach((item, i) => {
                const btn = document.createElement('button')
                btn.className = `block w-full text-left px-3 py-2 text-sm cursor-pointer ${i === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'}`
                btn.innerHTML = `<span class="font-medium">${item.name}</span> <span class="text-xs text-muted-foreground ml-1">${item.type}</span>`
                btn.addEventListener('mousedown', (e) => {
                  e.preventDefault()
                  currentCommand?.(item)
                })
                dropdown!.appendChild(btn)
              })
            }

            function removeDropdown() {
              dropdown?.remove()
              dropdown = null
              currentItems = []
            }

            return {
              onStart: (renderProps: any) => {
                updateDropdown(renderProps.items, renderProps.command, renderProps.clientRect)
              },
              onUpdate: (renderProps: any) => {
                updateDropdown(renderProps.items, renderProps.command, renderProps.clientRect)
              },
              onKeyDown: (renderProps: any) => {
                if (!currentItems.length) return false
                if (renderProps.event.key === 'Escape') { removeDropdown(); return true }
                if (renderProps.event.key === 'ArrowDown') {
                  selectedIndex = (selectedIndex + 1) % currentItems.length
                  renderItems()
                  return true
                }
                if (renderProps.event.key === 'ArrowUp') {
                  selectedIndex = (selectedIndex + currentItems.length - 1) % currentItems.length
                  renderItems()
                  return true
                }
                if (renderProps.event.key === 'Enter') {
                  const item = currentItems[selectedIndex]
                  if (item) currentCommand?.(item)
                  return true
                }
                return false
              },
              onExit: () => { removeDropdown() },
            }
          },
        },
      }),
    )
    } catch (e) {
      console.warn('[Aleph:Mention] Failed to initialize entity mention, editor will work without @autocomplete:', e)
    }
  }

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
      StarterKit.configure({ history: false, link: { openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } } }),
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
    extensions.unshift(StarterKit.configure({ link: { openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } } }))
  }

  try {
  editor = new Editor({
    element: editorEl.value,
    extensions,
    content: '',
    onUpdate: ({ editor: e }) => {
      const md = e.getMarkdown()
      emit('update:modelValue', md)
      scheduleDraftWrite(md)
      updateEditorState()
    },
    onSelectionUpdate: () => updateEditorState(),
  })
  } catch (e) {
    console.error('[Aleph] Editor init failed:', e)
  }

  if (!props.collaborative && props.modelValue && editor) {
    const parsed = editor.markdown.parse(props.modelValue)
    editor.commands.setContent(parsed)
  }
}

// Try on mount, retry via watch if ref isn't ready yet (Suspense timing)
onMounted(async () => {
  await nextTick()
  await initEditor()
})

watch(editorEl, async (el) => {
  if (el && !editor) {
    await initEditor()
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

function triggerImagePicker() {
  imageInputEl.value?.click()
}

async function onImageFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.campaignId) return
  try {
    const url = await uploadImage(props.campaignId, file)
    editor?.chain().focus().setImage({ src: url }).run()
  } catch {
    // silently skip
  } finally {
    input.value = ''
  }
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
.ProseMirror {
  color: hsl(var(--foreground));
}
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
/* Entity mention styles */
.entity-mention {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
  font-weight: 500;
  cursor: pointer;
}
/* Image styles */
.ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 0.25rem;
  cursor: default;
}
.ProseMirror img.ProseMirror-selectednode {
  outline: 2px solid hsl(var(--primary));
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
