<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t('adminUsers.editUser') }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('adminUsers.name') }}</label>
          <Input v-model="form.name" />
        </div>
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('adminUsers.email') }}</label>
          <Input v-model="form.email" type="email" />
        </div>
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('adminUsers.newPassword') }}</label>
          <Input
            v-model="form.password"
            type="password"
            :placeholder="$t('adminUsers.passwordPlaceholder')"
          />
        </div>
        <div>
          <label class="text-sm font-medium mb-1 block">{{ $t('adminUsers.role') }}</label>
          <select
            v-model="form.role"
            class="w-full rounded border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
      </div>

      <DialogFooter>
        <button
          class="rounded bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
          @click="open = false"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? $t('common.saving') : $t('common.save') }}
        </button>
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
import { Input } from '~/components/ui/input'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
}

const props = defineProps<{ user: AdminUser | null }>()
const emit = defineEmits<{ saved: []; close: [] }>()

const open = defineModel<boolean>('open', { default: false })
const saving = ref(false)

const form = reactive({ name: '', email: '', password: '', role: 'user' })

watch(
  () => props.user,
  (u) => {
    if (u) {
      form.name = u.name
      form.email = u.email
      form.password = ''
      form.role = u.role
    }
  },
  { immediate: true },
)

async function save() {
  if (!props.user) return
  saving.value = true
  try {
    const body: Record<string, string> = {
      name: form.name,
      email: form.email,
      role: form.role,
    }
    if (form.password) body.password = form.password

    await $fetch(`/api/admin/users/${props.user.id}`, { method: 'PATCH', body })
    emit('saved')
    open.value = false
  } finally {
    saving.value = false
  }
}
</script>
