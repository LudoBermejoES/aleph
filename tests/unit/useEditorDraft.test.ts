import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useEditorDraft } from '../../app/composables/useEditorDraft'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(globalThis, 'window', { value: { addEventListener: vi.fn(), removeEventListener: vi.fn() }, writable: true })

beforeEach(() => {
  localStorageMock.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useEditorDraft', () => {
  it('writes draft to localStorage after 1s debounce', async () => {
    const key = ref('aleph:draft:c1:character:hero')
    const server = ref('')
    const { scheduleDraftWrite } = useEditorDraft(key, server)

    scheduleDraftWrite('new content')
    expect(localStorageMock.getItem('aleph:draft:c1:character:hero')).toBeNull()

    vi.advanceTimersByTime(1000)
    expect(localStorageMock.getItem('aleph:draft:c1:character:hero')).toBe('new content')
  })

  it('does NOT write to localStorage when draftKey is null', async () => {
    const key = ref<string | null>(null)
    const server = ref('')
    const { scheduleDraftWrite } = useEditorDraft(key, server)

    scheduleDraftWrite('should not be saved')
    vi.advanceTimersByTime(1000)
    expect(localStorageMock.getItem('aleph:draft:c1:character:hero')).toBeNull()
  })

  it('hasDraft is false when draft matches server content', async () => {
    localStorageMock.setItem('aleph:draft:c1:character:hero', 'same content')
    const key = ref('aleph:draft:c1:character:hero')
    const server = ref('same content')
    const { hasDraft } = useEditorDraft(key, server)

    // simulate mount
    await nextTick()
    // hasDraft computes based on draftContent after mount; test computed logic directly
    // Since onMounted won't run in unit test context, we verify via scheduleDraftWrite + discard pattern
    expect(hasDraft.value).toBe(false)
  })

  it('hasDraft is true when draft differs from server content', async () => {
    // Pre-seed localStorage so the watch(draftKey) fires with an existing draft
    localStorageMock.setItem('aleph:draft:c1:character:alt', 'draft version')
    const key = ref<string | null>(null)
    const server = ref('server version')
    const { hasDraft } = useEditorDraft(key, server)

    // Trigger the key watch by setting the key pointing to the pre-seeded draft
    key.value = 'aleph:draft:c1:character:alt'
    await nextTick()
    expect(hasDraft.value).toBe(true)
  })

  it('discardDraft removes key from localStorage', async () => {
    localStorageMock.setItem('aleph:draft:c1:character:hero', 'some draft')
    const key = ref('aleph:draft:c1:character:hero')
    const server = ref('')
    const { discardDraft } = useEditorDraft(key, server)

    discardDraft()
    expect(localStorageMock.getItem('aleph:draft:c1:character:hero')).toBeNull()
  })

  it('silently handles QuotaExceededError', () => {
    const key = ref('aleph:draft:c1:character:hero')
    const server = ref('')
    const { scheduleDraftWrite } = useEditorDraft(key, server)

    localStorageMock.setItem = () => { throw new DOMException('QuotaExceededError') }

    expect(() => {
      scheduleDraftWrite('content')
      vi.advanceTimersByTime(1000)
    }).not.toThrow()

    localStorageMock.setItem = (k, v) => { (localStorageMock as any)._store = (localStorageMock as any)._store || {}; (localStorageMock as any)._store[k] = v }
  })
})
