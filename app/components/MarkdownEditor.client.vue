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

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorEl = ref<HTMLElement>()
let editor: Editor | null = null

onMounted(() => {
  if (!editorEl.value) return

  editor = new Editor({
    element: editorEl.value,
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({ placeholder: props.placeholder || 'Start writing...' }),
    ],
    content: '',
    onUpdate: ({ editor: e }) => {
      emit('update:modelValue', e.getMarkdown())
    },
  })

  // Load initial markdown content
  if (props.modelValue) {
    const parsed = editor.markdown.parse(props.modelValue)
    editor.commands.setContent(parsed)
  }
})

watch(() => props.modelValue, (newVal) => {
  if (!editor) return
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
</style>
