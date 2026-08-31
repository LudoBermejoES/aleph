/**
 * Unit coverage for `aleph map list`.
 *
 * This command handed the PAGINATED ENVELOPE (`{ data, meta }`, what every list endpoint in this
 * app answers) straight to `.map()`. The human output therefore died with
 * `TypeError: data.map is not a function`, while `--json` kept "working" because that path prints
 * the raw response untouched.
 *
 * What made it expensive is the asymmetry. A crash is at least honest; the JSON path looked
 * healthy and answered an envelope whose `data` key nothing was reading, so a caller parsing it
 * concluded **"this campaign has no maps"** about a campaign holding a map with 28 pins. That
 * wrong conclusion was drawn twice in one session and repeated to the user as a defect in a
 * different command.
 *
 * These tests are written from the rule — *a list command prints the rows the server returned* —
 * and not from the implementation. The mocked server answers the real envelope shape, because a
 * fixture that returned a bare array could not fail either version of this command.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Same rationale as tests/unit/cli/map-create.test.ts: avoid pulling in `conf` (a
// `cli/package.json` dependency, not the root's) so this suite runs in the unit job.
vi.mock('../../../cli/src/lib/config.js', () => ({
  requireConfig: () => ({
    url: process.env.ALEPH_URL,
    apiKey: process.env.ALEPH_TOKEN,
    apiKeyId: null,
  }),
}))

const MAPS = [
  {
    id: 'map-1',
    name: 'Berlin en tinieblas',
    slug: 'berlin',
    type: 'osm',
    width: null,
    height: null,
  },
  { id: 'map-2', name: 'La capilla', slug: 'capilla', type: 'image', width: 2048, height: 1536 },
]

/** Run `map list …` against a fake server answering the real `{ data, meta }` envelope. */
async function runList(argv: string[], body: unknown = { data: MAPS, meta: PAGE_META }) {
  vi.resetModules()
  const calls: { method: string; path: string; search: string }[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const parsed = new URL(url)
    calls.push({
      method: init?.method ?? 'GET',
      path: parsed.pathname,
      search: parsed.searchParams.toString(),
    })
    return new Response(JSON.stringify(body), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)

  // `print()` splits its two paths across two sinks: the table goes to `console.log`, but
  // `--json` goes to `process.stdout.write` (cli/src/lib/output.js:10). Spying on the console
  // alone captures an EMPTY string for the JSON path — which reads exactly like "the command
  // printed nothing" and would have let a broken `--json` pass. Both sinks are captured.
  const out: string[] = []
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...a) => void out.push(a.join(' ')))
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => void out.push(a.join(' ')))
  const writeSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => (out.push(String(chunk)), true))

  const { makeMapCommand } = await import('../../../cli/src/commands/map.js')
  const program = makeMapCommand()
  program.exitOverride()
  await program.parseAsync(['list', ...argv], { from: 'user' })

  logSpy.mockRestore()
  errSpy.mockRestore()
  writeSpy.mockRestore()
  return { calls, output: out.join('\n') }
}

const PAGE_META = { page: 1, pageSize: 50, total: 2, totalPages: 1 }

describe('aleph map list', () => {
  beforeEach(() => {
    process.env.ALEPH_URL = 'https://example.test'
    process.env.ALEPH_TOKEN = 'k'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('prints the maps the server returned instead of throwing on the envelope', async () => {
    const { output } = await runList(['--campaign', 'c1'])
    expect(output).toContain('Berlin en tinieblas')
    expect(output).toContain('berlin')
    expect(output).toContain('La capilla')
  })

  it('reports the page footer, so a truncated page is never mistaken for the whole list', async () => {
    const { output } = await runList(['--campaign', 'c1'], {
      data: MAPS,
      meta: { page: 1, pageSize: 50, total: 98, totalPages: 2 },
    })
    expect(output).toContain('98')
    expect(output).toMatch(/1\/2/)
  })

  it('still accepts a bare array, which is what a non-paginated endpoint would answer', async () => {
    const { output } = await runList(['--campaign', 'c1'], MAPS)
    expect(output).toContain('Berlin en tinieblas')
  })

  it('--json prints the whole response, envelope included', async () => {
    const { output } = await runList(['--campaign', 'c1', '--json'])
    const parsed = JSON.parse(output)
    expect(parsed.data).toHaveLength(2)
    expect(parsed.meta).toEqual(PAGE_META)
  })

  it('sends page and pageSize, so the default is a stated page and not a silent server default', async () => {
    const { calls } = await runList(['--campaign', 'c1'])
    expect(calls).toHaveLength(1)
    expect(calls[0]!.path).toBe('/api/campaigns/c1/maps')
    const search = new URLSearchParams(calls[0]!.search)
    expect(search.get('page')).toBe('1')
    expect(search.get('pageSize')).toBe('50')
  })

  it('an empty campaign prints no map rows — the one case where "no maps" is the truth', async () => {
    const { output } = await runList(['--campaign', 'c1'], {
      data: [],
      meta: { page: 1, pageSize: 50, total: 0, totalPages: 0 },
    })
    expect(output).not.toContain('berlin')
  })
})
