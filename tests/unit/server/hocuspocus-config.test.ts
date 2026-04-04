import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Hocuspocus URL configuration', () => {
  it('nuxt.config.ts defines hocuspocusUrl in runtimeConfig.public', () => {
    const config = readFileSync(resolve(__dirname, '../../../nuxt.config.ts'), 'utf-8')
    expect(config).toContain('hocuspocusUrl')
    expect(config).toContain('runtimeConfig')
  })

  it('MarkdownEditor reads URL from useRuntimeConfig instead of hardcoding', () => {
    const editor = readFileSync(resolve(__dirname, '../../../app/components/MarkdownEditor.client.vue'), 'utf-8')
    expect(editor).toContain('useRuntimeConfig().public.hocuspocusUrl')
    expect(editor).not.toContain('ws://${window.location.hostname}:3334')
  })
})
