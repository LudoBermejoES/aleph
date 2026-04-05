<template>
  <aside v-if="visible && folders.length" class="w-48 shrink-0" data-testid="folder-sidebar">
    <h3 class="text-sm font-semibold mb-2">{{ $t('characters.folders') }}</h3>
    <button
      class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
      :class="{ 'bg-secondary font-medium': !selectedFolder }"
      @click="$emit('select-folder', '')"
    >
      {{ $t('characters.allNpcs') }}
    </button>
    <button
      v-for="f in folders"
      :key="f.id"
      class="block w-full text-left text-sm px-2 py-1 rounded mb-1 hover:bg-secondary"
      :class="{ 'bg-secondary font-medium': selectedFolder === f.id }"
      @click="$emit('select-folder', f.id)"
    >
      {{ f.name }}
    </button>
  </aside>
</template>

<script setup lang="ts">
import type { CharacterFolder } from '~/types/api'

defineProps<{
  folders: CharacterFolder[]
  selectedFolder: string
  visible: boolean
}>()

defineEmits<{
  'select-folder': [folderId: string]
}>()
</script>
