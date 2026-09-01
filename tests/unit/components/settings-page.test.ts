// @vitest-environment jsdom
/**
 * The `/settings` API-keys revoke flow, mounted for real.
 *
 * This exists because of a defect that made the "Revoke" button decorative:
 * `app/pages/settings/index.vue` called `useI18n()` INSIDE the async `handleRevoke`
 * handler instead of at the top of `<script setup>`. `useI18n()` (from `vue-i18n`)
 * throws `Must be called at the top of a \`setup\` function` when there is no active
 * component instance — true the moment execution resumes after any `await`, and
 * apparently also true synchronously here because the throwing expression
 * (`useI18n().t(...)`) is evaluated as the FIRST statement of the handler, before
 * `confirm()` is ever reached. Measured in a real browser: 0 `confirm()` dialogs, 0
 * `DELETE` requests, the key still listed 4s later.
 *
 * `openspec/changes/archive/2026-03-27-api-keys/specs/api-key-settings-ui/spec.md`,
 * "Revoke an API key": on confirmation the UI calls `DELETE /api/apikeys/:id` and the
 * key is removed from the list; on cancellation the key stays. Both scenarios are
 * asserted here from the OUTCOME (was the delete call made? is the row gone?), not
 * from "did an exception fire", because an outcome assertion fails for the right
 * reason under BOTH the original bug and a hypothetical partial fix that skips the
 * confirmation step.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import SettingsPage from '../../../app/pages/settings/index.vue'

// `useCurrentUser` calls `useAsyncData`/`$fetch` under the hood, which need a live Nuxt
// app instance. Mocking the whole module (rather than `vi.stubGlobal`, which does not
// work for a real `import`) is what lets the page mount in plain jsdom.
vi.mock('~/composables/useAuth', () => ({
  useCurrentUser: () => ({ isAdmin: ref(false), user: ref(null) }),
}))

const es = JSON.parse(
  readFileSync(resolve(__dirname, '../../../i18n/locales/es.json'), 'utf-8'),
) as Record<string, unknown>
const i18n = createI18n({ legacy: false, locale: 'es', messages: { es } })

const KEY_A = {
  id: 'key-a',
  name: 'aleph-cli',
  keyPrefix: 'aleph_ab',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
}

/** A minimal in-memory `/api/apikeys` backing `useApiKeys` (the REAL composable, not mocked). */
function stubFetch(initialKeys: (typeof KEY_A)[]) {
  let keys = [...initialKeys]
  const deleteCalls: string[] = []
  vi.stubGlobal(
    '$fetch',
    vi.fn(async (url: string, opts?: { method?: string }) => {
      const method = opts?.method ?? 'GET'
      if (String(url) === '/api/apikeys' && method === 'GET') return keys
      const match = String(url).match(/^\/api\/apikeys\/(.+)$/)
      if (match && method === 'DELETE') {
        deleteCalls.push(match[1]!)
        keys = keys.filter((k) => k.id !== match[1])
        return {}
      }
      throw new Error(`unstubbed $fetch call: ${method} ${url}`)
    }),
  )
  return { deleteCalls }
}

async function settingsPage() {
  const w = mount(SettingsPage, {
    global: {
      plugins: [i18n],
      stubs: { NuxtLink: { template: '<a><slot /></a>' } },
    },
  })
  await flushPromises()
  return w
}

const revokeButton = (w: Awaited<ReturnType<typeof settingsPage>>) =>
  w.findAll('button').find((b) => b.text() === es.apiKeys!['revoke' as never])

describe('/settings — API key revoke (api-key-settings-ui, "Revoke an API key")', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists the existing key with its name and prefix, revoke button present', async () => {
    stubFetch([KEY_A])
    const w = await settingsPage()
    expect(w.text()).toContain('aleph-cli')
    expect(w.text()).toContain('aleph_ab')
    expect(revokeButton(w)).toBeDefined()
  })

  it('Revoke with confirmation: calls DELETE and removes the key from the list', async () => {
    const { deleteCalls } = stubFetch([KEY_A])
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    const w = await settingsPage()

    await revokeButton(w)!.trigger('click')
    await flushPromises()

    // This is exactly what died under the bug: 0 confirm() calls, 0 DELETE calls.
    expect(globalThis.confirm).toHaveBeenCalledTimes(1)
    expect(deleteCalls).toEqual(['key-a'])
    // `keyPrefix`, not `name`: the key's name ("aleph-cli") also appears verbatim in the
    // section's static description copy, so asserting on it would pass even if the row
    // were never removed.
    expect(w.text()).not.toContain('aleph_ab')
    expect(w.text()).toContain(es.apiKeys!['empty' as never])
  })

  it('Revoke cancellation: no DELETE call, the key stays listed', async () => {
    const { deleteCalls } = stubFetch([KEY_A])
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    )
    const w = await settingsPage()

    await revokeButton(w)!.trigger('click')
    await flushPromises()

    expect(deleteCalls).toEqual([])
    expect(w.text()).toContain('aleph_ab')
  })
})
