/**
 * Unit coverage for `map create`'s OSM support (openspec/changes/add-osm-maps, task 6.1).
 *
 * `map create` gained `--type`, `--address`, `--lat`/`--lng`, `--zoom` once the server side
 * of this change (`maps.type`/`centerLat`/`centerLng`/`defaultZoom` columns, `mapGeoFieldsSchema`,
 * `POST /api/campaigns/[id]/maps/geocode`) existed. This suite pins the request-body wiring
 * without a live server, same shape as `map-pins.test.ts`:
 *  - `--type`/`--zoom` map straight onto `type`/`defaultZoom` in the create body.
 *  - `--address` calls the geocode endpoint FIRST, prints the resolved name + coordinates
 *    (design.md D7 — transparency before the map is created), then sends the first
 *    candidate's lat/lng as `centerLat`/`centerLng` on the create call.
 *  - `--lat`/`--lng` given directly skip the geocode call entirely (mirrors task 3.3's
 *    server-side assertion that direct coordinates never trigger geocoding).
 *  - `--lat` without `--lng` (or vice versa) is rejected locally, before any network call.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

vi.mock('../../../cli/src/lib/config.js', () => ({
  requireConfig: () => ({
    url: process.env.ALEPH_URL,
    apiKey: process.env.ALEPH_TOKEN,
    apiKeyId: null,
  }),
}))

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/map.js'), 'utf-8')

describe('map create: source declares the new OSM-related flags', () => {
  const start = source.indexOf(".command('create')")
  const block = source.slice(start, source.indexOf(".command('update')"))

  it('declares --type, --address, --lat, --lng, --zoom', () => {
    expect(block).toMatch(/option\(\s*'--type <type>'/)
    expect(block).toMatch(/option\(\s*'--address <address>'/)
    expect(block).toMatch(/option\(\s*'--lat <lat>'/)
    expect(block).toMatch(/option\(\s*'--lng <lng>'/)
    expect(block).toMatch(/option\(\s*'--zoom <zoom>'/)
  })

  it('calls the geocode endpoint when --address is used', () => {
    expect(block).toContain('/maps/geocode')
  })
})

describe('map create: request wiring (mocked fetch, no live server)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
  })

  async function runCreate(argv: string[]) {
    vi.resetModules()
    const { post } = await import('../../../cli/src/lib/client.js')
    const calls: { path: string; body: unknown }[] = []
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path: new URL(url).pathname, body })
      if (new URL(url).pathname.endsWith('/geocode')) {
        return new Response(
          JSON.stringify({
            candidates: [{ displayName: 'Berlin, Germany', lat: 52.52, lng: 13.405 }],
          }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ name: 'Test Map', slug: 'test-map' }), {
        status: 200,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { makeMapCommand } = await import('../../../cli/src/commands/map.js')
    const program = makeMapCommand()
    program.exitOverride()
    await program.parseAsync(['create', ...argv], { from: 'user' })
    return { calls, post }
  }

  it('sends type/centerLat/centerLng/defaultZoom for direct --lat/--lng, and never geocodes', async () => {
    const { calls } = await runCreate([
      '--campaign',
      'c1',
      '--name',
      'Berlin',
      '--type',
      'osm',
      '--lat',
      '52.52',
      '--lng',
      '13.405',
      '--zoom',
      '12',
    ])
    expect(calls).toHaveLength(1)
    expect(calls[0]!.path).toBe('/api/campaigns/c1/maps')
    expect(calls[0]!.body).toEqual({
      name: 'Berlin',
      type: 'osm',
      defaultZoom: 12,
      centerLat: 52.52,
      centerLng: 13.405,
    })
  })

  it('--address geocodes first, then creates with the resolved coordinates', async () => {
    const logSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const { calls } = await runCreate([
      '--campaign',
      'c1',
      '--name',
      'Berlin',
      '--type',
      'osm',
      '--address',
      'Berlin, Germany',
      '--zoom',
      '12',
    ])
    expect(calls).toHaveLength(2)
    expect(calls[0]!.path).toBe('/api/campaigns/c1/maps/geocode')
    expect(calls[0]!.body).toEqual({ query: 'Berlin, Germany' })
    expect(calls[1]!.path).toBe('/api/campaigns/c1/maps')
    expect(calls[1]!.body).toEqual({
      name: 'Berlin',
      type: 'osm',
      defaultZoom: 12,
      centerLat: 52.52,
      centerLng: 13.405,
    })
    const printed = logSpy.mock.calls.map((c) => c[0]).join('')
    expect(printed).toContain('Berlin, Germany')
    expect(printed).toContain('52.52')
    expect(printed).toContain('13.405')
    logSpy.mockRestore()
  })

  it('rejects --lat without --lng before making any network call', async () => {
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
    await expect(
      runCreate(['--campaign', 'c1', '--name', 'Berlin', '--lat', '52.52']),
    ).rejects.toThrow('exit:2')
    expect(errSpy.mock.calls.join('')).toContain('--lat and --lng must be given together')
    errSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
