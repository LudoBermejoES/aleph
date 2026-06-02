<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>{{
          isAddMode ? $t('relations.panel.addRelation') : $t('relations.panel.editRelation')
        }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <!-- Source entity (always locked) -->
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('relations.sourceEntity') }}</label>
          <div class="flex items-center gap-2 p-2 rounded-md border border-input bg-muted/50">
            <span class="text-xs text-muted-foreground">{{
              $t(`entities.types.${sourceEntity.type}`, sourceEntity.type)
            }}</span>
            <span class="font-medium">{{ sourceEntity.name }}</span>
          </div>
        </div>

        <!-- Target entity — picker in add mode, locked in edit mode -->
        <div v-if="isAddMode">
          <label class="text-sm font-medium mb-1 block">{{ $t('relations.targetEntity') }}</label>
          <Input
            v-model="targetSearch"
            :placeholder="$t('relations.searchEntities')"
            data-testid="relation-target-search"
            @input="onTargetSearch"
          />
          <div
            v-if="targetResults.length > 0"
            class="mt-1 max-h-48 overflow-auto rounded-md border border-input bg-background shadow-md"
          >
            <button
              v-for="entity in targetResults"
              :key="entity.id"
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
              @click="selectTarget(entity)"
            >
              <span class="text-xs text-muted-foreground">{{
                $t(`entities.types.${entity.type}`, entity.type)
              }}</span>
              <span>{{ entity.name }}</span>
            </button>
          </div>
          <div
            v-if="form.targetEntityId"
            class="mt-2 flex items-center gap-2 p-2 rounded-md border border-primary/50 bg-primary/5"
          >
            <span class="text-xs text-muted-foreground">{{
              $t(`entities.types.${form.targetEntityType}`, form.targetEntityType)
            }}</span>
            <span class="font-medium">{{ form.targetEntityName }}</span>
            <button
              class="ml-auto text-muted-foreground hover:text-foreground"
              type="button"
              @click="clearTarget"
            >
              &times;
            </button>
          </div>
          <p v-if="showValidation && !form.targetEntityId" class="text-xs text-destructive mt-1">
            {{ $t('relations.panel.targetRequired') }}
          </p>
        </div>
        <div v-else>
          <label class="text-sm font-medium mb-1 block">{{ $t('relations.targetEntity') }}</label>
          <div class="flex items-center gap-2 p-2 rounded-md border border-input bg-muted/50">
            <span class="text-xs uppercase text-muted-foreground">{{
              relation?.relatedEntityType
            }}</span>
            <span class="font-medium">{{ relation?.relatedEntityName }}</span>
          </div>
        </div>

        <!-- Relation type -->
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('relations.relationType') }}</label>
          <select
            v-model="form.relationTypeId"
            class="w-full mt-1 px-3 py-2 rounded border border-input bg-background text-sm"
            @change="onTypeChange"
          >
            <option value="">{{ $t('relations.selectType') }}</option>
            <option v-for="rt in relationTypes" :key="rt.id" :value="rt.id">{{ rt.name }}</option>
          </select>
        </div>

        <!-- Labels -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium mb-1 block">{{ $t('relations.forwardLabel') }}</label>
            <Input
              v-model="form.forwardLabel"
              :placeholder="$t('relations.forwardLabelPlaceholder')"
            />
            <p
              v-if="showValidation && !form.forwardLabel.trim()"
              class="text-xs text-destructive mt-1"
            >
              {{ $t('relations.panel.labelRequired') }}
            </p>
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ $t('relations.reverseLabel') }}</label>
            <Input
              v-model="form.reverseLabel"
              :placeholder="$t('relations.forwardLabelPlaceholder')"
            />
          </div>
        </div>

        <!-- Attitude slider -->
        <div>
          <label class="text-sm font-medium mb-1 block">
            {{ $t('relations.attitude', { value: form.attitude }) }}
          </label>
          <input v-model.number="form.attitude" type="range" min="-100" max="100" class="w-full" />
          <div class="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{{ $t('relations.hostile') }}</span>
            <span>{{ $t('relations.neutral') }}</span>
            <span>{{ $t('relations.friendly') }}</span>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('relations.description') }}</label>
          <textarea
            v-model="form.description"
            rows="2"
            class="w-full px-3 py-2 rounded border border-input bg-background text-sm"
            :placeholder="$t('relations.descriptionPlaceholder')"
          ></textarea>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="$emit('cancel')">{{
          $t('common.cancel')
        }}</Button>
        <Button type="button" :disabled="saving" @click="handleSave">
          {{ saving ? $t('common.saving') : $t('common.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import type { RelationType, Entity } from '~/types/api'
import type { EntityRelationRow } from '~/composables/useEntityRelations'

interface SourceEntityRef {
  id: string
  type: string
  slug: string
  name: string
}

const props = defineProps<{
  open: boolean
  sourceEntity: SourceEntityRef
  campaignId: string
  relation?: EntityRelationRow
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  save: [payload: Record<string, unknown>]
  cancel: []
}>()

const isAddMode = computed(() => !props.relation)

const relationTypes = ref<RelationType[]>([])
const targetSearch = ref('')
const targetResults = ref<Entity[]>([])
const showValidation = ref(false)
const saving = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  targetEntityId: '',
  targetEntityName: '',
  targetEntityType: '',
  relationTypeId: '',
  forwardLabel: '',
  reverseLabel: '',
  attitude: 0,
  description: '',
})

// Pre-fill in edit mode or reset in add mode
watch(
  () => props.open,
  (open) => {
    if (!open) return
    showValidation.value = false
    if (props.relation) {
      form.targetEntityId = props.relation.relatedEntityId
      form.targetEntityName = props.relation.relatedEntityName ?? ''
      form.targetEntityType = props.relation.relatedEntityType ?? ''
      form.relationTypeId = props.relation.relationTypeId ?? ''
      form.forwardLabel = props.relation.forwardLabel ?? ''
      form.reverseLabel = props.relation.reverseLabel ?? ''
      form.attitude = props.relation.attitude ?? 0
      form.description = props.relation.description ?? ''
    } else {
      Object.assign(form, {
        targetEntityId: '',
        targetEntityName: '',
        targetEntityType: '',
        relationTypeId: '',
        forwardLabel: '',
        reverseLabel: '',
        attitude: 0,
        description: '',
      })
      targetSearch.value = ''
      targetResults.value = []
    }
  },
  { immediate: true },
)

function onTargetSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (targetSearch.value.length < 2) {
      targetResults.value = []
      return
    }
    try {
      const res = await useCampaignApi(props.campaignId).getEntities({
        search: targetSearch.value,
        limit: '10',
      })
      targetResults.value = res.entities ?? []
    } catch {
      targetResults.value = []
    }
  }, 300)
}

