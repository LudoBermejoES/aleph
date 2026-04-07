<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ $t('diagrams.relationship.title') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Source entity (read-only) -->
        <div>
          <label class="text-sm font-medium mb-1 block">{{
            $t('diagrams.relationship.source')
          }}</label>
          <div class="flex items-center gap-2 p-2 rounded-md border border-input bg-muted/50">
            <span class="text-xs uppercase text-muted-foreground">{{ sourceEntityType }}</span>
            <span class="font-medium">{{ sourceEntityName }}</span>
          </div>
        </div>

        <!-- Target entity picker -->
        <div>
          <label class="text-sm font-medium mb-1 block">{{
            $t('diagrams.relationship.target')
          }}</label>
          <Input
            v-model="searchQuery"
            :placeholder="$t('diagrams.relationship.searchTarget')"
            data-testid="relationship-target-search"
            @focus="showDropdown = true"
          />
          <div
            v-if="showDropdown && searchResults.length > 0"
            class="mt-1 max-h-48 overflow-auto rounded-md border border-input bg-background shadow-md"
          >
            <template v-for="group in groupedResults" :key="group.type">
              <div class="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {{ group.label }}
              </div>
              <button
                v-for="entity in group.entities"
                :key="entity.id"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                :data-testid="`target-option-${entity.id}`"
                @click="selectTarget(entity)"
              >
                <img
                  v-if="entity.portraitUrl"
                  :src="entity.portraitUrl"
                  class="w-6 h-6 rounded object-cover"
                />
                <span
                  v-else
                  class="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs"
                >
                  {{ typeIcon(entity.entityType) }}
                </span>
                <span>{{ entity.name }}</span>
              </button>
            </template>
          </div>

          <!-- Selected target display -->
          <div
            v-if="targetEntity"
            class="mt-2 flex items-center gap-2 p-2 rounded-md border border-primary/50 bg-primary/5"
          >
            <span class="text-xs uppercase text-muted-foreground">{{
              targetEntity.entityType
            }}</span>
            <span class="font-medium">{{ targetEntity.name }}</span>
            <button
              class="ml-auto text-muted-foreground hover:text-foreground"
              @click="clearTarget"
            >
              &times;
            </button>
          </div>
        </div>

        <!-- Mode indicator -->
        <div v-if="targetEntity && relationshipMode" class="text-xs text-muted-foreground">
          {{ modeDescription }}
        </div>

        <!-- Entity-relation form (character ↔ character) -->
        <template v-if="relationshipMode === 'entity-relation'">
          <div>
            <label class="text-sm font-medium mb-1 block">{{
              $t('diagrams.relationship.relationType')
            }}</label>
            <select
              v-model="selectedRelTypeId"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              data-testid="relation-type-select"
            >
              <option value="">{{ $t('diagrams.relationship.selectType') }}</option>
              <option v-for="rt in relationTypes" :key="rt.id" :value="rt.id">
                {{ rt.forwardLabel }}
              </option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-sm font-medium mb-1 block">{{
                $t('diagrams.relationship.forwardLabel')
              }}</label>
              <Input v-model="forwardLabel" data-testid="forward-label-input" />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{
                $t('diagrams.relationship.reverseLabel')
              }}</label>
              <Input v-model="reverseLabel" data-testid="reverse-label-input" />
            </div>
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">
              {{ $t('diagrams.relationship.attitude') }}: {{ attitude }}
            </label>
            <input
              v-model.number="attitude"
              type="range"
              min="-100"
              max="100"
              class="w-full"
              data-testid="attitude-slider"
            />
          </div>
        </template>

        <!-- Org-member form (character ↔ org) -->
        <template v-if="relationshipMode === 'org-member'">
          <div>
            <label class="text-sm font-medium mb-1 block">{{
              $t('diagrams.relationship.memberRole')
            }}</label>
            <Input
              v-model="memberRole"
              :placeholder="$t('diagrams.relationship.memberRolePlaceholder')"
              data-testid="member-role-input"
            />
          </div>
        </template>

        <!-- Char-location form -->
        <template v-if="relationshipMode === 'char-location'">
          <p class="text-sm text-muted-foreground">
            {{
              $t('diagrams.relationship.setLocationMsg', { character: charName, location: locName })
            }}
          </p>
        </template>

        <!-- Org-location form -->
        <template v-if="relationshipMode === 'org-location'">
          <p class="text-sm text-muted-foreground">
            {{
              $t('diagrams.relationship.linkOrgLocationMsg', { org: orgName, location: locName })
            }}
          </p>
        </template>

        <!-- Error -->
        <p v-if="errorMsg" class="text-sm text-destructive" data-testid="relationship-error">
          {{ errorMsg }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="dialogOpen = false">{{ $t('common.cancel') }}</Button>
        <Button
          :disabled="!canSubmit || submitting"
          data-testid="create-relationship-btn"
          @click="submit"
        >
          {{ submitting ? $t('common.loading') : $t('diagrams.relationship.create') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'

interface EntityResult {
  id: string
  name: string
  slug: string
  type: string
  entityType: string
  portraitUrl?: string | null
}

interface RelationType {
  id: string
  slug: string
  forwardLabel: string
  reverseLabel: string
}

const props = defineProps<{
  visible: boolean
  campaignId: string
  sourceEntityId: string
  sourceEntityType: string
  sourceEntitySlug: string
  sourceEntityName: string
}>()

const emit = defineEmits<{
  close: []
  created: []
}>()

const { t } = useI18n()

const dialogOpen = computed({
  get: () => props.visible,
  set: (v: boolean) => {
    if (!v) emit('close')
  },
})

// Target entity
const searchQuery = ref('')
const showDropdown = ref(false)
const targetEntity = ref<EntityResult | null>(null)
const searchResults = ref<EntityResult[]>([])

// Relation form state
const relationTypes = ref<RelationType[]>([])
const selectedRelTypeId = ref('')
const forwardLabel = ref('')
const reverseLabel = ref('')
const attitude = ref(0)
const memberRole = ref('')
const errorMsg = ref('')
const submitting = ref(false)

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchEntities(q), 300)
})

