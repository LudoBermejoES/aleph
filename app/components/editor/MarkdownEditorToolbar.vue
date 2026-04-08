<template>
  <div class="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-muted/30">
    <!-- Undo/Redo -->
    <button
      type="button"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.undo')"
      @mousedown.prevent="undo"
    >
      ↩
    </button>
    <button
      type="button"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.redo')"
      @mousedown.prevent="redo"
    >
      ↪
    </button>
    <div class="w-px h-4 bg-border mx-1"></div>

    <!-- Text formatting -->
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs font-bold',
        editorState?.isBold ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.bold')"
      @mousedown.prevent="toggleBold"
    >
      B
    </button>
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs italic',
        editorState?.isItalic ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.italic')"
      @mousedown.prevent="toggleItalic"
    >
      I
    </button>
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs line-through',
        editorState?.isStrike ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.strikethrough')"
      @mousedown.prevent="toggleStrike"
    >
      S
    </button>
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs font-mono',
        editorState?.isCode ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.inlineCode')"
      @mousedown.prevent="toggleCode"
    >
      &lt;/&gt;
    </button>
    <div class="w-px h-4 bg-border mx-1"></div>

    <!-- Headings -->
    <button
      type="button"
      :class="['p-1.5 rounded text-xs', editorState?.isH1 ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.heading1')"
      @mousedown.prevent="setHeading(1)"
    >
      H1
    </button>
    <button
      type="button"
      :class="['p-1.5 rounded text-xs', editorState?.isH2 ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.heading2')"
      @mousedown.prevent="setHeading(2)"
    >
      H2
    </button>
    <button
      type="button"
      :class="['p-1.5 rounded text-xs', editorState?.isH3 ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.heading3')"
      @mousedown.prevent="setHeading(3)"
    >
      H3
    </button>
    <div class="w-px h-4 bg-border mx-1"></div>

    <!-- Lists -->
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs',
        editorState?.isBulletList ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.bulletList')"
      @mousedown.prevent="toggleBulletList"
    >
      • List
    </button>
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs',
        editorState?.isOrderedList ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.orderedList')"
      @mousedown.prevent="toggleOrderedList"
    >
      1. List
    </button>
    <button
      type="button"
      :class="['p-1.5 rounded text-xs', editorState?.isTaskList ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.taskList')"
      @mousedown.prevent="toggleTaskList"
    >
      ☑ Tasks
    </button>
    <div class="w-px h-4 bg-border mx-1"></div>

    <!-- Blocks -->
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs',
        editorState?.isBlockquote ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.blockquote')"
      @mousedown.prevent="toggleBlockquote"
    >
      ❝ Quote
    </button>
    <button
      type="button"
      :class="[
        'p-1.5 rounded text-xs font-mono',
        editorState?.isCodeBlock ? 'bg-accent' : 'hover:bg-accent',
      ]"
      :title="$t('editor.toolbar.codeBlock')"
      @mousedown.prevent="toggleCodeBlock"
    >
      {} Block
    </button>
    <button
      type="button"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.horizontalRule')"
      @mousedown.prevent="insertHorizontalRule"
    >
      — HR
    </button>
    <div class="w-px h-4 bg-border mx-1"></div>

    <!-- Link -->
    <button
      type="button"
      :class="['p-1.5 rounded text-xs', editorState?.isLink ? 'bg-accent' : 'hover:bg-accent']"
      :title="$t('editor.toolbar.insertLink')"
      @mousedown.prevent="insertLink"
    >
      🔗 Link
    </button>

    <!-- Table -->
    <button
      type="button"
      class="p-1.5 rounded text-xs hover:bg-accent"
      :title="$t('editor.toolbar.insertTable')"
      @mousedown.prevent="insertTable"
    >
      ⊞ Table
    </button>

    <!-- Image (only shown when campaignId provided) -->
    <template v-if="campaignId">
      <div class="w-px h-4 bg-border mx-1"></div>
      <button
        type="button"
        class="p-1.5 rounded text-xs hover:bg-accent"
        :title="$t('editor.toolbar.insertImage')"
        @mousedown.prevent="triggerImagePicker"
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
