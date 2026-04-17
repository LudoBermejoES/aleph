<template>
  <form class="space-y-6" @submit.prevent="$emit('submit')">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('characters.name') }}</label>
        <input
          v-model="form.name"
          required
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('characters.namePlaceholder')"
        />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.type') }}</label>
        <select
          v-model="form.characterType"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="npc">{{ $t('characters.npc') }}</option>
          <option value="pc">{{ $t('characters.pc') }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.status') }}</label>
        <select
          v-model="form.status"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="alive">{{ $t('characters.alive') }}</option>
          <option value="dead">{{ $t('characters.dead') }}</option>
          <option value="missing">{{ $t('characters.missing') }}</option>
          <option value="unknown">{{ $t('characters.unknown') }}</option>
        </select>
      </div>
      <div v-if="form.characterType === 'pc'">
        <label class="text-sm font-medium">{{ $t('characters.owner') }}</label>
        <select
          v-model="form.ownerUserId"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="">{{ $t('characters.noOwner') }}</option>
          <option v-for="m in members" :key="m.userId" :value="m.userId">
            {{ m.name }} ({{ m.role }})
          </option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.visibility') }}</label>
        <select
          v-model="form.visibility"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>
      <div v-if="locations.length">
        <label class="text-sm font-medium">{{ $t('characters.currentLocation') }}</label>
        <select
          v-model="form.locationId"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
        >
          <option value="">{{ $t('characters.noLocation') }}</option>
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">{{ loc.name }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.demographics.birthYear') }}</label>
        <input
          v-model.number="form.birthYear"
          type="number"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('characters.demographics.birthYear')"
        />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.demographics.deathYear') }}</label>
        <input
          v-model.number="form.deathYear"
          type="number"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('characters.demographics.deathYear')"
        />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.demographics.gender') }}</label>
        <input
          v-model="form.gender"
          list="gender-presets"
          class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
          :placeholder="$t('characters.demographics.gender')"
        />
        <datalist id="gender-presets">
          <option :value="$t('characters.demographics.genderPresets.male')" ></option>
          <option :value="$t('characters.demographics.genderPresets.female')" ></option>
          <option :value="$t('characters.demographics.genderPresets.nonbinary')" ></option>
          <option :value="$t('characters.demographics.genderPresets.unknown')" ></option>
        </datalist>
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('characters.description') }}</label>
      <MarkdownEditor
        v-model="form.content"
        :placeholder="$t('characters.descriptionPlaceholder')"
        :campaign-id="campaignId"
        :draft-key="draftKey"
        class="mt-1"
      />
    </div>

    <!-- Organizations -->
    <div v-if="organizations.length">
      <label class="text-sm font-medium block mb-2">{{ $t('organizations.title') }}</label>
      <div class="space-y-2 mb-3">
        <div v-for="(mem, i) in pendingMemberships" :key="i" class="flex items-center gap-2">
          <select
            v-model="mem.organizationId"
            class="flex-1 px-3 py-2 rounded border border-input bg-background text-sm"
          >
            <option value="">{{ $t('organizations.selectOrganization') }}</option>
            <option v-for="org in organizations" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
          <input
            v-model="mem.role"
            class="w-40 px-3 py-2 rounded border border-input bg-background text-sm"
            :placeholder="$t('organizations.memberRolePlaceholder')"
          />
          <button
            type="button"
            class="text-destructive text-sm hover:underline"
            @click="pendingMemberships.splice(i, 1)"
          >
            {{ $t('common.remove') }}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="text-sm text-primary hover:underline"
        @click="pendingMemberships.push({ organizationId: '', role: '' })"
      >
        {{ $t('organizations.addOrganization') }}
      </button>
    </div>

    <!-- Template selector -->
    <div v-if="characterTemplates.length">
      <label class="text-sm font-medium">{{ $t('templates.noTemplate') }}</label>
      <select
        v-model="form.templateId"
        class="w-full mt-1 px-3 py-2 rounded border border-input bg-background"
      >
        <option value="">{{ $t('templates.noTemplate') }}</option>
        <option v-for="tpl in characterTemplates" :key="tpl.id" :value="tpl.id">
          {{ tpl.name }}
        </option>
      </select>
    </div>

    <!-- Template fields -->
    <TemplateFieldsForm
      v-if="form.templateId"
      :campaign-id="campaignId"
      :template-id="form.templateId"
      :model-value="form.templateFields ?? {}"
      @update:model-value="
        (vals: Record<string, unknown>) =>
          emit('update:modelValue', { ...form, templateFields: vals })
      "
    />

    <div class="flex justify-end gap-2">
      <slot name="cancel"></slot>
      <Button type="submit" :disabled="submitting">{{
        submitting ? $t('common.saving') : submitLabel
      }}</Button>
    </div>
    <ErrorToast v-if="loadError" :message="loadError" @dismiss="loadError = null" />
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: {
    name: string
    characterType: string
    status: string
    visibility: string
    content: string
    ownerUserId: string
    locationId: string
    templateId?: string
    templateFields?: Record<string, unknown>
    birthYear?: number | null
    deathYear?: number | null
    gender?: string | null
  }
  campaignId: string
  characterSlug?: string // present on edit, absent on create
  submitLabel?: string
  submitting?: boolean
}>()

