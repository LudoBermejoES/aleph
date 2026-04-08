<template>
  <div class="mb-6">
    <button class="flex items-center gap-2 w-full text-left" @click="$emit('toggle')">
      <h2 class="text-lg font-semibold">{{ $t('sessions.rolls') }}</h2>
      <component
        :is="open ? ICONS.chevronUp : ICONS.chevronDown"
        class="w-4 h-4 text-muted-foreground"
      />
    </button>
    <div v-if="open" class="mt-3">
      <div v-if="loading" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>
      <div v-else-if="rolls.length" class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border text-muted-foreground">
              <th class="text-left py-1.5 pr-3">{{ $t('sessions.rollUser') }}</th>
              <th class="text-left py-1.5 pr-3">{{ $t('sessions.rollFormula') }}</th>
              <th class="text-right py-1.5 pr-3">{{ $t('sessions.rollTotal') }}</th>
              <th class="text-right py-1.5">{{ $t('common.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rolls" :key="r.id" class="border-b border-border/50">
              <td class="py-1.5 pr-3">{{ r.userName }}</td>
              <td class="py-1.5 pr-3 font-mono">{{ r.formula }}</td>
              <td class="py-1.5 pr-3 text-right font-bold">{{ r.total }}</td>
              <td class="py-1.5 text-right text-muted-foreground">
                {{ new Date(r.createdAt).toLocaleTimeString() }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="text-sm text-muted-foreground italic">{{ $t('sessions.noRolls') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons'

interface DiceRoll {
  id: string
  userName: string
  formula: string
  total: number
  createdAt: string | Date
}

defineProps<{
  rolls: DiceRoll[]
  loading: boolean
  open: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
