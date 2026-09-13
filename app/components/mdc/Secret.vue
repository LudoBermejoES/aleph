<script setup lang="ts">
/**
 * Recuadro de los bloques `:::secret{...}` del markdown.
 *
 * ESTE COMPONENTE ESTUVO MUERTO DESDE QUE SE ESCRIBIÓ y nadie lo notó, porque un componente
 * MDC que no resuelve NO da error: Vue pinta el slot sin el envoltorio, así que el texto se
 * veía bien y solo faltaba el marco. Se llamaba `SecretBlock.vue`, pero MDC resuelve una
 * directiva `:::secret{...}` buscando `pascalCase('secret')` = **`Secret`**
 * (`@nuxtjs/mdc` → `MDCRenderer.vue`, `vueResolveComponent`), y con `pathPrefix: false`
 * (`nuxt.config.ts`) el fichero se registraba como `SecretBlock`. La prueba de que el patrón
 * es ése está al lado: `EntityLink.vue` sí funciona, porque `:entity-link` → `EntityLink`.
 *
 * Por qué importa más de lo que parece: sin el marco, el Narrador NO PUEDE VER, mirando una
 * ficha, qué prosa es secreta ni para quién. Eso es exactamente lo que dejó pasar que la
 * historia de un PJ estuviera en `:::secret{.dm}` con su jugador sin poder leerla.
 *
 * `{.dm}` / `{.editor}` / `{.player:id1,id2}` viajan como CLASE (remark-directive trata `.x`
 * como clase), así que la audiencia se lee de `attrs.class`. NO se da por hecho que los dos
 * puntos de `player:` sobrevivan intactos al parser: si no se reconoce nada, se degrada a un
 * «Contenido secreto» genérico en vez de romper. El recuadro se pinta SIEMPRE.
 */
import { computed, onMounted, ref, useAttrs } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const route = useRoute()

type Audience =
  | { kind: 'dm' }
  | { kind: 'editor' }
  | { kind: 'player'; ids: string[] }
  | { kind: 'unknown' }

const audience = computed<Audience>(() => {
  const raw = [attrs.class, attrs.audience, attrs.role].filter(Boolean).join(' ')
  const players = raw.match(/player:([^\s"']+)/)
  if (players) return { kind: 'player', ids: players[1].split(',').filter(Boolean) }
  if (/\bdm\b/.test(raw)) return { kind: 'dm' }
  if (/\beditor\b/.test(raw)) return { kind: 'editor' }
  return { kind: 'unknown' }
})

/** Nombres de los miembros, resueltos una vez por campaña y compartidos por todos los bloques. */
const names = ref<Record<string, string>>({})

onMounted(async () => {
  const a = audience.value
  if (a.kind !== 'player') return
  const campaignId = route.params.id
  if (typeof campaignId !== 'string') return
  try {
    names.value = await loadMemberNames(campaignId)
  } catch {
    // Un fallo aquí solo significa que la etiqueta dice «1 jugador» en vez de su nombre.
    // Nunca debe impedir que se pinte el recuadro.
  }
})

const label = computed(() => {
  const a = audience.value
  if (a.kind === 'dm') return 'Solo el Narrador'
  if (a.kind === 'editor') return 'Narrador y editores'
  if (a.kind === 'player') {
    const resolved = a.ids.map((id) => names.value[id]).filter(Boolean)
    if (resolved.length > 0 && resolved.length === a.ids.length) {
      return `Solo el Narrador y ${resolved.join(', ')}`
    }
    return a.ids.length === 1
      ? 'Solo el Narrador y 1 jugador'
      : `Solo el Narrador y ${a.ids.length} jugadores`
  }
  return 'Contenido secreto'
})
</script>

<script lang="ts">
const memberNameCache = new Map<string, Promise<Record<string, string>>>()

/** Una sola petición por campaña, compartida por cuantos bloques secretos haya en la página. */
export function loadMemberNames(campaignId: string): Promise<Record<string, string>> {
  const cached = memberNameCache.get(campaignId)
  if (cached) return cached
  const pending = $fetch<unknown>(`/api/campaigns/${campaignId}/members`)
    .then((body) => {
      // El sobre de las listas de esta API no es uniforme (array pelado, `members` o `data`),
      // y leer la clave equivocada devuelve un vacío plausible en vez de un error.
      const envelope = body as { members?: unknown[]; data?: unknown[] } | unknown[]
      const rows = Array.isArray(envelope) ? envelope : (envelope?.members ?? envelope?.data ?? [])
      const out: Record<string, string> = {}
      for (const row of rows as Array<Record<string, unknown>>) {
        const id = (row.userId ?? (row.user as Record<string, unknown>)?.id) as string | undefined
        const name = ((row.user as Record<string, unknown>)?.name ?? row.name) as string | undefined
        if (id && name) out[id] = name
      }
      return out
    })
    .catch(() => {
      memberNameCache.delete(campaignId)
      return {}
    })
  memberNameCache.set(campaignId, pending)
  return pending
}
</script>

<template>
  <div
    class="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 p-4 my-4 rounded-r"
    data-testid="secret-block"
  >
    <p class="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 uppercase">
      Secreto · {{ label }}
    </p>
    <slot></slot>
  </div>
</template>
