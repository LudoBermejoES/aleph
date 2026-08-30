/**
 * Unit coverage for `aleph session xp` (openspec/changes/add-per-character-session-xp, task 4).
 *
 * Every assertion below is written from the spec's REQUIREMENT text, not from what the
 * implementation happens to do — this repo's single most repeated defect is a test that pins the
 * bug. The load-bearing one is the read-modify-write group: `PUT .../xp` REPLACES the session's
 * whole award list (design decision 5), so a `--character X --xp N` call that sent only `X` would
 * silently delete every other character's award. That failure is invisible to a source-string
 * assertion and to a test that only checks "a request was sent", which is why these tests run the
 * real commander action against a mocked fetch and read the body that would have gone out.
 *
 * The replaced command, `session attendance xp`, is asserted GONE — its endpoint
 * (`PATCH .../attendance/:userId`) no longer exists server-side, so leaving it would be a command
 * that always fails.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Same rationale as tests/unit/cli/map-create.test.ts: avoid pulling in `conf` (a
// `cli/package.json` dependency, not the root's) so this suite runs in the unit job.
vi.mock('../../../cli/src/lib/config.js', () => ({
  requireConfig: () => ({
    url: process.env.ALEPH_URL,
    apiKey: process.env.ALEPH_TOKEN,
    apiKeyId: null,
  }),
}))

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/session.js'), 'utf-8')

interface Call {
  method: string
  path: string
  body: unknown
}

/** The character rows the fake server knows about, keyed by slug. */
const CHARACTERS: Record<string, { id: string; entityId: string; name: string; slug: string }> = {
  otto: { id: 'char-otto', entityId: 'ent-otto', name: 'Otto', slug: 'otto' },
  julia: { id: 'char-julia', entityId: 'ent-julia', name: 'Julia', slug: 'julia' },
}

/**
 * Run `session xp …` against a fake server.
 *
 * `xpAwards` is the state the session GET reports, in the exact shape the real endpoint returns
 * (`{ characterId, characterName, characterSlug, xp }`) — including the two display fields the
 * `PUT`'s `strictObject` schema would reject if the CLI echoed them back.
 */