// Fetch relation types when dialog opens
watch(
  () => props.visible,
  async (v) => {
    if (v) {
      resetForm()
      try {
        relationTypes.value = await $fetch<RelationType[]>(
          `/api/campaigns/${props.campaignId}/relation-types`,
        )
      } catch {
        relationTypes.value = []
      }
      fetchEntities('')
    }
  },
)

// Auto-fill labels when relation type changes
watch(selectedRelTypeId, (id) => {
  const rt = relationTypes.value.find((r) => r.id === id)
  if (rt) {
    forwardLabel.value = rt.forwardLabel
    reverseLabel.value = rt.reverseLabel
  }
})

async function fetchEntities(query: string) {
  try {
    const params = query ? `?q=${encodeURIComponent(query)}` : ''
    const data = await $fetch<Record<string, EntityResult[]>>(
      `/api/campaigns/${props.campaignId}/diagrams/entities${params}`,
    )
    const all: EntityResult[] = []
    for (const group of Object.values(data)) {
      if (Array.isArray(group)) all.push(...group)
    }
    // Filter out the source entity
    searchResults.value = all.filter((e) => e.id !== props.sourceEntityId)
    showDropdown.value = true
  } catch {
    searchResults.value = []
  }
}

const groupedResults = computed(() => {
  const groups: Record<string, { label: string; type: string; entities: EntityResult[] }> = {}
  for (const e of searchResults.value) {
    const type = e.entityType || e.type
    if (!groups[type]) {
      groups[type] = {
        type,
        label: typeLabel(type),
        entities: [],
      }
    }
    groups[type].entities.push(e)
  }
  return Object.values(groups)
})

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    character: t('diagrams.panel.characters'),
    location: t('diagrams.panel.locations'),
    organization: t('diagrams.panel.organizations'),
    quest: t('diagrams.panel.quests'),
    wiki: t('diagrams.panel.wiki'),
  }
  return labels[type] ?? type
}

function typeIcon(type: string): string {
  const icons: Record<string, string> = {
    character: '🧑',
    location: '📍',
    organization: '🏛️',
    quest: '⚔️',
    wiki: '📋',
  }
  return icons[type] ?? '📋'
}

function selectTarget(entity: EntityResult) {
  targetEntity.value = entity
  searchQuery.value = entity.name
  showDropdown.value = false
  errorMsg.value = ''
}

function clearTarget() {
  targetEntity.value = null
  searchQuery.value = ''
}

function resetForm() {
  targetEntity.value = null
  searchQuery.value = ''
  selectedRelTypeId.value = ''
  forwardLabel.value = ''
  reverseLabel.value = ''
  attitude.value = 0
  memberRole.value = ''
  errorMsg.value = ''
  submitting.value = false
  showDropdown.value = false
}

// Normalize entity type for mode computation
function normalizeType(entityType: string): 'character' | 'organization' | 'location' | 'other' {
  if (entityType === 'character' || entityType === 'npc' || entityType === 'pc') return 'character'
  if (entityType === 'organization') return 'organization'
  if (entityType === 'location') return 'location'
  return 'other'
}

// Compute the relationship mode and swap source/target if needed
const relationshipMode = computed<
  'entity-relation' | 'org-member' | 'char-location' | 'org-location' | null
