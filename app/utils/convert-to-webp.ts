const WEBP_QUALITY = 0.82

/**
 * Convert an image File/Blob to WebP format using the Canvas API.
 * GIFs are passed through unchanged (to preserve animation).
 * Returns the original on any conversion failure.
 */
export async function convertToWebP(file: File | Blob): Promise<Blob> {
  // GIF passthrough — canvas loses animation frames
  if (file.type === 'image/gif') return file

  // Only convert known image types
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)

    // Prefer OffscreenCanvas (async, no DOM needed)
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close()
      const webpBlob = await canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY })
      if (webpBlob && webpBlob.size > 0) return webpBlob
      return file
    }

    // Fallback: HTMLCanvasElement (requires DOM)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob && blob.size > 0 ? blob : file),
        'image/webp',
        WEBP_QUALITY,
      )
    })
  } catch {
    return file
  }
}
