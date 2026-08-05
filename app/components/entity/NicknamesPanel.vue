<template>
  <div class="mt-8 border-t border-border pt-6" data-testid="nicknames-panel">
    <h2 class="text-lg font-semibold mb-3">{{ $t('entities.nicknames.title') }}</h2>

    <div v-if="nicknames.length" class="flex flex-wrap gap-2 mb-3">
      <span
        v-for="n in nicknames"
        :key="n.id"
        data-testid="nickname-chip"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-secondary text-secondary-foreground"
      >
        {{ n.nickname }}
        <button
          v-if="editable"
          type="button"
          data-testid="remove-nickname"
          class="text-muted-foreground hover:text-destructive"
          :aria-label="$t('entities.nicknames.remove')"
          @click="removeNickname(n.id)"
        >
          ×
        </button>
      </span>
    </div>
    <p v-else data-testid="nicknames-empty" class="text-sm text-muted-foreground mb-3">
      {{ $t('entities.nicknames.empty') }}
    </p>

    <form v-if="editable" class="flex gap-2" @submit.prevent="addNickname">
      <input
        v-model="newNickname"
        type="text"
        data-testid="nickname-input"
        :placeholder="$t('entities.nicknames.addPlaceholder')"
        class="flex-1 max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      />
      <Button
        type="submit"
        size="sm"
        data-testid="add-nickname"
        :disabled="!newNickname.trim() || saving"
        >{{ $t('entities.nicknames.add') }}</Button
      >
    </form>

    <ErrorToast v-if="error" :message="error" @dismiss="error = null" />
  </div>
</template>

<script setup lang="ts">
interface Nickname {
  id: string
  entityId: string
  nickname: string
  createdAt: string
}

const props = defineProps<{
  campaignId: string
  entitySlug: string
  editable: boolean
}>()

const { t } = useI18n()
const nicknames = ref<Nickname[]>([])
const newNickname = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

const base = computed(
  () => `/api/campaigns/${props.campaignId}/entities/${props.entitySlug}/nicknames`,
)

async function load() {
  try {
    nicknames.value = await $fetch<Nickname[]>(base.value)
  } catch {
    /* silently ignore */
  }
}

async function addNickname() {
  const value = newNickname.value.trim()
  if (!value) return
  saving.value = true
  try {
    const created = await $fetch<Nickname>(base.value, {
      method: 'POST',
      body: { nickname: value },
    })
    nicknames.value.push(created)
    newNickname.value = ''
  } catch (e: unknown) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message || t('entities.nicknames.failedAdd')
  } finally {
    saving.value = false
  }
}

async function removeNickname(id: string) {
  try {
    await $fetch(`${base.value}/${id}`, { method: 'DELETE' })
    nicknames.value = nicknames.value.filter((n) => n.id !== id)
  } catch (e: unknown) {
    error.value =
      (e as { data?: { message?: string } })?.data?.message || t('entities.nicknames.failedRemove')
  }
}

watch(
  () => props.entitySlug,
  () => load(),
)

onMounted(load)
</script>
