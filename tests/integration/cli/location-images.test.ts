/// <reference types="node" />
/**
 * Location gallery CLI (integration).
 *
 * Requires a dev server on TEST_BASE_URL (default http://localhost:3333) — run it via
 * `npm run test:integration`. Drives the real `aleph` binary, so it exercises the flags, the
 * multipart upload, the printed table and the exit codes, not just the source text.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const CLI = `node ${resolve(process.cwd(), 'cli/bin/aleph.js')}`

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

async function api(path: string, opts?: Omit<RequestInit, 'body'> & { body?: unknown }) {
  return fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL, ...opts?.headers },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })
}

function cliExec(
  args: string,
  env?: Record<string, string>,
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', ...env },
    })
    return { stdout, stderr: '', code: 0 }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return { stdout: err.stdout || '', stderr: err.stderr || '', code: err.status ?? 1 }
  }
}

interface GalleryImage {
  id: string
  url: string
  caption: string | null
  sortOrder: number
  isPrimary: boolean
}

describe('CLI location image commands (integration)', () => {
  const ts = Date.now()
  let campaignId = ''
  let slug = ''
  let cliEnv: Record<string, string>
  let dir = ''
  let pngPath = ''

  function images(): GalleryImage[] {
    const { stdout, code } = cliExec(
      `location images ${slug} --campaign ${campaignId} --json`,
      cliEnv,
    )
    expect(code).toBe(0)
    return JSON.parse(stdout)
  }

  function add(caption?: string): GalleryImage {
    const captionArg = caption ? ` --caption "${caption}"` : ''
    const { stdout, code } = cliExec(
      `location image-add ${slug} --campaign ${campaignId} --file ${pngPath}${captionArg} --json`,
      cliEnv,
    )
    expect(code).toBe(0)
    return JSON.parse(stdout)
  }

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'aleph-cli-images-'))
    pngPath = join(dir, 'harbour.png')
    writeFileSync(pngPath, PNG)

    const email = `cli-images-${ts}@example.com`
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Images Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const sessionMatch = (login.headers.get('set-cookie') || '').match(
      /better-auth\.session_token=([^;]+)/,
    )
    const bare = sessionMatch ? `better-auth.session_token=${sessionMatch[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: bare } })
    const csrfToken =
      (campList.headers.get('set-cookie') || '').match(/csrf_token=([^;]+)/)?.[1] || ''
    const cookie = csrfToken ? `${bare}; csrf_token=${csrfToken}` : bare
    const authed = { Cookie: cookie, 'X-CSRF-Token': csrfToken }

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: authed,
      body: { name: `CLI Images ${ts}` },
    })
    campaignId = (await camp.json()).id

    const keyRes = await api('/api/apikeys', {
      method: 'POST',
      headers: authed,
      body: { name: `cli-images-${ts}` },
    })
    cliEnv = { ALEPH_URL: BASE_URL, ALEPH_TOKEN: (await keyRes.json()).key }

    const loc = await api(`/api/campaigns/${campaignId}/locations`, {
      method: 'POST',
      headers: authed,
      body: { name: `Luskan ${ts}`, subtype: 'city' },
    })
    slug = (await loc.json()).slug
  })

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('images on an empty gallery prints no results and exits 0', () => {
    const { stdout, code } = cliExec(`location images ${slug} --campaign ${campaignId}`, cliEnv)
    expect(code).toBe(0)
    expect(stdout).toContain('no results')
  })

  it('image-add uploads a file and prints the new id and URL', () => {
    const { stdout, code } = cliExec(
      `location image-add ${slug} --campaign ${campaignId} --file ${pngPath} --caption "Harbour at dawn"`,
      cliEnv,
    )
    expect(code).toBe(0)
    expect(stdout).toContain('Image uploaded')
    expect(stdout).toContain(`/locations/${slug}/images/`)
  })

  it('the caption sent with --caption is stored, not dropped', () => {
    const [first] = images()
    expect(first!.caption).toBe('Harbour at dawn')
  })

  it('the first uploaded image is the main one', () => {
    const [first] = images()
    expect(first!.isPrimary).toBe(true)
  })

  it('the table marks the main image with * and shows the caption', () => {
    const { stdout, code } = cliExec(`location images ${slug} --campaign ${campaignId}`, cliEnv)
    expect(code).toBe(0)
    expect(stdout).toContain('Harbour at dawn')
    expect(stdout).toContain('*')
    expect(stdout).toContain('main')
  })

  it('--json prints parseable gallery rows', () => {
    const rows = images()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ isPrimary: true, sortOrder: 0 })
    expect(typeof rows[0]!.id).toBe('string')
  })

  it('a second image-add appends without stealing the main image', () => {
    const second = add()
    expect(second.isPrimary).toBe(false)
    expect(second.sortOrder).toBeGreaterThan(0)
    expect(images().filter((i) => i.isPrimary)).toHaveLength(1)
  })

  it('image-set-primary moves the main image', () => {
    const target = images().find((i) => !i.isPrimary)!
    const { stdout, code } = cliExec(
      `location image-set-primary ${slug} ${target.id} --campaign ${campaignId}`,
      cliEnv,
    )
    expect(code).toBe(0)
    expect(stdout).toContain('now the main image')

    const after = images()
    expect(after.filter((i) => i.isPrimary).map((i) => i.id)).toEqual([target.id])
  })

  it('image-update --caption edits a caption in place', () => {
    const target = images()[0]!
    const { code } = cliExec(
      `location image-update ${slug} ${target.id} --campaign ${campaignId} --caption "The docks"`,
      cliEnv,
    )
    expect(code).toBe(0)
    expect(images().find((i) => i.id === target.id)!.caption).toBe('The docks')
  })

  it('image-update --order reorders the gallery', () => {
    const before = images()
    const first = before[0]!
    const last = before[before.length - 1]!
    expect(first.sortOrder).toBeLessThan(last.sortOrder)

    expect(
      cliExec(
        `location image-update ${slug} ${last.id} --campaign ${campaignId} --order ${first.sortOrder}`,
        cliEnv,
      ).code,
    ).toBe(0)
    expect(
      cliExec(
        `location image-update ${slug} ${first.id} --campaign ${campaignId} --order ${last.sortOrder}`,
        cliEnv,
      ).code,
    ).toBe(0)

    expect(images()[0]!.id).toBe(last.id)
  })

  it('image-update with neither flag fails locally without touching the server', () => {
    const target = images()[0]!
    const { stderr, code } = cliExec(
      `location image-update ${slug} ${target.id} --campaign ${campaignId}`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toContain('--caption and/or --order')
  })

  it('image-remove deletes an image and promotes a survivor to main', () => {
    const primary = images().find((i) => i.isPrimary)!
    const { stdout, code } = cliExec(
      `location image-remove ${slug} ${primary.id} --campaign ${campaignId}`,
      cliEnv,
    )
    expect(code).toBe(0)
    expect(stdout).toContain('deleted from')

    const after = images()
    expect(after.map((i) => i.id)).not.toContain(primary.id)
    expect(after.filter((i) => i.isPrimary)).toHaveLength(1)
  })

  it('an unknown image id exits non-zero with the server message', () => {
    const { stderr, code } = cliExec(
      `location image-remove ${slug} 00000000-0000-0000-0000-000000000000 --campaign ${campaignId}`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toContain('Image not found')
  })

  it('an unknown location exits non-zero rather than printing an empty table', () => {
    const { stderr, code } = cliExec(
      `location images no-such-place --campaign ${campaignId} --json`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toContain('Location not found')
  })

  it('a rejected upload surfaces the server error and exits non-zero', () => {
    const badPath = join(dir, 'fake.png')
    writeFileSync(badPath, 'this is not a png')
    const { stderr, code } = cliExec(
      `location image-add ${slug} --campaign ${campaignId} --file ${badPath}`,
      cliEnv,
    )
    expect(code).not.toBe(0)
    expect(stderr).toMatch(/does not match declared MIME type|Invalid file type/)
  })

  it('emptying the gallery leaves the location with no images', () => {
    for (const image of images()) {
      expect(
        cliExec(`location image-remove ${slug} ${image.id} --campaign ${campaignId}`, cliEnv).code,
      ).toBe(0)
    }
    expect(images()).toEqual([])
  })
})
