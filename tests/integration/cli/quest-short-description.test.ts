import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { resolve } from 'path'
import { QUEST_SHORT_DESCRIPTION_MAX_LENGTH } from '../../../shared/utils/quest-short-description'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3333'
const CLI = `node ${resolve(process.cwd(), 'cli/bin/aleph.js')}`

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
      env: { ...process.env, ...env },
    })
    return { stdout, stderr: '', code: 0 }
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    return { stdout: err.stdout || '', stderr: err.stderr || '', code: err.status ?? 1 }
  }
}

/**
 * add-quest-short-description §6.3-6.4.
 *
 * Every case READS THE VALUE BACK through the API rather than trusting the CLI's own "Quest
 * updated." line. A command that accepts a flag and silently does nothing is this repo's most
 * repeated defect, and it prints exactly the same success message as one that works.
 */
describe('CLI quest --short-description (integration)', () => {
  const email = `cli-qsd-${Date.now()}@example.com`
  let cookie = ''
  let csrfToken = ''
  let campaignId = ''
  let apiKey = ''
  let cliEnv: Record<string, string>

  beforeAll(async () => {
    await api('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: 'CLI Quest Tester', email, password: 'password123' },
    })
    const login = await api('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password: 'password123' },
    })
    const cookies = login.headers.get('set-cookie') || ''
    const match = cookies.match(/better-auth\.session_token=([^;]+)/)
    const sessionCookie = match ? `better-auth.session_token=${match[1]}` : ''
    const campList = await api('/api/campaigns', { headers: { Cookie: sessionCookie } })
    const setCookie = campList.headers.get('set-cookie') || ''
    const csrfMatch = setCookie.match(/csrf_token=([^;]+)/)
    csrfToken = csrfMatch?.[1] || ''
    cookie = csrfToken ? `${sessionCookie}; csrf_token=${csrfToken}` : sessionCookie

    const camp = await api('/api/campaigns', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: `CLI QSD Test ${Date.now()}` },
    })
    campaignId = (await camp.json()).id

    const keyRes = await api('/api/apikeys', {
      method: 'POST',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: { name: 'cli-qsd-key' },
    })
    apiKey = (await keyRes.json()).key
    // `ALEPH_TOKEN`, not `ALEPH_API_KEY`: `cli/src/lib/config.js` reads
    // `process.env.ALEPH_TOKEN || store.get('apiKey')`. The sibling CLI test in
    // character-family.test.ts sets ALEPH_API_KEY, which the CLI ignores entirely -- it only
    // passes because it never asserts an exit code of 0. Getting this wrong here made all four
    // cases exit 2 with 'Network error', which reads like a broken command and is a missing key.
    cliEnv = { ALEPH_URL: BASE_URL, ALEPH_TOKEN: apiKey }
  })

  async function readQuest(slug: string) {
    const res = await api(`/api/campaigns/${campaignId}/quests/${slug}`, {
      headers: { 'X-API-Key': apiKey },
    })
    return res.json()
  }

  it('sets the short description on create and stores it', async () => {
    const text = 'Symcha Landau reclama juzgar su Avatar.'
    const { stdout, code } = cliExec(
      `quest create --campaign ${campaignId} --name "CLI Juicio" ` +
        `--short-description "${text}" --json`,
      cliEnv,
    )
    expect(code).toBe(0)
    const created = JSON.parse(stdout)
    const fetched = await readQuest(created.slug)
    expect(fetched.shortDescription).toBe(text)
  })

  it('sets it on update, and clearing it leaves the long description alone', async () => {
    const { stdout } = cliExec(
      `quest create --campaign ${campaignId} --name "CLI Guardas" ` +
        `--description "La larga, con **markdown**." --json`,
      cliEnv,
    )
    const { slug } = JSON.parse(stdout)

    expect(
      cliExec(
        `quest update --campaign ${campaignId} --slug ${slug} ` +
          `--short-description "Una amenaza sobre la capilla."`,
        cliEnv,
      ).code,
    ).toBe(0)
    expect((await readQuest(slug)).shortDescription).toBe('Una amenaza sobre la capilla.')

    // The other half: `--short-description ""` must CLEAR it, not be skipped as falsy.
    expect(
      cliExec(`quest update --campaign ${campaignId} --slug ${slug} --short-description ""`, cliEnv)
        .code,
    ).toBe(0)
    const after = await readQuest(slug)
    expect(after.shortDescription).toBeNull()
    expect(after.description).toBe('La larga, con **markdown**.')
  })

  it('shows the short description in quest list', async () => {
    const text = `En el listado ${Date.now()}`
    cliExec(
      `quest create --campaign ${campaignId} --name "CLI Listado" --short-description "${text}"`,
      cliEnv,
    )
    const { stdout, code } = cliExec(`quest list --campaign ${campaignId} --json`, cliEnv)
    expect(code).toBe(0)
    const rows = JSON.parse(stdout) as Array<{ name: string; shortDescription: string | null }>
    expect(rows.find((r) => r.name === 'CLI Listado')?.shortDescription).toBe(text)
  })

  it('fails loudly when the text is over the limit', async () => {
    const { stdout } = cliExec(
      `quest create --campaign ${campaignId} --name "CLI Pasada" --json`,
      cliEnv,
    )
    const { slug } = JSON.parse(stdout)
    const tooLong = 'a'.repeat(QUEST_SHORT_DESCRIPTION_MAX_LENGTH + 1)

    const {
      code,
      stdout: out,
      stderr,
    } = cliExec(
      `quest update --campaign ${campaignId} --slug ${slug} --short-description "${tooLong}"`,
      cliEnv,
    )
    // Non-zero exit AND a visible error: a CLI that swallowed this and printed "Quest updated."
    // would be the silent-acceptance failure this project keeps hitting.
    expect(code).not.toBe(0)
    expect(`${out}${stderr}`).toMatch(/error|invalid|validation/i)
    expect((await readQuest(slug)).shortDescription).toBeNull()
  })
})
