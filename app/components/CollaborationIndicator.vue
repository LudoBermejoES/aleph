<template>
  <div
    class="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border-b border-border bg-muted/30"
  >
    <!-- Connection status dot -->
    <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusClass" :title="statusLabel" />

    <!-- Peer list -->
    <span v-if="peers.length === 0">{{ $t('collaboration.editingAlone') }}</span>
    <span v-else>
      {{ $t('collaboration.editingWith') }}
      <span v-for="(peer, i) in peers" :key="peer.clientId">
        <span :style="{ color: peer.color }" class="font-medium">{{ peer.name }}</span
        ><span v-if="i < peers.length - 1">, </span>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { HocuspocusProvider } from '@hocuspocus/provider'

const props = defineProps<{
  provider: HocuspocusProvider | null
}>()

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected'

const status = ref<WebSocketStatus>('connecting')
const peers = ref<Array<{ clientId: number; name: string; color: string }>>([])

const statusClass = computed(() => ({
  'bg-green-500': status.value === 'connected',
  'bg-yellow-500': status.value === 'connecting',
  'bg-red-500': status.value === 'disconnected',
}))

const statusLabel = computed(() => {
  const { t } = useI18n()
  if (status.value === 'connected') return t('collaboration.connected')
  if (status.value === 'connecting') return t('collaboration.reconnecting')
  return t('collaboration.disconnected')
})

function updatePeers() {
  if (!props.provider) return
  const states = props.provider.awareness?.getStates()
  if (!states) return
  const myClientId = props.provider.awareness?.clientID
  const list: Array<{ clientId: number; name: string; color: string }> = []
  states.forEach((state: Record<string, unknown>, clientId: number) => {
    if (clientId === myClientId) return
    const user = state?.user as { name?: string; color?: string } | undefined
    if (user?.name) {
      list.push({ clientId, name: user.name, color: user.color || '#9ca3af' })
    }
  })
  peers.value = list
}

onMounted(() => {
  if (!props.provider) return

  props.provider.on('status', ({ status: s }: { status: WebSocketStatus }) => {
    status.value = s
  })

  props.provider.awareness?.on('change', updatePeers)
  updatePeers()
})

onUnmounted(() => {
  props.provider?.awareness?.off('change', updatePeers)
})
</script>
