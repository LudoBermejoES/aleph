<template>
  <div class="p-8 max-w-4xl">
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink to="/settings" class="text-sm text-muted-foreground hover:text-foreground">
        ← {{ $t('settings.title') }}
      </NuxtLink>
      <h1 class="text-2xl font-bold">{{ $t('adminUsers.title') }}</h1>
    </div>

    <div v-if="pending" class="text-sm text-muted-foreground">{{ $t('common.loading') }}</div>

    <div v-else-if="users.length === 0" class="text-sm text-muted-foreground">
      {{ $t('common.noResults') }}
    </div>

    <table v-else class="w-full text-sm">
      <thead>
        <tr class="border-b text-left text-muted-foreground">
          <th class="pb-2 font-medium">{{ $t('adminUsers.name') }}</th>
          <th class="pb-2 font-medium">{{ $t('adminUsers.email') }}</th>
          <th class="pb-2 font-medium">{{ $t('adminUsers.role') }}</th>
          <th class="pb-2 font-medium">{{ $t('adminUsers.joinDate') }}</th>
          <th class="pb-2" ></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" class="border-b last:border-0">
          <td class="py-3 pr-4">{{ u.name }}</td>
          <td class="py-3 pr-4 text-muted-foreground">{{ u.email }}</td>
          <td class="py-3 pr-4">
            <span
              class="rounded px-2 py-0.5 text-xs font-medium"
              :class="
                u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              "
            >
              {{ u.role }}
            </span>
          </td>
          <td class="py-3 pr-4 text-muted-foreground">
            {{ new Date(u.createdAt).toLocaleDateString() }}
          </td>
          <td class="py-3 flex gap-2 justify-end">
            <button
              class="rounded border border-input px-2 py-1 text-xs hover:bg-accent"
              @click="openEdit(u)"
            >
              {{ $t('common.edit') }}
            </button>
            <button
              class="rounded border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
              @click="handleDelete(u)"
            >
              {{ $t('common.delete') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <UserEditDialog v-model:open="editOpen" :user="editTarget" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { useCurrentUser } from '~/composables/useAuth'

definePageMeta({ middleware: 'require-admin' })

const { t } = useI18n()

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: number
}

const { user: currentUser } = useCurrentUser()
const users = ref<AdminUser[]>([])
const pending = ref(true)
const editOpen = ref(false)
const editTarget = ref<AdminUser | null>(null)

async function refresh() {
  pending.value = true
  try {
    users.value = await $fetch<AdminUser[]>('/api/admin/users')
  } finally {
    pending.value = false
  }
}

function openEdit(u: AdminUser) {
  editTarget.value = u
  editOpen.value = true
}

async function handleDelete(u: AdminUser) {
  if (u.id === currentUser.value?.id) return
  if (!confirm(t('adminUsers.deleteConfirm', { name: u.name }))) return
  await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
  await refresh()
}

onMounted(refresh)
</script>
