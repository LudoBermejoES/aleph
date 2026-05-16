import { inlineBase64AssetStore, type TLAsset, type TLAssetStore } from 'tldraw'
import { convertToWebP } from './convert-to-webp'

function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match?.[1]
}

/**
 * Create a TLAssetStore that converts images to WebP and uploads
 * them to the Aleph server, falling back to inline base64 on failure.
 */
export function createAlephAssetStore(campaignId: string): TLAssetStore {
  return {
    async upload(asset: TLAsset, file: File, abortSignal?: AbortSignal) {
      try {
        const converted = await convertToWebP(file)
        const isConverted = converted !== file
        const ext = isConverted ? 'webp' : (file.name?.split('.').pop() ?? 'png')
        const baseName = file.name?.replace(/\.[^.]+$/, '') ?? asset.id
        const filename = `${baseName}.${ext}`

        const form = new FormData()
        form.append('file', converted, filename)

        const headers: Record<string, string> = {}
        const csrfToken = getCsrfToken()
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken

        const res = await fetch(`/api/campaigns/${campaignId}/images`, {
          method: 'POST',
          body: form,
          headers,
          signal: abortSignal,
        })

        if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
        const { url } = (await res.json()) as { url: string }
        return { src: url }
      } catch {
        // Fall back to inline base64 so the image is not lost
        return inlineBase64AssetStore.upload(asset, file, abortSignal)
      }
    },
  }
}
