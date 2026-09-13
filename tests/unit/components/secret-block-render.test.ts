// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Secret from '../../../app/components/mdc/Secret.vue'

/**
 * El fallo que estas pruebas existen para impedir NO era un error: era un silencio.
 *
 * El componente se llamaba `SecretBlock.vue`, pero MDC resuelve `:::secret{...}` buscando
 * `pascalCase('secret')` = `Secret`. Un componente MDC que no resuelve no lanza nada: Vue
 * pinta el slot y se pierde solo el envoltorio. Resultado: el texto se veía, el recuadro no,
 * y el Narrador no podía saber de un vistazo qué prosa era secreta ni para quién — que es lo
 * que dejó pasar que un PJ tuviera su historia en `:::secret{.dm}`, invisible para su jugador.
 *
 * Por eso la primera prueba es sobre el NOMBRE DEL FICHERO, no sobre el comportamiento: es la
 * única que habría detectado el fallo original.
 */

const stubs = { teleport: true }

function mountWith(attrs: Record<string, unknown>) {
  return mount(Secret, { attrs, slots: { default: '<p>prosa</p>' }, global: { stubs } })
}

vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: 'campaña-1' } }) }))

describe('Secret.vue — el recuadro de los bloques :::secret', () => {
  it('se llama Secret.vue, que es el nombre que MDC resuelve para `:::secret`', async () => {
    const { readdirSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    // Bajo jsdom `import.meta.url` no es una URL `file:`, así que se resuelve desde la raíz.
    const files = readdirSync(resolve(process.cwd(), 'app/components/mdc'))
    expect(files).toContain('Secret.vue')
    // `SecretBlock.vue` no resolvía nunca: si reaparece, el recuadro vuelve a desaparecer.
    expect(files).not.toContain('SecretBlock.vue')
  })

  it('pinta el recuadro aunque la audiencia sea irreconocible, en vez de romperse', () => {
    const w = mountWith({ class: 'algo-que-no-esperabamos' })
    expect(w.find('[data-testid="secret-block"]').exists()).toBe(true)
    expect(w.text()).toContain('Contenido secreto')
    expect(w.text()).toContain('prosa')
  })

  it('dice "Solo el Narrador" para {.dm}', () => {
    expect(mountWith({ class: 'dm' }).text()).toContain('Solo el Narrador')
  })

  it('dice "Narrador y editores" para {.editor}', () => {
    expect(mountWith({ class: 'editor' }).text()).toContain('Narrador y editores')
  })

  it('cuenta los jugadores de {.player:a,b} cuando aún no tiene sus nombres', () => {
    const w = mountWith({ class: 'player:abc,def' })
    expect(w.text()).toContain('Solo el Narrador y 2 jugadores')
  })

  it('usa el singular con un solo jugador', () => {
    expect(mountWith({ class: 'player:abc' }).text()).toContain('Solo el Narrador y 1 jugador')
  })

  it('no confunde un id que contenga "dm" con un bloque de Narrador', () => {
    // Los ids son alfanuméricos de 32 caracteres: alguno contendrá "dm" antes o después.
    const w = mountWith({ class: 'player:xxdmxx' })
    expect(w.text()).toContain('Solo el Narrador y 1 jugador')
    expect(w.text()).not.toContain('Solo el Narrador\n')
  })

  it('siempre renderiza el contenido del bloque, que es lo que el lector viene a leer', () => {
    for (const cls of ['dm', 'editor', 'player:abc', '']) {
      expect(mountWith({ class: cls }).text()).toContain('prosa')
    }
  })
})