>(() => {
  if (!targetEntity.value) return null
  const src = normalizeType(props.sourceEntityType)
  const tgt = normalizeType(targetEntity.value.entityType || targetEntity.value.type)

  if (src === 'character' && tgt === 'character') return 'entity-relation'
  if (
    (src === 'character' && tgt === 'organization') ||
    (src === 'organization' && tgt === 'character')
  )
    return 'org-member'
  if ((src === 'character' && tgt === 'location') || (src === 'location' && tgt === 'character'))
    return 'char-location'
  if (
    (src === 'organization' && tgt === 'location') ||
    (src === 'location' && tgt === 'organization')
  )
    return 'org-location'

  // Fallback: entity-relation for any other pair
  return 'entity-relation'
})

// Helper computed values for display messages
const charName = computed(() => {
  const src = normalizeType(props.sourceEntityType)
  if (src === 'character') return props.sourceEntityName
  return targetEntity.value?.name ?? ''
})

const locName = computed(() => {
  const src = normalizeType(props.sourceEntityType)
  if (src === 'location') return props.sourceEntityName
  return targetEntity.value?.name ?? ''
})

const orgName = computed(() => {
  const src = normalizeType(props.sourceEntityType)
  if (src === 'organization') return props.sourceEntityName
  return targetEntity.value?.name ?? ''
})

const modeDescription = computed(() => {
  switch (relationshipMode.value) {
    case 'entity-relation':
      return t('diagrams.relationship.modeEntityRelation')
    case 'org-member':
      return t('diagrams.relationship.modeOrgMember')
    case 'char-location':
      return t('diagrams.relationship.modeCharLocation')
    case 'org-location':
      return t('diagrams.relationship.modeOrgLocation')
    default:
      return ''
  }
})

const canSubmit = computed(() => {
  if (!targetEntity.value) return false
  if (targetEntity.value.id === props.sourceEntityId) return false
  return true
})

// Resolve which entity is the character/org/location for API calls
function resolveEntities() {
  const src = normalizeType(props.sourceEntityType)
  const tgt = normalizeType(targetEntity.value!.entityType || targetEntity.value!.type)

  // Determine character, org, location slugs/ids based on who is what
  const srcData = {
    id: props.sourceEntityId,
    slug: props.sourceEntitySlug,
    type: src,
    name: props.sourceEntityName,
  }
  const tgtData = {
    id: targetEntity.value!.id,
    slug: targetEntity.value!.slug,
    type: tgt,
    name: targetEntity.value!.name,
  }

  return { srcData, tgtData, src, tgt }
}

async function submit() {
  if (!canSubmit.value || !targetEntity.value) return
  submitting.value = true
  errorMsg.value = ''

  try {
    const { srcData, tgtData, src } = resolveEntities()

    switch (relationshipMode.value) {
      case 'entity-relation': {
        await $fetch(`/api/campaigns/${props.campaignId}/relations`, {
          method: 'POST',
          body: {
            sourceEntityId: srcData.id,
            targetEntityId: tgtData.id,
            relationTypeId: selectedRelTypeId.value || undefined,
            forwardLabel: forwardLabel.value || 'related to',
            reverseLabel: reverseLabel.value || 'related to',
            attitude: attitude.value,
          },
        })
        break
      }
      case 'org-member': {
        // Determine which is char and which is org
        const charData = src === 'character' ? srcData : tgtData
        const orgData = src === 'organization' ? srcData : tgtData

        // Resolve characterId from slug
        const charInfo = await $fetch<{ id: string }>(
          `/api/campaigns/${props.campaignId}/characters/${charData.slug}`,
        )

        await $fetch(`/api/campaigns/${props.campaignId}/organizations/${orgData.slug}/members`, {
          method: 'POST',
          body: {
            characterId: charInfo.id,
            role: memberRole.value || undefined,
          },
        })
        break
      }
      case 'char-location': {
        const charData = src === 'character' ? srcData : tgtData
        const locData = src === 'location' ? srcData : tgtData

        await $fetch(`/api/campaigns/${props.campaignId}/characters/${charData.slug}`, {
          method: 'PUT',
          body: {
            locationEntityId: locData.id,
          },
        })
        break
      }
      case 'org-location': {
        const orgData = src === 'organization' ? srcData : tgtData
        const locData = src === 'location' ? srcData : tgtData

        await $fetch(`/api/campaigns/${props.campaignId}/locations/${locData.slug}/organizations`, {
          method: 'POST',
          body: {
            organizationId: orgData.id,
          },
        })
        break
      }
    }

    emit('created')
    dialogOpen.value = false
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message
    errorMsg.value = msg || t('diagrams.relationship.error')
  } finally {
    submitting.value = false
  }
}
</script>
