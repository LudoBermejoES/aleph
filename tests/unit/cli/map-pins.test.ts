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
    // add-pin-rename: `label` moved out of the object literal into a conditional assignment
    // (`opts.label` is now optional -- an omitted `--label` must not send `label: undefined`
    // as a literal key), so the literal itself is just `{ lat, lng }`.
    expect(block).toMatch(/\{\s*lat:\s*opts\.lat,\s*lng:\s*opts\.lng\s*\}/)
    expect(block).not.toMatch(/\{\s*label:\s*opts\.label,\s*x:\s*opts\.x,\s*y:\s*opts\.y\s*\}/)
  })

  // add-pin-rename: pin creation must stop copying the entity's name into `label`, which
  // means `--label` can no longer be required -- a pin dropped with none is the new normal
  // case, not a gap.
  it("`pin-add`'s --label is optional, not required", () => {
    const start = source.indexOf(".command('pin-add')")
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    const addBlock = block.slice(0, block.indexOf(".command('pin-move')"))
    expect(addBlock).toMatch(/\.option\(\s*'--label <label>'/)
    expect(addBlock).not.toMatch(/\.requiredOption\(\s*'--label <label>'/)
  })

  it('`pin-add` omits `label` from the request body entirely when --label is not given', async () => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'pin-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await post('/api/campaigns/c1/maps/harbour/pins', { lat: 41.5, lng: 2.1 })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ lat: 41.5, lng: 2.1 })
    expect('label' in body).toBe(false)
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

// add-pin-rename: there was previously no way to correct a pin's label short of deleting and
// re-creating the pin -- exactly the gap that forced five hand-repairs over SQL.
describe('map pin-rename: PATCHes label only, matching the widened endpoint', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ id: 'pin-1', label: 'New Name' }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
  })

  it('sends a PATCH with only label in the body', async () => {
    await patch('/api/campaigns/c1/maps/harbour/pins/pin-1', { label: 'New Name' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:9999/api/campaigns/c1/maps/harbour/pins/pin-1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ label: 'New Name' })
  })

  it('`pin-rename` is declared with --pin/--label options', () => {
    const start = source.indexOf(".command('pin-rename')")
    expect(start).toBeGreaterThan(-1)
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    expect(block).toMatch(/requiredOption\(\s*'--pin <pinId>'/)
    expect(block).toMatch(/requiredOption\(\s*'--label <label>'/)
  })

  it("`pin-rename`'s action calls the client `patch` function against the pins/:pinId route", () => {
    const start = source.indexOf(".command('pin-rename')")
    const block = source.slice(start, source.indexOf(".command('pin-delete')"))
    expect(block).toMatch(
      /patch\(\s*`\/api\/campaigns\/\$\{opts\.campaign\}\/maps\/\$\{opts\.slug\}\/pins\/\$\{opts\.pin\}`,\s*\{\s*label:\s*opts\.label\s*\}/,
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

/**
 * add-entity-link-parity — the guard for a RECURRING bug family, not for one bug.
 *
 * Four times now a `map` CLI command has sent a body key the endpoint's zod schema does not
 * declare, and zod strips unknown keys SILENTLY, so each one was a no-op that reported
 * success: `x`/`y` instead of `lat`/`lng`, the multipart field `file` instead of `image`, a
 * `--description` no endpoint ever accepted, and — found in production on 2026-08-25 —
 * `entitySlug` instead of `entityId`, which created every CLI pin with `entityId: null` and
 * therefore no entity image, ever.
 *
 * The reason the first three were fixed and the fourth still shipped is that their tests
 * asserted THE BODY THE CLI SENDS. That can never catch this family: a test written from the
 * CLI's own source agrees with the CLI by construction. This suite compares the two sides —
 * the keys `map.js` assigns onto a request body against the keys the endpoint's schema
 * declares — so a key that exists on only one side fails the build.
 *
 * Source-text comparison, deliberately: importing the endpoint would pull Nitro's h3 context
 * into a unit test, and the failure mode being guarded is a NAME mismatch, which is visible
 * in the text. `map-pins.test.ts` already reads `map.js` this way.
 */
describe('map.js <-> endpoint body-key parity', () => {
  /** Strips line and block comments, so an assertion never matches prose ABOUT the code.
   *  Learned the hard way writing this suite: the first draft failed because a comment
   *  naming the offending key counted as a use of it. */
  function code(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  }

  /** Keys a zod object schema declares, read from source — INCLUDING the ones it inherits
   *  from a shared schema via `.extend()`. Missing that was this guard's own first bug:
   *  `lat`/`lng` live in `server/utils/mapGeo.ts`'s `pinCoordinatesSchema`, so parsing only
   *  the endpoint file reported them as undeclared and would have failed a correct CLI. */
  function schemaKeys(relPath: string): Set<string> {
    const src = code(readFileSync(resolve(__dirname, '../../../', relPath), 'utf-8'))
    const keys = new Set<string>()
    const collect = (text: string) => {
      for (const m of text.matchAll(/^\s{2,}(\w+):\s*(?:z\.|\w+Schema\b)/gm)) keys.add(m[1])
    }
    collect(src)
    // follow `<name>Schema.extend(` / `.merge(` into the shared module it was imported from
    for (const m of src.matchAll(/(\w+Schema)\.(?:extend|merge)\(/g)) {
      const imp = src.match(new RegExp(`import \\{[^}]*\\b${m[1]}\\b[^}]*\\} from '([^']+)'`))
      if (!imp) continue
      const rel = imp[1].replace(/^.*?\/(server\/.*)$/, '$1').replace(/^~\//, '')
      for (const cand of [rel, `server/utils/${rel.split('/').pop()}`]) {
        try {
          collect(code(readFileSync(resolve(__dirname, '../../../', `${cand}.ts`), 'utf-8')))
          break
        } catch {
          /* try the next candidate path */
        }
      }
    }
    return keys
  }

  it('pin-add sends only keys the pins POST schema declares', () => {
    const declared = schemaKeys('server/api/campaigns/[id]/maps/[slug]/pins/index.post.ts')
    // Sanity on the PARSER itself: if these three are not found the comparison below is
    // vacuous and would pass no matter what the CLI sends. `lat` proves the `.extend()`
    // base schema was followed; `entityId` proves the inline keys were read.
    expect(declared.has('lat')).toBe(true)
    expect(declared.has('lng')).toBe(true)
    expect(declared.has('entityId')).toBe(true)

    // the body pin-add builds, read from its own action block
    const stripped = code(source)
    const block = stripped.slice(stripped.indexOf("command('pin-add')"))
    const action = block.slice(0, block.indexOf('.command('))
    const sent = new Set([...action.matchAll(/\bbody\.(\w+)\s*=/g)].map((m) => m[1]))
    // the object literal `const body = { label: ..., lat: ..., lng: ... }`
    const literal = action.match(/const body = \{([^}]*)\}/)
    if (literal) {
      for (const m of literal[1].matchAll(/(\w+)\s*:/g)) sent.add(m[1])
    }

    expect(sent.size).toBeGreaterThan(0)
    const undeclared = [...sent].filter((k) => !declared.has(k))
    expect(undeclared).toEqual([])
  })

  it('pin-add resolves --entity to an id and never sends entitySlug', () => {
    // `entitySlug` is the exact key that silently did nothing in production.
    expect(code(source)).not.toContain('body.entitySlug')
    expect(code(source)).toContain('body.entityId = await resolveEntitySlug(')
  })

  it('the pins list renders only fields the GET actually returns', () => {
    // `entitySlug` was printed as the `entity` column and was always blank: the GET returns
    // entityId/entityType/entityImageUrl (server/services/maps.ts), never a slug.
    const stripped = code(source)
    const block = stripped.slice(stripped.indexOf("command('pins')"))
    const action = block.slice(0, block.indexOf('.command('))
    expect(action).not.toContain('entitySlug')
  })

  it('pin-rename sends only keys the PATCH pinUpdateSchema declares', () => {
    // `pinUpdateSchema` lives in `mapGeo.ts` directly (unlike the POST endpoint, the PATCH
    // route file itself declares no inline schema), so it is read directly rather than via
    // an endpoint file's `.extend()` chain.
    const declared = schemaKeys('server/utils/mapGeo.ts')
    expect(declared.has('label')).toBe(true)
    expect(declared.has('lat')).toBe(true)
    expect(declared.has('lng')).toBe(true)

    const stripped = code(source)
    const start = stripped.indexOf("command('pin-rename')")
    const block = stripped.slice(start, stripped.indexOf(".command('pin-delete')"))
    const bodyLiteral = block.match(/patch\(\s*`[^`]+`,\s*\{([^}]*)\}/)
    expect(bodyLiteral).not.toBeNull()
    const sent = new Set([...(bodyLiteral?.[1] ?? '').matchAll(/(\w+)\s*:/g)].map((m) => m[1]))
    expect(sent.size).toBeGreaterThan(0)
    const undeclared = [...sent].filter((k) => !declared.has(k))
    expect(undeclared).toEqual([])
  })
})
