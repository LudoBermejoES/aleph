<template>
  <div class="mb-6">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">{{ $t('sessions.decisions') }}</h2>
      <Button
        v-if="canManage"
        variant="outline"
        size="sm"
        @click="showAddDecision = !showAddDecision"
      >
        {{ $t('sessions.addDecision') }}
      </Button>
    </div>

    <div v-if="showAddDecision" class="mb-4 p-4 rounded-lg border border-border bg-muted/30">
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="col-span-2">
          <label class="text-xs font-medium">{{ $t('sessions.decisionTitle') }} *</label>
          <input
            v-model="newDecision.title"
            type="text"
            class="w-full mt-1 px-2 py-1.5 text-sm rounded border border-input bg-background"
            :placeholder="$t('sessions.decisionTitlePlaceholder')"
          />
        </div>
        <div>
          <label class="text-xs font-medium">{{ $t('sessions.decisionType') }}</label>
          <select
            v-model="newDecision.type"
            class="w-full mt-1 px-2 py-1.5 text-sm rounded border border-input bg-background"
          >
            <option value="choice">{{ $t('sessions.decisionTypeChoice') }}</option>
            <option value="role">{{ $t('sessions.decisionTypeRole') }}</option>
            <option value="count">{{ $t('sessions.decisionTypeCount') }}</option>
            <option value="destiny">{{ $t('sessions.decisionTypeDestiny') }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium">{{ $t('common.description') }}</label>
          <input
            v-model="newDecision.description"
            type="text"
            class="w-full mt-1 px-2 py-1.5 text-sm rounded border border-input bg-background"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <Button size="sm" :disabled="!newDecision.title.trim()" @click="submitDecision">{{
          $t('common.save')
        }}</Button>
        <Button size="sm" variant="outline" @click="showAddDecision = false">{{
          $t('common.cancel')
        }}</Button>
      </div>
    </div>

    <div v-if="decisions.length" class="relative border-l-2 border-border ml-4 pl-6 space-y-4">
      <div v-for="d in decisions" :key="d.id" class="relative">
        <div
          class="absolute -left-[31px] w-4 h-4 rounded-full border-2 border-border bg-background"
        ></div>
        <div class="p-3 rounded border border-border">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-medium text-sm">{{ d.title }}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{{
              d.type
            }}</span>
          </div>
          <p v-if="d.description" class="text-xs text-muted-foreground mb-2">{{ d.description }}</p>

          <div v-if="(d as any).consequences?.length" class="mb-2 space-y-1">
            <div
              v-for="c in (d as any).consequences"
              :key="c.id"
              class="flex items-start gap-2 text-xs pl-3 border-l border-border"
            >
              <span
                :class="
                  c.revealed || canManage ? 'text-foreground' : 'text-muted-foreground italic'
                "
              >
                {{
                  c.revealed
                    ? c.description
                    : canManage
                      ? `[${$t('sessions.hiddenLabel')}] ${c.description}`
                      : $t('sessions.hiddenConsequence')
                }}
              </span>
              <button
                v-if="canManage"
                :class="[
                  'ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded border transition-colors',
                  c.revealed
                    ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    : 'border-border text-muted-foreground hover:border-primary/50',
                ]"
                @click="$emit('toggle-consequence', d.id, c.id, !c.revealed)"
              >
                {{ c.revealed ? $t('sessions.hide') : $t('sessions.reveal') }}
              </button>
            </div>
          </div>

          <div v-if="canManage">
            <button
              v-if="addingConsequenceFor !== d.id"
              class="text-xs text-muted-foreground hover:text-foreground transition-colors"
              @click="addingConsequenceFor = d.id"
            >
              + {{ $t('sessions.addConsequence') }}
            </button>
            <div v-else class="mt-2 p-2 rounded border border-border bg-muted/30">
              <input
                v-model="newConsequence.description"
                type="text"
                class="w-full px-2 py-1 text-xs rounded border border-input bg-background mb-2"
                :placeholder="$t('sessions.consequencePlaceholder')"
              />
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1 text-xs">
                  <input v-model="newConsequence.revealed" type="checkbox" class="rounded" />
                  {{ $t('sessions.revealedByDefault') }}
                </label>
                <Button
                  size="sm"
                  :disabled="!newConsequence.description.trim()"
                  @click="submitConsequence(d.id)"
                  >{{ $t('common.save') }}</Button
                >
                <Button size="sm" variant="outline" @click="addingConsequenceFor = null">{{
                  $t('common.cancel')
                }}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="text-sm text-muted-foreground italic">{{ $t('sessions.noDecisions') }}</p>
  </div>
</template>

<script setup lang="ts">
import type { SessionDecision } from '~/types/api'

defineProps<{
  decisions: SessionDecision[]
  canManage: boolean
}>()

const emit = defineEmits<{
  'add-decision': [data: { title: string; type: string; description?: string }]
  'add-consequence': [decisionId: string, data: { description: string; revealed: boolean }]
  'toggle-consequence': [decisionId: string, consequenceId: string, revealed: boolean]
}>()

const showAddDecision = ref(false)
const newDecision = ref({ title: '', type: 'choice', description: '' })
const addingConsequenceFor = ref<string | null>(null)
const newConsequence = ref({ description: '', revealed: false })

function submitDecision() {
  emit('add-decision', {
    title: newDecision.value.title,
    type: newDecision.value.type,
    description: newDecision.value.description || undefined,
  })
  newDecision.value = { title: '', type: 'choice', description: '' }
  showAddDecision.value = false
}

function submitConsequence(decisionId: string) {
  emit('add-consequence', decisionId, {
    description: newConsequence.value.description,
    revealed: newConsequence.value.revealed,
  })
  newConsequence.value = { description: '', revealed: false }
  addingConsequenceFor.value = null
}
</script>
