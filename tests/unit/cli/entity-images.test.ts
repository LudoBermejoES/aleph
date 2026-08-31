/**
 * Unit coverage for the generic entity gallery CLI — `aleph entity images | image-add |
 * image-update | image-set-primary | image-remove`.
 *
 * `postMultipart()` itself is already covered by `tests/unit/cli/location-images.test.ts`; what is
 * new here is the WIRING: five commands, five routes, one each. A wrong verb or a missing path
 * segment is the failure this catches before it reaches a server, and it is the exact shape the
 * spec's "the command surface matches the HTTP surface" scenario asks for.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const source = readFileSync(resolve(__dirname, '../../../cli/src/commands/entity.js'), 'utf-8')

const IMAGE_COMMANDS = [
  'images <slug>',
  'image-add <slug>',
  'image-update <slug> <imageId>',
  'image-set-primary <slug> <imageId>',
  'image-remove <slug> <imageId>',
]

describe('entity image command wiring', () => {
  it.each(IMAGE_COMMANDS)('registers `entity %s`', (name) => {
    expect(source).toContain(`.command('${name}')`)
  })

  it('lists and uploads against the gallery collection URL', () => {
    expect(source).toContain('entities/${slug}/images`)')
    expect(source).toContain('postMultipart(')
  })

  it('addresses a single image by id for update, set-primary and remove', () => {
    const perImage = source.match(/entities\/\$\{slug\}\/images\/\$\{imageId\}/g) ?? []
    expect(perImage.length).toBeGreaterThanOrEqual(3)
  })

  it('uses PATCH for metadata and DELETE for removal, never PUT', () => {
    expect(source).toContain('patch(`/api/campaigns/${opts.campaign}/entities/${slug}/images/')
    expect(source).toContain('del(`/api/campaigns/${opts.campaign}/entities/${slug}/images/')
    expect(source).not.toMatch(
      /put\(`\/api\/campaigns\/\$\{opts\.campaign\}\/entities\/\$\{slug\}\/images/,
    )
  })

  it('imports the patch helper it uses', () => {
    // `patch` is new to this command file; without the import the command throws at call time,
    // which no source-string assertion elsewhere would notice.
    expect(source).toMatch(/^import \{[^}]*\bpatch\b[^}]*\} from '\.\.\/lib\/client\.js'/m)
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
    for (const name of IMAGE_COMMANDS) {
      const start = source.indexOf(`.command('${name}')`)
      const block = source.slice(start, start + 700)
      expect(block, name).toContain("requiredOption('--campaign <id>'")
    }
  })

  it('image-add requires --file, offers --caption and refuses a missing file locally', () => {
    const start = source.indexOf(".command('image-add")
    const block = source.slice(start, start + 1200)
    expect(block).toContain("requiredOption('--file <path>'")
    expect(block).toContain("option('--caption <text>'")
    // A path that does not exist must fail before any request is sent.
    expect(block).toContain('existsSync(opts.file)')
  })

  it('the list marks the main image instead of printing a raw boolean', () => {
    const start = source.indexOf(".command('images <slug>')")
    const block = source.slice(start, source.indexOf(".command('image-add"))
    expect(block).toContain("i.isPrimary ? '*' : ''")
  })

  it('keeps the older single-image command, which the gallery does not replace', () => {
    expect(source).toContain(".command('upload-image')")
  })
})

describe('endpoint parity: every new gallery route has exactly one command', () => {
  const routeDir = resolve(__dirname, '../../../server/api/campaigns/[id]/entities/[slug]/images')

  it('the route directory holds exactly the five files the five commands drive', () => {
    expect(readdirSync(routeDir).sort()).toEqual([
      '[imageId].delete.ts',
      '[imageId].get.ts',
      '[imageId].patch.ts',
      'index.get.ts',
      'index.post.ts',
    ])
  })

  it.each([
    ['index.get.ts', 'get(`/api/campaigns/${opts.campaign}/entities/${slug}/images`)'],
    ['index.post.ts', 'postMultipart('],
    ['[imageId].patch.ts', 'patch(`/api/campaigns/${opts.campaign}/entities/${slug}/images/'],
    ['[imageId].delete.ts', 'del(`/api/campaigns/${opts.campaign}/entities/${slug}/images/'],
  ])('the %s route is driven from the CLI', (_route, callSite) => {
    expect(source).toContain(callSite)
  })

  it('`[imageId].get.ts` serves bytes for a browser and is deliberately CLI-less', () => {
    // The five commands cover four routes; the byte-serving GET is what an <img src> hits, and
    // the character/location/organization galleries have no command for it either. Stating it
    // here keeps the parity claim honest instead of silently counting to five.
    const perImageGet = source.match(
      /get\(`\/api\/campaigns\/\$\{opts\.campaign\}\/entities\/\$\{slug\}\/images\/\$\{imageId\}`\)/g,
    )
    expect(perImageGet).toBeNull()
  })

  it('no command names an entity image route that does not exist', () => {
    const urls =
      source.match(/\/api\/campaigns\/\$\{opts\.campaign\}\/entities\/\$\{slug\}\/images[^`]*/g) ??
      []
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      const tail = url.replace('/api/campaigns/${opts.campaign}/entities/${slug}/images', '')
      expect(['', '/${imageId}'], url).toContain(tail)
    }
  })
})
