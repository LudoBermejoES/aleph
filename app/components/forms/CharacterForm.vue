<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">{{ $t('characters.name') }}</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.namePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.type') }}</label>
        <select v-model="form.characterType" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="npc">{{ $t('characters.npc') }}</option>
          <option value="pc">{{ $t('characters.pc') }}</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.status') }}</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="alive">{{ $t('characters.alive') }}</option>
          <option value="dead">{{ $t('characters.dead') }}</option>
          <option value="missing">{{ $t('characters.missing') }}</option>
          <option value="unknown">{{ $t('characters.unknown') }}</option>
        </select>
      </div>
      <div v-if="form.characterType === 'pc'">
        <label class="text-sm font-medium">{{ $t('characters.owner') }}</label>
        <select v-model="form.ownerUserId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">{{ $t('characters.noOwner') }}</option>
          <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.name }} ({{ m.role }})</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.race') }}</label>
        <input v-model="form.race" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.racePlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.class') }}</label>
        <input v-model="form.class" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.classPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.alignment') }}</label>
        <input v-model="form.alignment" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" :placeholder="$t('characters.alignmentPlaceholder')" />
      </div>
      <div>
        <label class="text-sm font-medium">{{ $t('characters.visibility') }}</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">{{ $t('characters.visibilityMembers') }}</option>
          <option value="public">{{ $t('characters.visibilityPublic') }}</option>
          <option value="editors">{{ $t('characters.visibilityEditors') }}</option>
          <option value="dm_only">{{ $t('characters.visibilityDmOnly') }}</option>
          <option value="private">{{ $t('characters.visibilityPrivate') }}</option>
        </select>
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">{{ $t('characters.description') }}</label>
      <MarkdownEditor v-model="form.content" :placeholder="$t('characters.descriptionPlaceholder')" :campaign-id="campaignId" :draft-key="draftKey" class="mt-1" />
    </div>

    <!-- Organizations -->
    <div v-if="organizations.length">
      <label class="text-sm font-medium block mb-2">{{ $t('organizations.title') }}</label>
      <div class="space-y-2 mb-3">
        <div v-for="(mem, i) in pendingMemberships" :key="i" class="flex items-center gap-2">
          <select v-model="mem.organizationId" class="flex-1 px-3 py-2 rounded border border-input bg-background text-sm">
            <option value="">{{ $t('organizations.selectOrganization') }}</option>
            <option v-for="org in organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
          </select>
          <input v-model="mem.role" class="w-40 px-3 py-2 rounded border border-input bg-background text-sm" :placeholder="$t('organizations.memberRolePlaceholder')" />
          <button type="button" class="text-destructive text-sm hover:underline" @click="pendingMemberships.splice(i, 1)">{{ $t('common.remove') }}</button>
        </div>
      </div>
      <button type="button" class="text-sm text-primary hover:underline" @click="pendingMemberships.push({ organizationId: '', role: '' })">
        {{ $t('organizations.addOrganization') }}
      </button>
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? $t('common.saving') : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; characterType: string; race: string; class: string; alignment: string; status: string; visibility: string; content: string; ownerUserId: string }
  campaignId: string
  characterSlug?: string  // present on edit, absent on create
  submitLabel?: string
  submitting?: boolean
}>()

const draftKey = computed(() => `aleph:draft:${props.campaignId}:character:${props.characterSlug ?? 'new'}`)

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const api = useCampaignApi(props.campaignId)
const members = ref<any[]>([])
const organizations = ref<any[]>([])
const pendingMemberships = ref<{ organizationId: string; role: string }[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

onMounted(async () => {
  const [ms, orgs] = await Promise.all([
    api.getMembers().catch(() => []),
    api.getOrganizations().catch(() => []),
  ])
  members.value = ms
  organizations.value = orgs

  // Load existing memberships when editing
  if (props.characterSlug) {
    const existing = await api.getCharacterOrganizations(props.characterSlug).catch(() => [])
    pendingMemberships.value = existing.map((m: any) => ({
      organizationId: m.organizationId,
      role: m.role || '',
    }))
  }
})

/**
 * Called by the parent after the character is created/saved.
 * Diffs against current server state and applies adds/removes.
 */
async function saveMemberships(characterSlug: string) {
  const current = await api.getCharacterOrganizations(characterSlug).catch(() => [])
  const currentIds = new Set(current.map((m: any) => m.organizationId))

  const desired = pendingMemberships.value.filter(m => m.organizationId)
  const desiredMap = new Map(desired.map(m => [m.organizationId, m.role]))

  // Remove memberships no longer in the list
  for (const m of current) {
    if (!desiredMap.has(m.organizationId)) {
      const org = organizations.value.find(o => o.id === m.organizationId)
      if (org) await api.removeOrganizationMember(org.slug, m.characterId).catch(() => {})
    }
  }

  // Add new memberships
  for (const [orgId, role] of desiredMap) {
    if (!currentIds.has(orgId)) {
      const org = organizations.value.find(o => o.id === orgId)
      if (org) {
        const chars = await api.getCharacters({}).catch(() => [])
        const char = chars.find((c: any) => c.slug === characterSlug)
        if (char) await api.addOrganizationMember(org.slug, { characterId: char.id, role: role || undefined }).catch(() => {})
      }
    }
  }
}

function clearDraft() {
  try { localStorage.removeItem(draftKey.value) } catch { /* ignore */ }
}

defineExpose({ saveMemberships, clearDraft })
</script>
