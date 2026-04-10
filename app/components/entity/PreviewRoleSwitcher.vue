<template>
  <!-- Only render for DM/Co-DM -->
  <div v-if="isDm">
    <!-- Preview mode banner -->
    <div
      v-if="previewRole"
      class="flex items-center justify-between gap-3 px-4 py-2 mb-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-sm"
    >
      <span class="text-amber-800 dark:text-amber-200 font-medium">{{
        $t('secrets.previewBanner', { role: previewRole })
      }}</span>
      <button
        type="button"
        class="text-amber-700 dark:text-amber-300 underline text-xs hover:no-underline"
        @click="clearPreview"
      >
        {{ $t('secrets.previewAs') }}: DM
      </button>
    </div>

    <!-- Role switcher dropdown -->
    <div class="flex items-center gap-2 mb-4">
      <span class="text-xs text-muted-foreground">{{ $t('secrets.previewAs') }}:</span>
      <select
        :value="previewRole || ''"
        data-testid="preview-role-select"
        class="text-xs rounded border border-input bg-background px-2 py-1"
        @change="onRoleChange"
      >
        <option value="">DM ({{ $t('common.you') }})</option>
        <option value="player">Player</option>
        <option value="visitor">Visitor</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  campaignRole: string
}>()

const emit = defineEmits<{
  change: [role: string | null]
}>()

const route = useRoute()
const router = useRouter()

const isDm = computed(() => ['dm', 'co_dm'].includes(props.campaignRole))
const previewRole = computed(() => (route.query.preview_as as string) || null)

function onRoleChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (!val) {
    clearPreview()
  } else {
    router.replace({ query: { ...route.query, preview_as: val } })
    emit('change', val)
  }
}

function clearPreview() {
  const query = { ...route.query }
  delete query.preview_as
  router.replace({ query })
  emit('change', null)
}
</script>
