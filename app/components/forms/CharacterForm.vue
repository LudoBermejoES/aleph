<template>
  <form @submit.prevent="$emit('submit')" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2">
        <label class="text-sm font-medium">Name *</label>
        <input v-model="form.name" required class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Character name" />
      </div>
      <div>
        <label class="text-sm font-medium">Type</label>
        <select v-model="form.characterType" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="npc">NPC</option>
          <option value="pc">PC</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Status</label>
        <select v-model="form.status" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="alive">Alive</option>
          <option value="dead">Dead</option>
          <option value="missing">Missing</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>
      <div v-if="form.characterType === 'pc'">
        <label class="text-sm font-medium">Owner (Player)</label>
        <select v-model="form.ownerUserId" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="">-- No owner --</option>
          <option v-for="m in members" :key="m.userId" :value="m.userId">{{ m.name }} ({{ m.role }})</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Race</label>
        <input v-model="form.race" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Human, Elf, Dwarf..." />
      </div>
      <div>
        <label class="text-sm font-medium">Class</label>
        <input v-model="form.class" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Fighter, Wizard..." />
      </div>
      <div>
        <label class="text-sm font-medium">Alignment</label>
        <input v-model="form.alignment" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background" placeholder="Lawful Good, Chaotic Evil..." />
      </div>
      <div>
        <label class="text-sm font-medium">Visibility</label>
        <select v-model="form.visibility" class="w-full mt-1 px-3 py-2 rounded border border-input bg-background">
          <option value="members">Members</option>
          <option value="public">Public</option>
          <option value="editors">Editors</option>
          <option value="dm_only">DM Only</option>
          <option value="private">Private</option>
        </select>
      </div>
    </div>

    <div>
      <label class="text-sm font-medium">Description</label>
      <MarkdownEditor v-model="form.content" placeholder="Write a character description..." class="mt-1" />
    </div>

    <div class="flex justify-end gap-2">
      <slot name="cancel" />
      <Button type="submit" :disabled="submitting">{{ submitting ? 'Saving...' : submitLabel }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { name: string; characterType: string; race: string; class: string; alignment: string; status: string; visibility: string; content: string; ownerUserId: string }
  campaignId: string
  submitLabel?: string
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: typeof props.modelValue]
  submit: []
}>()

const members = ref<any[]>([])

const form = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

onMounted(async () => {
  try { members.value = await $fetch(`/api/campaigns/${props.campaignId}/members`) as any[] } catch { members.value = [] }
})
</script>