const draftKey = computed(
  () => `aleph:draft:${props.campaignId}:character:${props.characterSlug ?? 'new'}`,
)

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

interface CharacterTemplate {
  id: string
  name: string
  entityTypeSlug: string
  isDefault: boolean
}

const api = useCampaignApi(props.campaignId)
const members = ref<{ id: string; userId: string; name: string; role: string }[]>([])
const organizations = ref<{ id: string; slug: string; name: string }[]>([])
const locations = ref<{ id: string; name: string }[]>([])
const pendingMemberships = ref<{ organizationId: string; role: string }[]>([])
const loadError = ref<string | null>(null)
const characterTemplates = ref<CharacterTemplate[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

onMounted(async () => {
  try {
    const [ms, orgs, locs, templates] = await Promise.all([
      api.getMembers(),
      api.getOrganizations(),
      api.getLocations(),
      api.getTemplates(),
    ])
    members.value = ms as typeof members.value
    organizations.value = orgs as unknown as typeof organizations.value
    locations.value = locs as unknown as typeof locations.value
    characterTemplates.value = (templates as CharacterTemplate[]).filter(
      (t) => t.entityTypeSlug === 'character',
    )

    // Auto-select default template on create (no characterSlug = new)
    if (!props.characterSlug && !form.value.templateId) {
      const defaultTpl = characterTemplates.value.find((t) => t.isDefault)
      if (defaultTpl) {
        emit('update:modelValue', { ...form.value, templateId: defaultTpl.id })
      }
    }

    // Load existing memberships when editing
    if (props.characterSlug) {
      const existing = (await api
        .getCharacterOrganizations(props.characterSlug)
        .catch(() => [])) as { organizationId: string; role?: string }[]
      pendingMemberships.value = existing.map((m) => ({
        organizationId: m.organizationId,
        role: m.role || '',
      }))
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    loadError.value = err.data?.message || err.message || 'Failed to load form data'
  }
})

/**
 * Called by the parent after the character is created/saved.
 * Diffs against current server state and applies adds/removes.
 */
async function saveMemberships(characterSlug: string) {
  type Membership = { organizationId: string; characterId: string; role?: string }
  const current = (await api
    .getCharacterOrganizations(characterSlug)
    .catch(() => [])) as Membership[]
  const currentIds = new Set(current.map((m) => m.organizationId))

  const desired = pendingMemberships.value.filter((m) => m.organizationId)
  const desiredMap = new Map(desired.map((m) => [m.organizationId, m.role]))

  // Remove memberships no longer in the list
  for (const m of current) {
    if (!desiredMap.has(m.organizationId)) {
      const org = organizations.value.find((o) => o.id === m.organizationId)
      if (org) await api.removeOrganizationMember(org.slug, m.characterId).catch(() => {})
    }
  }

  // Add new memberships
  for (const [orgId, role] of desiredMap) {
    if (!currentIds.has(orgId)) {
      const org = organizations.value.find((o) => o.id === orgId)
      if (org) {
        const chars = (await api.getCharacters({}).catch(() => [])) as {
          id: string
          slug: string
        }[]
        const char = chars.find((c) => c.slug === characterSlug)
        if (char)
          await api
            .addOrganizationMember(org.slug, { characterId: char.id, role: role || undefined })
            .catch(() => {})
      }
    }
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(draftKey.value)
  } catch {
    /* ignore */
  }
}

defineExpose({ saveMemberships, clearDraft })
</script>
