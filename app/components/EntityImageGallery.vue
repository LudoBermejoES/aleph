<template>
  <section v-if="visible" class="mb-6">
    <h2 class="text-lg font-semibold mb-3">{{ $t('gallery.title') }}</h2>

    <p v-if="uploadError" class="text-sm text-destructive mb-2" data-testid="gallery-error">
      {{ uploadError }}
    </p>

    <div v-if="images.length === 0" class="text-sm text-muted-foreground mb-2">
      {{ $t('gallery.empty') }}
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
      <figure
        v-for="image in images"
        :key="image.id"
        class="rounded border border-border overflow-hidden bg-card"
        data-testid="gallery-item"
      >
        <div class="relative">
          <img
            :src="image.url"
            :alt="image.caption || $t('gallery.imageAlt', { name })"
            class="w-full h-32 object-contain bg-secondary/30"
          />
          <span
            v-if="image.isPrimary"
            class="absolute top-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground"
            data-testid="gallery-primary-badge"
          >
            {{ $t('gallery.main') }}
          </span>
        </div>

        <figcaption class="p-2 text-xs space-y-1">
          <template v-if="editable">
            <input
              v-model="captions[image.id]"
              type="text"
              maxlength="500"
              class="w-full px-2 py-1 rounded border border-input bg-background text-xs"
              :placeholder="$t('gallery.captionPlaceholder')"
              :aria-label="$t('gallery.captionPlaceholder')"
              @blur="saveCaption(image)"
              @keyup.enter="saveCaption(image)"
            />
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-if="!image.isPrimary"
                type="button"
                class="text-primary hover:underline"
                data-testid="gallery-set-main"
                @click="setPrimary(image)"
              >
                {{ $t('gallery.setMain') }}
              </button>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground disabled:opacity-40"
                :disabled="isFirst(image)"
                :aria-label="$t('gallery.moveUp')"
                @click="move(image, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground disabled:opacity-40"
                :disabled="isLast(image)"
                :aria-label="$t('gallery.moveDown')"
                @click="move(image, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="ml-auto text-destructive hover:underline"
                data-testid="gallery-delete"
                @click="remove(image)"
              >
                {{ $t('common.delete') }}
              </button>
            </div>
          </template>
          <span v-else-if="image.caption" class="text-muted-foreground">{{ image.caption }}</span>
        </figcaption>
      </figure>
    </div>

    <div v-if="editable" class="flex items-center gap-2">
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        class="hidden"
        data-testid="gallery-file-input"
        @change="handleFileChange"
      />
      <Button size="sm" :disabled="uploading" data-testid="gallery-upload" @click="pickFile">
        {{ uploading ? $t('common.loading') : $t('gallery.upload') }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
interface GalleryImage {
  id: string
  url: string
  filename: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
  createdAt: string
}

const props = defineProps<{
  imagesUrl: string
  name: string
  editable?: boolean
}>()

const emit = defineEmits<{ (e: 'changed', images: GalleryImage[]): void }>()

const { t } = useI18n()

const images = ref<GalleryImage[]>([])
const captions = reactive<Record<string, string>>({})
const uploading = ref(false)
const uploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const visible = computed(() => props.editable || images.value.length > 0)

function isFirst(image: GalleryImage) {
  return images.value[0]?.id === image.id
}

function isLast(image: GalleryImage) {
  return images.value[images.value.length - 1]?.id === image.id
}

function syncCaptions() {
  for (const image of images.value) captions[image.id] = image.caption ?? ''
}

async function load() {
  images.value = await $fetch<GalleryImage[]>(props.imagesUrl)
  syncCaptions()
  emit('changed', images.value)
}

function errorMessage(err: unknown): string {
  const e = err as { data?: { message?: string }; message?: string }
  return e?.data?.message || e?.message || t('gallery.uploadFailed')
}

function pickFile() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = null
  try {
    const form = new FormData()
    form.append('image', file)
    await $fetch(props.imagesUrl, { method: 'POST', body: form })
    await load()
  } catch (err) {
    uploadError.value = errorMessage(err)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function saveCaption(image: GalleryImage) {
  const next = captions[image.id] ?? ''
  if (next === (image.caption ?? '')) return
  try {
    await $fetch(`${props.imagesUrl}/${image.id}`, {
      method: 'PATCH',
      body: { caption: next || null },
    })
    await load()
  } catch (err) {
    uploadError.value = errorMessage(err)
  }
}

async function setPrimary(image: GalleryImage) {
  try {
    await $fetch(`${props.imagesUrl}/${image.id}`, {
      method: 'PATCH',
      body: { isPrimary: true },
    })
    await load()
  } catch (err) {
    uploadError.value = errorMessage(err)
  }
}

async function move(image: GalleryImage, delta: number) {
  const index = images.value.findIndex((i) => i.id === image.id)
  const neighbour = images.value[index + delta]
  if (!neighbour) return
  try {
    await $fetch(`${props.imagesUrl}/${image.id}`, {
      method: 'PATCH',
      body: { sortOrder: neighbour.sortOrder },
    })
    await $fetch(`${props.imagesUrl}/${neighbour.id}`, {
      method: 'PATCH',
      body: { sortOrder: image.sortOrder },
    })
    await load()
  } catch (err) {
    uploadError.value = errorMessage(err)
  }
}

async function remove(image: GalleryImage) {
  if (!confirm(t('gallery.confirmDelete'))) return
  try {
    await $fetch(`${props.imagesUrl}/${image.id}`, { method: 'DELETE' })
    await load()
  } catch (err) {
    uploadError.value = errorMessage(err)
  }
}

onMounted(load)

defineExpose({ reload: load })
</script>