async function runXp(
  argv: string[],
  xpAwards: {
    characterId: string
    characterName: string
    characterSlug: string
    xp: number
  }[] = [],
) {
  vi.resetModules()
  const calls: Call[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(init.body as string) : undefined
    calls.push({ method, path, body })

    const character = Object.values(CHARACTERS).find((c) => path.endsWith(`/characters/${c.slug}`))
    if (character) return new Response(JSON.stringify(character), { status: 200 })
    if (method === 'GET' && /\/sessions\/[^/]+$/.test(path)) {
      return new Response(JSON.stringify({ slug: 'sesion-1', attendance: [], xpAwards }), {
        status: 200,
      })
    }
    if (method === 'PUT' && path.endsWith('/xp')) {
      return new Response(JSON.stringify({ success: true, xpAwards }), { status: 200 })
    }
    if (method === 'DELETE') return new Response(null, { status: 204 })
    return new Response(JSON.stringify({ message: `unexpected ${method} ${path}` }), {
      status: 500,
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  const { makeSessionCommand } = await import('../../../cli/src/commands/session.js')
  const program = makeSessionCommand()
  program.exitOverride()
  await program.parseAsync(['xp', ...argv], { from: 'user' })
  return { calls, fetchMock }
}

const AWARD_JULIA = {
  characterId: 'char-julia',
  characterName: 'Julia',
  characterSlug: 'julia',
  xp: 2,
}
const AWARD_OTTO = { characterId: 'char-otto', characterName: 'Otto', characterSlug: 'otto', xp: 5 }

describe('session xp: single-character writes are read-modify-write', () => {
  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Spec: "awarding one character leaves the others alone" — GIVEN a session recording 2 XP for
  // julia, WHEN `--character otto --xp 3`, THEN otto has 3 AND julia STILL has 2.
  it('preserves an award the command line never mentions', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'otto', '--xp', '3'],
      [AWARD_JULIA],
    )
    const put = calls.find((c) => c.method === 'PUT')!
    expect(put.path).toBe('/api/campaigns/c1/sessions/sesion-1/xp')
    const awards = (put.body as { awards: { characterId: string; xp: number }[] }).awards
    expect(awards).toEqual(
      expect.arrayContaining([
        { characterId: 'char-otto', xp: 3 },
        { characterId: 'char-julia', xp: 2 },
      ]),
    )
    expect(awards).toHaveLength(2)
  })

  it('reads the session before writing it, so the list it sends is the current one', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'otto', '--xp', '3'],
      [AWARD_JULIA],
    )
    const sessionGet = calls.findIndex(
      (c) => c.method === 'GET' && c.path === '/api/campaigns/c1/sessions/sesion-1',
    )
    const put = calls.findIndex((c) => c.method === 'PUT')
    expect(sessionGet).toBeGreaterThan(-1)
    expect(put).toBeGreaterThan(sessionGet)
  })

  // The unique index is on (session, character): a second award for the same character would be
  // a 422 (duplicate) rather than an update, so re-awarding must replace in place.
  it('replaces an existing award in place instead of appending a duplicate', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'otto', '--xp', '7'],
      [AWARD_OTTO, AWARD_JULIA],
    )
    const awards = (calls.find((c) => c.method === 'PUT')!.body as { awards: unknown[] }).awards
    expect(awards).toEqual(
      expect.arrayContaining([
        { characterId: 'char-otto', xp: 7 },
        { characterId: 'char-julia', xp: 2 },
      ]),
    )
    expect(awards).toHaveLength(2)
  })

  // The endpoint's zod schema is a `strictObject`, so an unknown key is a 422 rather than a
  // silently discarded field. Echoing the GET's display fields back would break every write.
  it('sends only characterId and xp per award, never the display fields the GET adds', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'otto', '--xp', '3'],
      [AWARD_JULIA],
    )
    const put = calls.find((c) => c.method === 'PUT')!
    expect(Object.keys(put.body as object)).toEqual(['awards'])
    for (const award of (put.body as { awards: object[] }).awards) {
      expect(Object.keys(award).sort()).toEqual(['characterId', 'xp'])
    }
  })

  // The award references `characters.id`. `resolveEntitySlug` answers the ENTITY id — a
  // different column — so the fixture gives the two characters different ids on purpose.
  it('resolves --character through the characters endpoint and sends the character id', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'otto', '--xp', '3'],
      [],
    )
    expect(calls.some((c) => c.path === '/api/campaigns/c1/characters/otto')).toBe(true)
    const awards = (calls.find((c) => c.method === 'PUT')!.body as { awards: unknown[] }).awards
    expect(awards).toEqual([{ characterId: 'char-otto', xp: 3 }])
    expect(JSON.stringify(awards)).not.toContain('ent-otto')
  })

  // Spec: "an award of zero is recorded and is not the same as no award". `--xp 0` is falsy, so
  // any truthiness test in the flag handling would drop it.
  it('records --xp 0 as a real award', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'otto', '--xp', '0'],
      [],
    )
    const awards = (calls.find((c) => c.method === 'PUT')!.body as { awards: unknown[] }).awards
    expect(awards).toEqual([{ characterId: 'char-otto', xp: 0 }])
  })
})

describe('session xp: --clear removes one award and only that one', () => {
  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('DELETEs the per-character route and never sends a whole-list PUT', async () => {
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--character', 'julia', '--clear'],
      [AWARD_OTTO, AWARD_JULIA],
    )
    const del = calls.find((c) => c.method === 'DELETE')!
    expect(del.path).toBe('/api/campaigns/c1/sessions/sesion-1/xp/char-julia')
    // A `PUT` restating "everything except julia" would work too, but it would race any award
    // written between the read and the write. The endpoint exists precisely to avoid that.
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })
})

describe('session xp: --list prints the session awards', () => {
  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // Spec: "listing a session's awards" — GIVEN two characters recorded, THEN both characters and
  // their values are printed.
  it('prints both characters and their values, and writes nothing', async () => {
    const lines: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.map(String).join(' '))
    })
    const { calls } = await runXp(
      ['sesion-1', '--campaign', 'c1', '--list'],
      [AWARD_OTTO, AWARD_JULIA],
    )
    const printed = lines.join('\n')
    expect(printed).toContain('Otto')
    expect(printed).toContain('5')
    expect(printed).toContain('Julia')
    expect(printed).toContain('2')
    expect(calls.every((c) => c.method === 'GET')).toBe(true)
  })

  it('--list --json emits the raw award objects', async () => {
    const out: string[] = []
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string) => {
      out.push(String(chunk))
      return true
    }) as never)
    await runXp(['sesion-1', '--campaign', 'c1', '--list', '--json'], [AWARD_OTTO])
    expect(JSON.parse(out.join(''))).toEqual([AWARD_OTTO])
  })
})

