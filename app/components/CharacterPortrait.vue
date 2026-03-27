<template>
  <div :class="['relative', sizeClass]">
    <!-- Portrait image or placeholder -->
    <img
      v-if="portraitUrl"
      :src="portraitUrl"
      :alt="$t('character.portraitAlt', { name })"
      :class="['rounded-lg object-cover w-full h-full', editable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '']"
      @click="editable && triggerUpload()"
    />
    <div
      v-else
      :class="['rounded-lg bg-secondary flex items-center justify-center w-full h-full', editable ? 'cursor-pointer hover:bg-secondary/70 transition-colors' : '']"
      :title="editable ? $t('character.uploadPortrait') : $t('character.noPortrait')"
      @click="editable && triggerUpload()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="text-muted-foreground" :class="iconSize" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>

    <!-- Upload overlay button for editable -->
    <button
      v-if="editable"
      class="absolute bottom-1 right-1 rounded-full bg-primary p-1 text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      :title="$t('character.uploadPortrait')"
      @click.stop="triggerUpload()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </button>

    <!-- Hidden file input -->
    <input
      v-if="editable"
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- Upload progress overlay -->
    <div v-if="uploading" class="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
      <span class="text-white text-xs">{{ $t('common.loading') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  portraitUrl: string | null
  name: string
  editable?: boolean
  campaignId?: string
  characterSlug?: string
  size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{ (e: 'uploaded', url: string): void }>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const sizeClass = computed(() => ({
  sm: 'w-10 h-10',
  md: 'w-24 h-24',
  lg: 'w-48 h-48',
}[props.size ?? 'md']))

const iconSize = computed(() => ({
  sm: 'w-5 h-5',
  md: 'w-10 h-10',
  lg: 'w-20 h-20',
}[props.size ?? 'md']))

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.campaignId || !props.characterSlug) return

  uploading.value = true
  try {
    const form = new FormData()
    form.append('portrait', file)
    const res = await fetch(`/api/campaigns/${props.campaignId}/characters/${props.characterSlug}/portrait`, {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Upload failed (${res.status})`)
    }
    const data = await res.json()
    emit('uploaded', data.portraitUrl)
  } catch (e) {
    console.error('[CharacterPortrait] upload error', e)
  } finally {
    uploading.value = false
    if (input) input.value = ''
  }
}
</script>
