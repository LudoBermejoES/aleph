import { ref, watch, nextTick, type Ref } from 'vue'

/**
 * Composable for managing secret block reveals in rendered entity content.
 * Fetches revealed block IDs, injects reveal/unreveal buttons into DOM,
 * and toggles reveal state via API.
 *
 * Only active when isDm is true.
 */
export function useSecretReveals(
  contentRef: Ref<HTMLElement | null | undefined>,
  campaignId: string,
  entitySlug: Ref<string> | string,
  isDm: Ref<boolean>,
  t: (key: string) => string,
) {
  const revealedBlocks = ref<Set<string>>(new Set())

  function getSlug() {
    return typeof entitySlug === 'string' ? entitySlug : entitySlug.value
  }

  async function loadRevealedBlocks() {
    if (!isDm.value) return
    const slug = getSlug()
    if (!slug) return
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/entities/${slug}/secrets`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        revealedBlocks.value = new Set((data as { blockId: string }[]).map((r) => r.blockId))
      }
    } catch (e) {
      if (import.meta.dev) console.warn('[useSecretReveals] Failed to load secret reveals:', e)
    }
  }

  function injectRevealButtons() {
    if (!contentRef.value || !isDm.value) return
    const slug = getSlug()
    if (!slug) return

    const blocks = contentRef.value.querySelectorAll('[data-secret][data-secret-id]')
    for (const block of blocks) {
      const blockId = block.getAttribute('data-secret-id')!
      if (block.querySelector('[data-reveal-btn]')) continue

      const btn = document.createElement('button')
      btn.setAttribute('data-reveal-btn', blockId)
      const isRevealed = revealedBlocks.value.has(blockId)
      btn.className = `text-xs px-2 py-0.5 rounded font-medium transition-colors ml-2 ${
        isRevealed
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      }`
      btn.textContent = isRevealed ? t('secrets.unreveal') : t('secrets.reveal')
      btn.addEventListener('click', async () => {
        const revealed = revealedBlocks.value.has(blockId)
        if (revealed) {
          // $fetch so the CSRF plugin injects X-CSRF-Token on this mutating request
          await $fetch(`/api/campaigns/${campaignId}/entities/${slug}/secrets/${blockId}`, {
            method: 'DELETE',
          })
          revealedBlocks.value = new Set([...revealedBlocks.value].filter((id) => id !== blockId))
        } else {
          await $fetch(`/api/campaigns/${campaignId}/entities/${slug}/secrets`, {
            method: 'POST',
            body: { blockId },
          })
          revealedBlocks.value = new Set([...revealedBlocks.value, blockId])
        }
        block.querySelector('[data-reveal-btn]')?.remove()
        injectRevealButtons()
      })
      block.prepend(btn)
    }
  }

  // Re-inject buttons when revealed state changes
  watch(revealedBlocks, async () => {
    await nextTick()
    contentRef.value?.querySelectorAll('[data-reveal-btn]').forEach((b) => b.remove())
    injectRevealButtons()
  })

  return {
    revealedBlocks,
    loadRevealedBlocks,
    injectRevealButtons,
  }
}
