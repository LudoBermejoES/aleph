<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold">{{ $t('relations.panel.title') }}</h3>
      <Button v-if="canEdit" size="sm" variant="outline" @click="openAddDialog">
        + {{ $t('relations.panel.addButton') }}
      </Button>
    </div>

    <div v-if="isLoading" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>
    <div v-else-if="error" class="text-sm text-destructive">{{ $t('common.error') }}</div>
    <div v-else-if="!hasAnyRelations" class="text-sm text-muted-foreground italic">
      {{ $t('relations.panel.empty') }}
    </div>
    <div v-else class="space-y-4">
      <!-- Entity-to-entity relations -->
      <div v-if="groups.entityRelations.length > 0">
        <p class="text-xs font-medium uppercase text-muted-foreground mb-1">
          {{ $t('relations.panel.groupHeaders.relations') }} ({{ groups.entityRelations.length }})
        </p>
        <div class="space-y-1">
          <div
            v-for="rel in groups.entityRelations"
            :key="rel.id"
            class="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm"
          >
            <span class="text-muted-foreground">{{ rel.label ?? rel.forwardLabel }}</span>
            <NuxtLink
              :to="`/campaigns/${campaignId}/${rel.relatedEntityType}s/${rel.relatedEntitySlug}`"
              class="font-medium hover:underline"
            >
              {{ rel.relatedEntityName }}
            </NuxtLink>
            <span
              v-if="rel.attitude"
              class="ml-auto text-xs"
              :class="rel.attitude > 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ rel.attitude > 0 ? '+' : '' }}{{ rel.attitude }}
            </span>
            <template v-if="canEdit">
              <Button size="xs" variant="ghost" @click="openEditDialog(rel)">{{
                $t('relations.panel.editButton')
              }}</Button>
              <Button
                size="xs"
                variant="ghost"
                class="text-destructive hover:text-destructive"
                @click="confirmDelete('entity-relation', rel)"
              >
                {{ $t('relations.panel.deleteButton') }}
              </Button>
            </template>
          </div>
        </div>
      </div>

      <!-- Org members (only shown on organization entity) -->
      <div v-if="groups.members.length > 0">
        <p class="text-xs font-medium uppercase text-muted-foreground mb-1">
          {{ $t('relations.panel.groupHeaders.members') }} ({{ groups.members.length }})
        </p>
        <div class="space-y-1">
          <div
            v-for="m in groups.members"
            :key="m.characterId"
            class="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm"
          >
            <span class="font-medium">{{ m.character?.name ?? m.characterId }}</span>
            <span v-if="m.role" class="text-xs text-muted-foreground">{{ m.role }}</span>
            <template v-if="canEdit">
              <Button size="xs" variant="ghost" class="ml-auto" @click="openEditMemberRole(m)">{{
                $t('relations.panel.editButton')
              }}</Button>
              <Button
                size="xs"
                variant="ghost"
                class="text-destructive hover:text-destructive"
                @click="confirmDelete('org-member', m)"
              >
                {{ $t('relations.panel.deleteButton') }}
              </Button>
            </template>
          </div>
        </div>
      </div>

      <!-- Inhabitants (only shown on location entity) -->
      <div v-if="groups.inhabitants.length > 0">
        <p class="text-xs font-medium uppercase text-muted-foreground mb-1">
          {{ $t('relations.panel.groupHeaders.inhabitants') }} ({{ groups.inhabitants.length }})
        </p>
        <div class="space-y-1">
          <div
            v-for="inh in groups.inhabitants"
            :key="inh.id"
            class="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm"
          >
            <NuxtLink
              :to="`/campaigns/${campaignId}/characters/${inh.slug}`"
              class="font-medium hover:underline"
            >
              {{ inh.name }}
            </NuxtLink>
            <template v-if="canEdit">
              <Button
                size="xs"
                variant="ghost"
                class="ml-auto text-destructive hover:text-destructive"
                @click="confirmDelete('char-location', inh)"
              >
                {{ $t('relations.panel.deleteButton') }}
              </Button>
            </template>
          </div>
        </div>
      </div>

      <!-- Orgs at location (only shown on location entity) -->
      <div v-if="groups.locationOrgs.length > 0">
        <p class="text-xs font-medium uppercase text-muted-foreground mb-1">
          {{ $t('relations.panel.groupHeaders.organizations') }} ({{ groups.locationOrgs.length }})
        </p>
        <div class="space-y-1">
          <div
            v-for="org in groups.locationOrgs"
            :key="org.id"
            class="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm"
          >
            <NuxtLink
              :to="`/campaigns/${campaignId}/organizations/${org.slug}`"
              class="font-medium hover:underline"
            >
              {{ org.name }}
            </NuxtLink>
            <template v-if="canEdit">
              <Button
                size="xs"
                variant="ghost"
                class="ml-auto text-destructive hover:text-destructive"
                @click="confirmDelete('org-location', org)"
              >
                {{ $t('relations.panel.deleteButton') }}
              </Button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- RelationFormDialog: add / edit entity-to-entity relations -->
    <RelationsRelationFormDialog
      :open="formDialogOpen"
      :source-entity="sourceEntityRef"
      :campaign-id="campaignId"
      :relation="editingRelation ?? undefined"
      @update:open="formDialogOpen = $event"
      @save="handleRelationSave"
      @cancel="formDialogOpen = false"
    />

    <!-- Inline role edit dialog for org members -->
    <Dialog v-model:open="memberRoleDialogOpen">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>{{ $t('relations.panel.editMemberRole') }}</DialogTitle>
        </DialogHeader>
        <div class="py-2">
          <label class="text-sm font-medium block mb-1">{{
            $t('relations.panel.memberRole')
          }}</label>
          <Input
            v-model="editingMemberRole"
            :placeholder="$t('relations.panel.memberRolePlaceholder')"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" @click="memberRoleDialogOpen = false">{{
            $t('common.cancel')
          }}</Button>
          <Button :disabled="savingMemberRole" @click="saveMemberRole">{{
            savingMemberRole ? $t('common.saving') : $t('common.save')
          }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ $t('relations.panel.deleteConfirmTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>{{ $t('relations.panel.deleteConfirm') }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="deleteDialogOpen = false">{{
            $t('common.cancel')
          }}</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleting"
            @click="executeDelete"
          >
            {{ deleting ? $t('common.deleting') : $t('common.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast'
import { useEntityRelations } from '~/composables/useEntityRelations'
import type {
  EntityRelationRow,
  MemberRow,
  InhabitantRow,
  LocationOrgRow,
} from '~/composables/useEntityRelations'

type CampaignRole = 'dm' | 'co_dm' | 'editor' | 'player' | 'visitor'
type DeleteMode = 'entity-relation' | 'org-member' | 'char-location' | 'org-location'

const props = defineProps<{
  campaignId: string
  entityId: string
  entityType: 'character' | 'organization' | 'location'
  entitySlug: string
  entityName: string
  role?: CampaignRole
}>()

const emit = defineEmits<{ 'relations-changed': [] }>()

const { t } = useI18n()
const { toast } = useToast()

const canEdit = computed(() => ['dm', 'co_dm', 'editor'].includes(props.role ?? 'visitor'))

const sourceEntityRef = computed(() => ({
  id: props.entityId,
  type: props.entityType,
  slug: props.entitySlug,
  name: props.entityName,
}))

const { isLoading, error, groups, load, refresh } = useEntityRelations(props.campaignId, {
  id: props.entityId,
  type: props.entityType,
  slug: props.entitySlug,
})

const hasAnyRelations = computed(
  () =>
    groups.value.entityRelations.length > 0 ||
    groups.value.members.length > 0 ||
    groups.value.inhabitants.length > 0 ||
    groups.value.locationOrgs.length > 0,
)

onMounted(() => load())

// ─── Add / Edit entity-to-entity relation ────────────────────────────────────

const formDialogOpen = ref(false)
const editingRelation = ref<EntityRelationRow | null>(null)

function openAddDialog() {
  editingRelation.value = null
  formDialogOpen.value = true
}

function openEditDialog(rel: EntityRelationRow) {
  editingRelation.value = rel
  formDialogOpen.value = true
}

async function handleRelationSave(payload: Record<string, unknown>) {
  try {
    if (payload.existingRelationId) {
      await $fetch(`/api/campaigns/${props.campaignId}/relations/${payload.existingRelationId}`, {
        method: 'PUT',
        body: payload,
      })
    } else {
      await $fetch(`/api/campaigns/${props.campaignId}/relations`, {
        method: 'POST',
        body: payload,
      })
    }
    formDialogOpen.value = false
    await refresh()
    emit('relations-changed')
    toast({ description: t('relations.panel.saveSuccess') })
  } catch {
    toast({ description: t('relations.panel.saveError'), variant: 'destructive' })
  }
}

// ─── Edit org member role ─────────────────────────────────────────────────────

const memberRoleDialogOpen = ref(false)
const editingMember = ref<MemberRow | null>(null)
const editingMemberRole = ref('')
const savingMemberRole = ref(false)

function openEditMemberRole(member: MemberRow) {
  editingMember.value = member
  editingMemberRole.value = member.role ?? ''
  memberRoleDialogOpen.value = true
}

async function saveMemberRole() {
  if (!editingMember.value) return
  savingMemberRole.value = true
  try {
    await $fetch(
      `/api/campaigns/${props.campaignId}/organizations/${props.entitySlug}/members/${editingMember.value.characterId}`,
      { method: 'PATCH', body: { role: editingMemberRole.value } },
    )
    memberRoleDialogOpen.value = false
    await refresh()
    emit('relations-changed')
    toast({ description: t('relations.panel.saveSuccess') })
  } catch {
    toast({ description: t('relations.panel.saveError'), variant: 'destructive' })
  } finally {
    savingMemberRole.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

const deleteDialogOpen = ref(false)
const deleting = ref(false)
const deleteTarget = ref<{
  mode: DeleteMode
  row: EntityRelationRow | MemberRow | InhabitantRow | LocationOrgRow
} | null>(null)

function confirmDelete(mode: DeleteMode, row: unknown) {
  deleteTarget.value = { mode, row: row as EntityRelationRow }
  deleteDialogOpen.value = true
}

function buildDeleteUrl(): string {
  const { mode, row } = deleteTarget.value!
  const base = `/api/campaigns/${props.campaignId}`
  if (mode === 'entity-relation') {
    return `${base}/relations/${(row as EntityRelationRow).id}`
  }
  if (mode === 'org-member') {
    return `${base}/organizations/${props.entitySlug}/members/${(row as MemberRow).characterId}`
  }
  if (mode === 'char-location') {
    return `${base}/locations/${props.entitySlug}/inhabitants/${(row as InhabitantRow).id}`
  }
  if (mode === 'org-location') {
    return `${base}/locations/${props.entitySlug}/organizations/${(row as LocationOrgRow).id}`
  }
  throw new Error(`Unknown mode ${mode}`)
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(buildDeleteUrl(), { method: 'DELETE' })
    deleteDialogOpen.value = false
    await refresh()
    emit('relations-changed')
    toast({ description: t('relations.panel.deleteSuccess') })
  } catch {
    toast({ description: t('relations.panel.deleteError'), variant: 'destructive' })
  } finally {
    deleting.value = false
  }
}
</script>