function selectTarget(entity: Entity) {
  form.targetEntityId = entity.id
  form.targetEntityName = entity.name
  form.targetEntityType = entity.type ?? ''
  targetSearch.value = entity.name
  targetResults.value = []
}

function clearTarget() {
  form.targetEntityId = ''
  form.targetEntityName = ''
  form.targetEntityType = ''
  targetSearch.value = ''
}

function onTypeChange() {
  const rt = relationTypes.value.find((r) => r.id === form.relationTypeId)
  if (rt) {
    form.forwardLabel = rt.forwardLabel ?? rt.name ?? ''
    form.reverseLabel = rt.reverseLabel ?? rt.name ?? ''
  }
}

function isValid(): boolean {
  return !!form.targetEntityId && !!form.forwardLabel.trim()
}

async function handleSave() {
  showValidation.value = true
  if (!isValid()) return
  saving.value = true
  try {
    emit('save', {
      sourceEntityId: props.sourceEntity.id,
      targetEntityId: form.targetEntityId,
      relationTypeId: form.relationTypeId || null,
      forwardLabel: form.forwardLabel,
      reverseLabel: form.reverseLabel,
      attitude: form.attitude,
      description: form.description || null,
      existingRelationId: props.relation?.id ?? null,
    })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    relationTypes.value = await useCampaignApi(props.campaignId).getRelationTypes()
  } catch {
    relationTypes.value = []
  }
})
</script>
