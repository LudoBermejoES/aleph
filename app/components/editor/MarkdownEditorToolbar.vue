<template>
  <div class="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
    <!-- Undo/Redo -->
    <button
      type="button"
      @mousedown.prevent="undo"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.undo')"
    >
      ↩
    </button>
    <button
      type="button"
      @mousedown.prevent="redo"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.redo')"
    >
      ↪
    </button>
    <div class="w-px h-4 bg-border mx-1" />

    <!-- Text formatting -->
    <button
      type="button"
      @mousedown.prevent="toggleBold"
      :class="[
        'p-1.5 rounded text-xs font-bold',
        editorState?.isBold ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.bold')"
    >
      B
    </button>
    <button
      type="button"
      @mousedown.prevent="toggleItalic"
      :class="[
        'p-1.5 rounded text-xs italic',
        editorState?.isItalic ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.italic')"
    >
      I
    </button>
    <button
      type="button"
      @mousedown.prevent="toggleStrike"
      :class="[
        'p-1.5 rounded text-xs line-through',
        editorState?.isStrike ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.strikethrough')"
    >
      S
    </button>
    <button
      type="button"
      @mousedown.prevent="toggleCode"
      :class="[
        'p-1.5 rounded text-xs font-mono',
        editorState?.isCode ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.inlineCode')"
    >
      &lt;/&gt;
    </button>
    <div class="w-px h-4 bg-border mx-1" />

    <!-- Headings -->
    <button
      type="button"
      @mousedown.prevent="setHeading(1)"
      :class="['p-1.5 rounded text-xs', editorState?.isH1 ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.heading1')"
    >
      H1
    </button>
    <button
      type="button"
      @mousedown.prevent="setHeading(2)"
      :class="['p-1.5 rounded text-xs', editorState?.isH2 ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.heading2')"
    >
      H2
    </button>
    <button
      type="button"
      @mousedown.prevent="setHeading(3)"
      :class="['p-1.5 rounded text-xs', editorState?.isH3 ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.heading3')"
    >
      H3
    </button>
    <div class="w-px h-4 bg-border mx-1" />

    <!-- Lists -->
    <button
      type="button"
      @mousedown.prevent="toggleBulletList"
      :class="[
        'p-1.5 rounded text-xs',
        editorState?.isBulletList ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.bulletList')"
    >
      • List
    </button>
    <button
      type="button"
      @mousedown.prevent="toggleOrderedList"
      :class="[
        'p-1.5 rounded text-xs',
        editorState?.isOrderedList ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.orderedList')"
    >
      1. List
    </button>
    <button
      type="button"
      @mousedown.prevent="toggleTaskList"
      :class="['p-1.5 rounded text-xs', editorState?.isTaskList ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.taskList')"
    >
      ☑ Tasks
    </button>
    <div class="w-px h-4 bg-border mx-1" />

    <!-- Blocks -->
    <button
      type="button"
      @mousedown.prevent="toggleBlockquote"
      :class="[
        'p-1.5 rounded text-xs',
        editorState?.isBlockquote ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.blockquote')"
    >
      ❝ Quote
    </button>
    <button
      type="button"
      @mousedown.prevent="toggleCodeBlock"
      :class="[
        'p-1.5 rounded text-xs font-mono',
        editorState?.isCodeBlock ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.codeBlock')"
    >
      {} Block
    </button>
    <button
      type="button"
      @mousedown.prevent="insertHorizontalRule"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.horizontalRule')"
    >
      — HR
    </button>
    <div class="w-px h-4 bg-border mx-1" />

    <!-- Link -->
    <button
      type="button"
      @mousedown.prevent="insertLink"
      :class="['p-1.5 rounded text-xs', editorState?.isLink ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.insertLink')"
    >
      🔗 Link
    </button>

    <!-- Table -->
    <button
      type="button"
      @mousedown.prevent="insertTable"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.insertTable')"
    >
      ⊞ Table
    </button>

    <!-- Image (only shown when campaignId provided) -->
    <template v-if="campaignId">
      <div class="w-px h-4 bg-border mx-1" />
      <button
        type="button"
        @mousedown.prevent="triggerImagePicker"
        class="p-1.5 rounded text-xs hover:bg-accent"
        :title="$t('editor.toolbar.insertImage')"
      >
        🖼 Image
      </button>
      <input
        ref="imageInputEl"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        class="hidden"
        @change="onImageFilePicked"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import type { EditorState } from '~/composables/useEditorState'
import { uploadImage } from '~/composables/useImageUpload'

const props = defineProps<{
  editor: Editor | null
  editorState: EditorState
  campaignId?: string
}>()

const emit = defineEmits<{
  'image-picked': [file: File]
}>()

const imageInputEl = ref<HTMLInputElement>()

function toggleBold() {
  props.editor?.chain().focus().toggleBold().run()
}
function toggleItalic() {
  props.editor?.chain().focus().toggleItalic().run()
}
function toggleStrike() {
  props.editor?.chain().focus().toggleStrike().run()
}
function toggleCode() {
  props.editor?.chain().focus().toggleCode().run()
}
function setHeading(level: 1 | 2 | 3) {
  props.editor?.chain().focus().toggleHeading({ level }).run()
}
function toggleBulletList() {
  props.editor?.chain().focus().toggleBulletList().run()
}
function toggleOrderedList() {
  props.editor?.chain().focus().toggleOrderedList().run()
}
function toggleTaskList() {
  props.editor?.chain().focus().toggleTaskList().run()
}
function toggleBlockquote() {
  props.editor?.chain().focus().toggleBlockquote().run()
}
function toggleCodeBlock() {
  props.editor?.chain().focus().toggleCodeBlock().run()
}
function insertHorizontalRule() {
  props.editor?.chain().focus().setHorizontalRule().run()
}
function undo() {
  props.editor?.chain().focus().undo().run()
}
function redo() {
  props.editor?.chain().focus().redo().run()
}

function insertLink() {
  const url = prompt('Enter URL:')
  if (url) props.editor?.chain().focus().setLink({ href: url }).run()
}

function insertTable() {
  props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
}

function triggerImagePicker() {
  imageInputEl.value?.click()
}

async function onImageFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.campaignId) return
  emit('image-picked', file)
  try {
    const url = await uploadImage(props.campaignId, file)
    props.editor?.chain().focus().setImage({ src: url }).run()
  } catch {
    // silently skip
  } finally {
    input.value = ''
  }
}
</script>
