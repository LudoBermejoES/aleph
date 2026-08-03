/**
 * Unit coverage for the location gallery CLI.
 *
 * Two things are worth testing without a server:
 *  1. `postMultipart()` — the only client helper this change altered. A caption has to ride
 *     alongside the file as a form field, and the MIME type has to come from the extension,
 *     because the server rejects a mismatch by magic bytes.
 *  2. The command wiring — that each subcommand targets the right URL and method. A wrong verb
 *     or a missing path segment is the failure this catches before it reaches the server.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

// `client.js` pulls in `config.js`, which imports `conf` — a dependency of `cli/package.json`,
// NOT of the root. The unit-test CI job installs root deps only (`cli/` deps are installed in
// the integration job), so importing the real config here fails in CI while passing locally off
// a stale `cli/node_modules`. Mocking with a factory means the real module — and `conf` — is
// never loaded, which keeps `tests/unit/` free of CLI dependencies the way every other
// `tests/unit/cli/` test is.
vi.mock('../../../cli/src/lib/config.js', () => ({
  requireConfig: () => ({
    url: process.env.ALEPH_URL,
    apiKey: process.env.ALEPH_TOKEN,
    apiKeyId: null,
  }),
}))

const { postMultipart } = await import('../../../cli/src/lib/client.js')

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/location.js'), 'utf-8')

// A real 1×1 PNG; postMultipart reads the file off disk.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('postMultipart — caption rides with the file', () => {
  let dir: string
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'aleph-cli-'))
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
  })

  function writePng(name = 'cover.png') {
    const path = join(dir, name)
    writeFileSync(path, PNG)
    return path
  }

  async function sentForm(file: string, extra?: Record<string, unknown>) {
    await postMultipart('/api/campaigns/c1/locations/the-shire/images', file, 'image', extra)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    return { url, init, form: init.body as FormData }
  }

  it('sends the file under the requested field name', async () => {
    const { form } = await sentForm(writePng())
    const part = form.get('image')
    expect(part).toBeInstanceOf(Blob)
    expect((part as Blob).type).toBe('image/png')
  })

  it('appends a caption as its own form field', async () => {
    const { form } = await sentForm(writePng(), { caption: 'The harbour' })
    expect(form.get('caption')).toBe('The harbour')
  })

  it('omits the caption field entirely when it is undefined', async () => {
    // commander leaves an unpassed --caption undefined; sending "undefined" as a caption
    // would store the literal string.
    const { form } = await sentForm(writePng(), { caption: undefined })
    expect(form.has('caption')).toBe(false)
  })

  it('omits the caption field when it is null', async () => {
    const { form } = await sentForm(writePng(), { caption: null })
    expect(form.has('caption')).toBe(false)
  })

  it('derives the MIME type from the extension, since the server checks magic bytes', async () => {
    for (const [name, mime] of [
      ['a.png', 'image/png'],
      ['a.jpg', 'image/jpeg'],
      ['a.jpeg', 'image/jpeg'],
      ['a.webp', 'image/webp'],
    ] as const) {
      fetchMock.mockClear()
      const { form } = await sentForm(writePng(name))
      expect((form.get('image') as Blob).type, name).toBe(mime)
    }
  })

  it('sends the API key and no JSON content-type', async () => {
    const { init } = await sentForm(writePng())
    const headers = init.headers as Record<string, string>
    expect(headers['X-API-Key']).toBe('aleph_test_key')
    // Setting Content-Type by hand would strip the multipart boundary.
    expect(Object.keys(headers)).not.toContain('Content-Type')
  })

  it('posts to the URL it was given, joined to the configured base', async () => {
    const { url, init } = await sentForm(writePng())
    expect(url).toBe('http://localhost:9999/api/campaigns/c1/locations/the-shire/images')
    expect(init.method).toBe('POST')
  })
})

describe('location image command wiring', () => {
  const commands = [
    'images <slug>',
    'image-add <slug>',
    'image-update <slug> <imageId>',
    'image-set-primary <slug> <imageId>',
    'image-remove <slug> <imageId>',
  ]

  it.each(commands)('registers `location %s`', (name) => {
    expect(source).toContain(`.command('${name}')`)
  })

  it('lists and uploads against the gallery collection URL', () => {
    expect(source).toContain('locations/${slug}/images`)')
    expect(source).toContain('postMultipart(')
  })

  it('addresses a single image by id for update, set-primary and remove', () => {
    const perImage = source.match(/locations\/\$\{slug\}\/images\/\$\{imageId\}/g) ?? []
    expect(perImage.length).toBeGreaterThanOrEqual(3)
  })

  it('uses PATCH for metadata and DELETE for removal, never PUT', () => {
    expect(source).toContain('patch(`/api/campaigns/${opts.campaign}/locations/${slug}/images/')
    expect(source).toContain('del(`/api/campaigns/${opts.campaign}/locations/${slug}/images/')
    expect(source).not.toMatch(
      /put\(`\/api\/campaigns\/\$\{opts\.campaign\}\/locations\/\$\{slug\}\/images/,
    )
  })

  it('set-primary sends isPrimary true and nothing else', () => {
    const block = source.slice(source.indexOf(".command('image-set-primary"))
    expect(block).toContain('isPrimary: true')
    expect(block.slice(0, block.indexOf('image-remove'))).not.toContain('sortOrder')
  })

  it('image-update refuses to send an empty body', () => {
    const block = source.slice(
      source.indexOf(".command('image-update"),
      source.indexOf(".command('image-set-primary"),
    )
    expect(block).toContain('Object.keys(body).length === 0')
    expect(block).toContain('--caption and/or --order')
  })

  it('image-update clears the caption on an empty string rather than sending ""', () => {
    const block = source.slice(
      source.indexOf(".command('image-update"),
      source.indexOf(".command('image-set-primary"),
    )
    expect(block).toContain('body.caption = opts.caption || null')
  })

  it('image-update coerces --order to a number', () => {
    const block = source.slice(
      source.indexOf(".command('image-update"),
      source.indexOf(".command('image-set-primary"),
    )
    expect(block).toContain('Number(opts.order)')
  })

  it('every image command requires --campaign', () => {
    for (const name of commands) {
      const start = source.indexOf(`.command('${name}')`)
      const block = source.slice(start, start + 600)
      expect(block, name).toContain("requiredOption('--campaign <id>'")
    }
  })

  it('image-add requires --file and offers --caption', () => {
    const start = source.indexOf(".command('image-add")
    const block = source.slice(start, start + 900)
    expect(block).toContain("requiredOption('--file <path>'")
    expect(block).toContain("option('--caption <text>'")
  })

  it('the list marks the main image instead of printing a raw boolean', () => {
    const start = source.indexOf(".command('images")
    const block = source.slice(start, start + 900)
    expect(block).toContain("i.isPrimary ? '*' : ''")
  })
})