describe('session xp: a call with no action is refused before any request', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>
  let stderr: string[]

  beforeEach(() => {
    process.env.ALEPH_URL = 'http://localhost:9999'
    process.env.ALEPH_TOKEN = 'aleph_test_key'
    stderr = []
    vi.spyOn(process.stderr, 'write').mockImplementation(((chunk: string) => {
      stderr.push(String(chunk))
      return true
    }) as never)
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`)
    }) as never)
  })

  afterEach(() => {
    delete process.env.ALEPH_URL
    delete process.env.ALEPH_TOKEN
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  async function expectRefused(argv: string[]) {
    await expect(runXp(argv)).rejects.toThrow(/^exit:[12]$/)
    // Nothing was sent: every guard runs before the first await, so the mocked fetch installed
    // by `runXp` was never reached. This is the assertion task 4.3 actually asks for — an exit
    // code alone would still pass if the CLI had already written to the server.
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    expect(fetchMock.mock.calls).toHaveLength(0)
    return stderr.join('')
  }

  // Spec: "a call with no action is refused" — THEN the CLI exits non-zero with a message naming
  // `--xp` or `--clear`, AND no request is sent.
  it('--character with neither --xp nor --clear names both flags and sends nothing', async () => {
    const message = await expectRefused(['sesion-1', '--campaign', 'c1', '--character', 'otto'])
    expect(message).toContain('--xp')
    expect(message).toContain('--clear')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('--xp and --clear together are refused as mutually exclusive', async () => {
    const message = await expectRefused([
      'sesion-1',
      '--campaign',
      'c1',
      '--character',
      'otto',
      '--xp',
      '3',
      '--clear',
    ])
    expect(message).toContain('mutually exclusive')
  })

  it('--xp without --character is refused, rather than guessing a character', async () => {
    const message = await expectRefused(['sesion-1', '--campaign', 'c1', '--xp', '3'])
    expect(message).toContain('--character')
  })

  it('no flags at all is refused, rather than accepted and doing nothing', async () => {
    const message = await expectRefused(['sesion-1', '--campaign', 'c1'])
    expect(message).toContain('--list')
  })

  it('--list combined with a write flag is refused, rather than silently ignoring one', async () => {
    const message = await expectRefused([
      'sesion-1',
      '--campaign',
      'c1',
      '--list',
      '--character',
      'otto',
      '--xp',
      '3',
    ])
    expect(message).toContain('--list')
  })

  it('a non-integer or negative --xp is refused locally, before the server sees it', async () => {
    for (const bad of ['-1', '1.5', 'lots', '']) {
      stderr = []
      const message = await expectRefused([
        'sesion-1',
        '--campaign',
        'c1',
        '--character',
        'otto',
        '--xp',
        bad,
      ])
      expect(message).toContain('whole number')
    }
  })
})

describe('session attendance xp is gone', () => {
  // The route behind it (`PATCH .../attendance/:userId`) was deleted with `session_attendance.xp`,
  // so keeping the command would leave one that can only ever fail.
  it('the attendance subcommand no longer declares an xp command', async () => {
    vi.resetModules()
    const { makeSessionCommand } = await import('../../../cli/src/commands/session.js')
    const attendance = makeSessionCommand().commands.find((c) => c.name() === 'attendance')!
    expect(attendance).toBeDefined()
    expect(attendance.commands.map((c) => c.name())).not.toContain('xp')
  })

  it('nothing in session.js still PATCHes the per-user attendance route', () => {
    expect(source).not.toContain('/attendance/${opts.user}`, {')
    expect(source).not.toMatch(/patch\([^)]*attendance\/\$\{opts\.user\}/)
  })

  it('the xp command lives on `session`, not on `session attendance`', async () => {
    vi.resetModules()
    const { makeSessionCommand } = await import('../../../cli/src/commands/session.js')
    expect(makeSessionCommand().commands.map((c) => c.name())).toContain('xp')
  })
})
