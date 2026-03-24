<template>
  <div v-if="visible" class="fixed bottom-4 right-4 w-80 bg-background border border-border rounded-lg shadow-xl z-40">
    <!-- Header -->
    <div class="flex items-center justify-between p-3 border-b border-border cursor-move">
      <h3 class="text-sm font-semibold">Dice Roller</h3>
      <button @click="visible = false" class="text-muted-foreground hover:text-foreground text-xs">Close</button>
    </div>

    <!-- Quick Roll Buttons -->
    <div class="p-3 grid grid-cols-7 gap-1">
      <button v-for="d in quickDice" :key="d" @click="quickRoll(d)"
        class="px-1 py-2 text-xs rounded border border-border hover:bg-accent transition-colors text-center">
        d{{ d }}
      </button>
    </div>

    <!-- Formula Input -->
    <div class="px-3 pb-2 flex gap-2">
      <input
        v-model="formula"
        @keydown.enter="rollFormula"
        placeholder="2d6+4, 4d6kh3, d20..."
        class="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
      />
      <button @click="rollFormula" class="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm">Roll</button>
    </div>

    <!-- Error -->
    <p v-if="error" class="px-3 pb-2 text-xs text-destructive">{{ error }}</p>

    <!-- Last Result -->
    <div v-if="lastResult" class="px-3 pb-3">
      <div class="p-2 rounded bg-muted text-center">
        <div class="text-2xl font-bold">{{ lastResult.total }}</div>
        <div class="text-xs text-muted-foreground">
          {{ lastResult.formula }}
          <span v-for="(r, i) in lastResult.rolls" :key="i">
            [{{ r.values.join(', ') }}]
          </span>
        </div>
      </div>
    </div>

    <!-- Roll Log -->
    <div v-if="rollLog.length" class="border-t border-border max-h-40 overflow-auto">
      <div v-for="(entry, i) in rollLog" :key="i" class="px-3 py-1 text-xs border-b border-border/50 flex justify-between">
        <span class="text-muted-foreground">{{ entry.formula }}</span>
        <span class="font-medium">{{ entry.total }}</span>
      </div>
    </div>
  </div>

  <!-- Toggle Button -->
  <button
    v-if="!visible"
    @click="visible = true"
    class="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-lg z-40 hover:scale-105 transition-transform"
    title="Dice Roller"
  >
    🎲
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ campaignId: string }>()

const visible = ref(false)
const formula = ref('')
const error = ref('')
const lastResult = ref<any>(null)
const rollLog = ref<any[]>([])
const quickDice = [4, 6, 8, 10, 12, 20, 100]

async function roll(f: string) {
  error.value = ''
  try {
    const result = await $fetch(`/api/campaigns/${props.campaignId}/roll`, {
      method: 'POST',
      body: { formula: f },
    })
    lastResult.value = result
    rollLog.value.unshift({ formula: f, total: (result as any).total })
    if (rollLog.value.length > 50) rollLog.value.pop()
  } catch (e: any) {
    error.value = e.data?.message || 'Roll failed'
  }
}

function quickRoll(sides: number) {
  roll(`1d${sides}`)
}

function rollFormula() {
  if (formula.value.trim()) {
    roll(formula.value.trim())
    formula.value = ''
  }
}
</script>
