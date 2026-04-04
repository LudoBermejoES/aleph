import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import StarterKit from '@tiptap/starter-kit'

export function useCollaborationProvider(options: {
  documentName: string
  userName: string
  userColor: string
}) {
  const ydoc = new Y.Doc()
  let provider: HocuspocusProvider | null = null

  async function init() {
    let wsToken = ''
    try {
      const res = await fetch('/api/ws/token', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        wsToken = data.token
      }
    } catch { /* fallback to empty token */ }

    provider = new HocuspocusProvider({
      url: useRuntimeConfig().public.hocuspocusUrl as string,
      name: options.documentName,
      document: ydoc,
      token: wsToken,
    })

    return provider
  }

  function getExtensions(prov: HocuspocusProvider) {
    return [
      StarterKit.configure({ history: false, link: { openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } } }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider: prov,
        user: {
          name: options.userName || 'Anonymous',
          color: options.userColor || '#' + Math.floor(Math.random() * 16777215).toString(16),
        },
      }),
    ]
  }

  function cleanup() {
    provider?.destroy()
    provider = null
    ydoc.destroy()
  }

  onUnmounted(cleanup)

  return { ydoc, init, getExtensions, cleanup }
}
