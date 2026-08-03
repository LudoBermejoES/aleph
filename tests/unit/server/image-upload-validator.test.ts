import { describe, it, expect } from 'vitest'
import {
  ImageUploadError,
  MAX_IMAGE_SIZE_BYTES,
  validateImageUpload,
} from '../../../server/utils/image-upload'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

function part(overrides: Partial<Parameters<typeof validateImageUpload>[0]> = {}) {
  return {
    name: 'image',
    filename: 'cover.png',
    type: 'image/png',
    data: PNG_MAGIC,
    ...overrides,
  } as Parameters<typeof validateImageUpload>[0]
}

describe('validateImageUpload', () => {
  it('accepts a PNG and maps it to .png', () => {
    expect(validateImageUpload(part())).toMatchObject({ mime: 'image/png', ext: '.png' })
  })

  it('accepts a JPEG and maps it to .jpg', () => {
    const result = validateImageUpload(
      part({ type: 'image/jpeg', filename: 'cover.jpeg', data: JPEG_MAGIC }),
    )
    expect(result).toMatchObject({ mime: 'image/jpeg', ext: '.jpg' })
  })

  it('rejects a missing part', () => {
    expect(() => validateImageUpload(undefined)).toThrow(ImageUploadError)
  })

  it('rejects a disallowed declared MIME type', () => {
    expect(() => validateImageUpload(part({ type: 'image/gif' }))).toThrow(/Invalid file type/)
  })

  it('rejects content that does not match the declared type', () => {
    // Declared PNG, actual JPEG bytes — the magic-byte check is what catches this.
    expect(() => validateImageUpload(part({ data: JPEG_MAGIC }))).toThrow(
      /does not match declared MIME type/,
    )
  })

  it('rejects a file over the 10 MB cap', () => {
    const oversize = Buffer.concat([PNG_MAGIC, Buffer.alloc(MAX_IMAGE_SIZE_BYTES)])
    expect(() => validateImageUpload(part({ data: oversize }))).toThrow(/10 MB size limit/)
  })

  it('rejects unrecognisable bytes declared as an image', () => {
    expect(() => validateImageUpload(part({ data: Buffer.from('not an image') }))).toThrow(
      ImageUploadError,
    )
  })
})
