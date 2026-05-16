<template>
  <div class="p-8 max-w-3xl">
    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <NuxtLink :to="`/campaigns/${campaignId}`" class="hover:text-primary">
        {{ $t('common.campaign') }}</NuxtLink
      >
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters`" class="hover:text-primary">{{
        $t('characters.title')
      }}</NuxtLink>
      <span>/</span>
      <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}`" class="hover:text-primary">{{
        form.name || 'Character'
      }}</NuxtLink>
      <span>/</span><span>{{ $t('common.edit') }}</span>
    </div>
    <h1 class="text-2xl font-bold mb-6">{{ $t('characters.edit') }}</h1>
    <CharacterForm
      v-if="loaded"
      ref="charForm"
      v-model="form"
      :campaign-id="campaignId"
      :character-slug="slug"
      :submit-label="$t('common.save')"
      :submitting="submitting"
      @submit="save"
    >
      <template #cancel>
        <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}`"
          ><Button variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink
        >
      </template>
    </CharacterForm>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const campaignId = route.params.id as string
const slug = route.params.slug as string
const submitting = ref(false)
const loaded = ref(false)
const { t } = useI18n()
const form = ref({
  name: '',
  characterType: 'npc',
  status: 'alive',
  visibility: 'members',
  content: '',
  backstory: '',
  history: '',
  currentStatus: '',
  ownerUserId: '',
  locationId: '',
  templateId: '',
  templateFields: {} as Record<string, unknown>,
  birthYear: null as number | null,
  deathYear: null as number | null,
  gender: null as string | null,
})

const api = useCampaignApi(campaignId)
const charForm = ref<{
  saveMemberships: (slug: string) => Promise<void>
  clearDraft: () => void
} | null>(null)

onMounted(async () => {
  try {
    const char = await api.getCharacter(slug)
    form.value = {
      name: char.name || '',
      characterType: char.characterType || 'npc',
      status: char.status || 'alive',
      visibility: char.visibility || 'members',
      content: char.content || '',
      backstory: (char as { backstory?: string | null }).backstory || '',
      history: (char as { history?: string | null }).history || '',
      currentStatus: (char as { currentStatus?: string | null }).currentStatus || '',
      ownerUserId: char.ownerUserId || '',
      locationId: char.locationEntityId || '',
      templateId: char.templateId || '',
      templateFields: (char.fields as Record<string, unknown>) || {},
      birthYear: (char as { birthYear?: number | null }).birthYear ?? null,
      deathYear: (char as { deathYear?: number | null }).deathYear ?? null,
      gender: (char as { gender?: string | null }).gender ?? null,
    }
    loaded.value = true
  } catch {
    alert(t('errors.failedLoad'))
    await router.push(`/campaigns/${campaignId}/characters/${slug}`)
  }
})

async function save() {
  submitting.value = true
  try {
    const {
      locationId,
      templateFields,
      birthYear,
      deathYear,
      gender,
      backstory,
      history,
      currentStatus,
      ...rest
    } = form.value
    await api.updateCharacter(slug, {
      ...rest,
      ...(locationId ? { locationEntityId: locationId } : {}),
      fields: templateFields,
      birthYear: birthYear !== undefined ? birthYear : null,
      deathYear: deathYear !== undefined ? deathYear : null,
      gender: gender !== undefined ? gender : null,
      backstory: backstory || null,
      history: history || null,
      currentStatus: currentStatus || null,
    })
    await charForm.value?.saveMemberships(slug)
    charForm.value?.clearDraft()
    await router.push(`/campaigns/${campaignId}/characters/${slug}`)
  } catch (e: unknown) {
    alert((e as { data?: { message?: string } })?.data?.message || t('characters.failedSave'))
  } finally {
    submitting.value = false
  }
}
</script>
