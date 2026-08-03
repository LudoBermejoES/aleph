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
    <h1 class="text-2xl font-bold mb-6">
      {{ restricted ? $t('characterNotes.editorTitle') : $t('characters.edit') }}
    </h1>

    <!--
      Full editor. Rendered ONLY when the caller may edit the character's own data, so in
      restricted mode every owner-only input (name, type, status, owner, visibility, template
      fields, backstory, history) is ABSENT from the DOM rather than disabled — a disabled input
      still ships its value and invites a devtools bypass.
    -->
    <CharacterForm
      v-if="loaded && !restricted"
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

    <!-- Image gallery (always shown when loaded) -->
    <EntityImageGallery
      v-if="loaded"
      :images-url="`/api/campaigns/${campaignId}/characters/${slug}/images`"
      :name="form.name"
      :editable="!restricted"
      class="mt-8"
    />

    <!-- Restricted editor: the note field and nothing else. -->
    <form
      v-if="loaded && restricted"
      class="space-y-4"
      data-testid="character-note-only-form"
      @submit.prevent="saveNote"
    >
      <p class="text-sm text-muted-foreground" data-testid="restricted-editor-explanation">
        {{ $t('characterNotes.restrictedExplanation') }}
      </p>
      <div>
        <label class="text-sm font-medium" for="character-note-body">{{
          $t('characterNotes.title')
        }}</label>
        <textarea
          id="character-note-body"
          v-model="noteBody"
          data-testid="note-body-input"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm min-h-[160px] resize-y"
          :placeholder="$t('characterNotes.placeholder')"
        ></textarea>
        <p class="text-xs text-muted-foreground mt-1">{{ $t('characterNotes.emptyDeletes') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <Button type="submit" :disabled="submitting" data-testid="save-note">
          {{ submitting ? '…' : $t('common.save') }}
        </Button>
        <NuxtLink :to="`/campaigns/${campaignId}/characters/${slug}`"
          ><Button type="button" variant="outline">{{ $t('common.cancel') }}</Button></NuxtLink
        >
        <span v-if="noteError" class="text-xs text-destructive" data-testid="note-error">{{
          noteError
        }}</span>
      </div>
    </form>
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

/**
 * Restricted mode: the caller may annotate but not edit. Decided from data the page already
 * has — the character's `ownerUserId` and the caller's campaign role — mirroring the server's
 * `canEditCharacter()`. The UI is not the boundary: the note travels on its own `/notes/me`
 * endpoint that accepts only `{ body }`, and `PUT /characters/:slug` still answers 403 here.
 */
const restricted = ref(false)
const noteBody = ref('')
const noteError = ref('')

onMounted(async () => {
  try {
    // /api/me is awaited explicitly rather than via useCurrentUser(): the ownership comparison
    // below must not race an unresolved useAsyncData on a client-side navigation.
    const [char, campaign, me] = await Promise.all([
      api.getCharacter(slug),
      api.getCampaign(),
      $fetch<{ id: string } | null>('/api/me').catch(() => null),
    ])
    const role = (campaign as { role?: string })?.role ?? ''
    const canEditFull =
      ['dm', 'co_dm', 'editor'].includes(role) ||
      (role === 'player' && !!char.ownerUserId && char.ownerUserId === me?.id)

    if (!canEditFull && !['dm', 'co_dm', 'editor', 'player'].includes(role)) {
      // A visitor has no editor at all
      await router.push(`/campaigns/${campaignId}/characters/${slug}`)
      return
    }

    restricted.value = !canEditFull
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
    if (restricted.value) {
      const mine = await api.getMyCharacterNote(slug).catch(() => ({ note: null }))
      noteBody.value = mine.note?.body ?? ''
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

/** Restricted save: only the note is submitted, never a character field. */
async function saveNote() {
  submitting.value = true
  noteError.value = ''
  try {
    await api.saveMyCharacterNote(slug, noteBody.value)
    await router.push(`/campaigns/${campaignId}/characters/${slug}`)
  } catch (e: unknown) {
    noteError.value =
      (e as { data?: { message?: string } })?.data?.message || t('characterNotes.failedSave')
  } finally {
    submitting.value = false
  }
}
</script>
