import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'

export function useEditorDraft(draftKey: Ref<string | null>, serverContent: Ref<string>) {
  const draftContent = ref<string | null>(null)

  // hasDraft: a saved draft exists and differs from server content
  const hasDraft = computed(
    () => draftContent.value !== null && draftContent.value !== serverContent.value,
  )

  // Load draft from localStorage on mount
  onMounted(() => {
    if (!draftKey.value) return
    try {
      draftContent.value = localStorage.getItem(draftKey.value)
    } catch {
      // localStorage unavailable (e.g. private mode with strict settings)
    }
  })

  // Debounced write to localStorage
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingContent: string | null = null

  function flushDraft() {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (draftKey.value !== null && pendingContent !== null) {
      try {
        localStorage.setItem(draftKey.value, pendingContent)
      } catch {
        // QuotaExceededError or similar — silently skip
      }
    }
  }

  function scheduleDraftWrite(content: string) {
    if (!draftKey.value) return
    pendingContent = content
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(flushDraft, 1000)
  }

  // Flush on page unload so draft is saved even if debounce hasn't fired
  function onBeforeUnload() {
    flushDraft()
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onUnmounted(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    if (debounceTimer !== null) clearTimeout(debounceTimer)
  })

  function restoreDraft() {
    // Caller sets editor content to draftContent.value
  }

  function discardDraft() {
    if (!draftKey.value) return
    try {
      localStorage.removeItem(draftKey.value)
    } catch { /* ignore */ }
    draftContent.value = null
  }

  // Re-load draft when key changes (e.g. after save redirects to edit page)
  watch(draftKey, (key) => {
    if (!key) {
      draftContent.value = null
      return
    }
    try {
      draftContent.value = localStorage.getItem(key)
    } catch {
      draftContent.value = null
    }
  })

  return { hasDraft, draftContent, scheduleDraftWrite, discardDraft }
}
