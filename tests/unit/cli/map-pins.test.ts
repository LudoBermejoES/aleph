/**
 * Unit coverage for the `map` CLI commands' contract with the real server endpoints.
 *
 * `map pin-add` shipped sending `{ label, x, y }` while
 * `server/api/campaigns/[id]/maps/[slug]/pins/index.post.ts` requires `{ lat, lng }` as
 * REQUIRED numbers (`z.number()`, no default) — every invocation failed with a 422
 * "Validation failed" before the map slug was even looked up. Reproduced against
 * production (see `proposal.md`), not deduced. This suite pins the request body shape so a
 * future rename can't silently reopen the same gap — and does it without a live server,
 * because that gap existed for as long as it did precisely because nothing exercised it.
 *
 * `map upload` has (had) the same species of bug one field over: it posted the file under
 * the multipart field name `file`, while
 * `server/api/campaigns/[id]/maps/[slug]/upload.post.ts` only looks for `formData.find((f) =>
 * f.name === 'image')` — the same convention `entity.js`/`location.js`/`organization.js`
 * already use for their own image uploads.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

// Same rationale as tests/unit/cli/location-images.test.ts: avoid pulling in `conf` (a
// `cli/package.json` dependency, not the root's) so this suite runs in the unit job.
vi.mock('../../../cli/src/lib/config.js', () => ({
  requireConfig: () => ({
    url: process.env.ALEPH_URL,
    apiKey: process.env.ALEPH_TOKEN,
    apiKeyId: null,
  }),
}))

const { post, patch, postMultipart } = await import('../../../cli/src/lib/client.js')

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/map.js'), 'utf-8')

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('map pin-add / map.js source: sends lat/lng, not x/y', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'pin-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
  })

  it('posts a body with lat/lng keys, matching the pins endpoint zod schema', async () => {
    await post('/api/campaigns/c1/maps/harbour/pins', { label: 'Docks', lat: 41.5, lng: 2.1 })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ label: 'Docks', lat: 41.5, lng: 2.1 })
    expect(body.x).toBeUndefined()
    expect(body.y).toBeUndefined()
  })

  it('`pin-add` is declared with --lat/--lng options, not --x/--y', () => {
    const start = source.indexOf(".command('pin-add')")
    expect(start).toBeGreaterThan(-1)
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    expect(block).toMatch(/requiredOption\(\s*'--lat <lat>'/)
    expect(block).toMatch(/requiredOption\(\s*'--lng <lng>'/)
    expect(block).not.toContain('--x <x>')
    expect(block).not.toContain('--y <y>')
  })

  it("`pin-add`'s request body uses lat/lng keys, not x/y", () => {
    const start = source.indexOf(".command('pin-add')")
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    expect(block).toMatch(/\{\s*label:\s*opts\.label,\s*lat:\s*opts\.lat,\s*lng:\s*opts\.lng\s*\}/)
    expect(block).not.toMatch(/\{\s*label:\s*opts\.label,\s*x:\s*opts\.x,\s*y:\s*opts\.y\s*\}/)
  })

  it('`pins` prints lat/lng, since that is what the server actually returns', () => {
    const start = source.indexOf(".command('pins')")
    const block = source.slice(start, source.indexOf(".command('pin-add')"))
    expect(block).toContain('lat: p.lat')
    expect(block).toContain('lng: p.lng')
    expect(block).not.toContain('x: p.x')
    expect(block).not.toContain('y: p.y')
  })
})

// move-pins-and-resolve-entity-images: there was previously NO endpoint at all to move a
// pin (only pin-add/pin-delete existed), so this is new coverage, not a regression fixture.
describe('map pin-move: PATCHes lat/lng only, matching the new endpoint', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: 'pin-1', lat: 41.5, lng: 2.1 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
  })

  it('sends a PATCH with only lat/lng in the body', async () => {
    await patch('/api/campaigns/c1/maps/harbour/pins/pin-1', { lat: 41.5, lng: 2.1 })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:9999/api/campaigns/c1/maps/harbour/pins/pin-1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ lat: 41.5, lng: 2.1 })
  })

  it('`pin-move` is declared with --lat/--lng/--pin options', () => {
    const start = source.indexOf(".command('pin-move')")
    expect(start).toBeGreaterThan(-1)
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    expect(block).toMatch(/requiredOption\(\s*'--pin <pinId>'/)
    expect(block).toMatch(/requiredOption\(\s*'--lat <lat>'/)
    expect(block).toMatch(/requiredOption\(\s*'--lng <lng>'/)
  })

  it("`pin-move`'s action calls the client `patch` function against the pins/:pinId route", () => {
    const start = source.indexOf(".command('pin-move')")
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    expect(block).toMatch(
      /patch\(\s*`\/api\/campaigns\/\$\{opts\.campaign\}\/maps\/\$\{opts\.slug\}\/pins\/\$\{opts\.pin\}`/,
    )
    expect(block).not.toContain('put(')
  })
})

describe('map upload: multipart field name matches the server (`image`, not `file`)', () => {
  let dir: string
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'aleph-cli-map-'))
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

  it('the `upload` command calls postMultipart with field name "image"', () => {
    const start = source.indexOf(".command('upload')")
    const block = source.slice(start, source.indexOf(".command('pins')"))
    expect(block).toMatch(/postMultipart\(\s*`[^`]+`,\s*opts\.file,\s*'image',?\s*\)/)
    expect(block).not.toMatch(/postMultipart\(\s*`[^`]+`,\s*opts\.file,\s*'file',?\s*\)/)
  })

  it('a direct postMultipart(..., "image") call uploads the file under the field the server reads', async () => {
    const path = join(dir, 'map.png')
    writeFileSync(path, PNG)
    await postMultipart('/api/campaigns/c1/maps/harbour/upload', path, 'image')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const form = init.body as FormData
    expect(form.get('image')).toBeInstanceOf(Blob)
    expect(form.get('file')).toBeNull()
  })
})

describe('map create / update: no dead --description option', () => {
  it('does not offer --description on `create`, since the maps table has no such column', () => {
    const start = source.indexOf(".command('create')")
    const block = source.slice(start, source.indexOf(".command('update')"))
    expect(block).not.toContain('--description')
    expect(block).not.toContain('opts.description')
  })

  it('does not offer --description on `update`, for the same reason', () => {
    const start = source.indexOf(".command('update')")
    const block = source.slice(start, source.indexOf(".command('delete')"))
    expect(block).not.toContain('--description')
    expect(block).not.toContain('opts.description')
  })
})
