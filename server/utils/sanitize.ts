/**
 * Escape LIKE wildcard characters so user input is treated literally.
 * Use with: like(col, `%${escapeLike(search)}%`)
 * and include ESCAPE '\\' in raw SQL if the ORM supports it.
 */
export function escapeLike(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_')
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const WEBP_MAGIC_RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP_MAGIC_WEBP = [0x57, 0x45, 0x42, 0x50]

function startsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false
  return bytes.every((b, i) => buf[i] === b)
}

/**
 * Detect MIME type from file magic bytes.
 * Returns 'image/png', 'image/jpeg', 'image/webp', or null if unrecognized.
 */
export function detectMimeFromBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 4) return null
  if (startsWith(buffer, PNG_MAGIC)) return 'image/png'
  if (startsWith(buffer, JPEG_MAGIC)) return 'image/jpeg'
  // WebP: RIFF....WEBP
  if (startsWith(buffer, WEBP_MAGIC_RIFF) && buffer.length >= 12) {
    const webpSlice = [...buffer.subarray(8, 12)]
    if (WEBP_MAGIC_WEBP.every((b, i) => webpSlice[i] === b)) return 'image/webp'
  }
  return null
}
