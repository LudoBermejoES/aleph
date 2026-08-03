import { extname } from 'path'
import { detectMimeFromBytes } from './sanitize'

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
}

export const EXT_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

export interface UploadedImagePart {
  name?: string
  filename?: string
  type?: string
  data: Buffer
}

export interface ValidatedImage {
  mime: string
  ext: string
  data: Buffer
}

export class ImageUploadError extends Error {
  statusCode = 400
}

/**
 * Validate a multipart image part: declared MIME against the allow-list, actual content against
 * its magic bytes, and size against the 10 MB cap.
 *
 * Shared by the entity image route and the location gallery route so the two cannot drift apart.
 * Throws {@link ImageUploadError}; callers translate it into an H3 400.
 */
export function validateImageUpload(file: UploadedImagePart | undefined): ValidatedImage {
  if (!file || !file.data) {
    throw new ImageUploadError('Image file is required (field name: "image")')
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mime)) {
    throw new ImageUploadError(`Invalid file type "${mime}". Allowed: png, jpeg, webp`)
  }

  if (file.data.length > MAX_IMAGE_SIZE_BYTES) {
    throw new ImageUploadError('File exceeds the 10 MB size limit')
  }

  const detectedMime = detectMimeFromBytes(file.data)
  if (!detectedMime || detectedMime !== mime) {
    throw new ImageUploadError('File content does not match declared MIME type')
  }

  const ext = MIME_TO_EXT[mime] ?? (extname(file.filename || '.png') || '.png')

  return { mime, ext, data: file.data }
}
