/**
 * Source guards for the per-shape diagram image (add-per-shape-diagram-image).
 *
 * These cover the four properties that a behavioural unit test cannot reach,
 * each of which is a measured trap rather than a style preference:
 *
 *   1. `imageOverrideId` is an OPTIONAL shape prop. A required one rejects every
 *      snapshot saved before this feature and the diagram stops opening.
 *   2. `aleph:entity-preview` carries the SHAPE id. The detail used to carry only
 *      the entity, and one entity can be placed on a canvas many times, so the
 *      picker could not say WHICH card it was addressing.
 *   3. Hydration never writes the primary straight into an image prop again. That
 *      single line is the whole defect this change exists to fix: a picker without
 *      it appears to work and is reverted on the next load.
 *   4. The popover does not reach into the tldraw editor. The page owns the handle
 *      and every other shape write goes through it (design D4).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { SHAPE_IMAGE_PROP_KEY } from '../../../app/utils/diagram-shapes'

const root = resolve(__dirname, '../../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8')

/** The shapes that render an ENTITY image, i.e. the ones an override applies to. */
const IMAGE_SHAPES = {
  'NPCTokenShape.tsx': 'portraitUrl',
  'EntityCardShape.tsx': 'portraitUrl',
  'LocationPinShape.tsx': 'locationImageUrl',
  'FactionCardShape.tsx': 'crestUrl',
} as const

/** Every shape that dispatches the preview event, image-bearing or not. */
const PREVIEW_SHAPES = [...Object.keys(IMAGE_SHAPES), 'QuestNodeShape.tsx']

const shapeSrc = (f: string) => read(`app/components/diagrams/react/shapes/${f}`)
const hydration = read('app/utils/diagram-hydration.ts')
const popover = read('app/components/diagrams/EntityPopover.vue')
const page = read('app/pages/campaigns/[id]/diagrams/[diagramId].vue')

describe('imageOverrideId is declared on every image-bearing shape, optionally', () => {
  for (const [file, imageProp] of Object.entries(IMAGE_SHAPES)) {
    const src = shapeSrc(file)

    it(`${file} declares it in the TLBaseShape type next to ${imageProp}`, () => {
      expect(src).toContain('imageOverrideId?: string')
    })

    it(`${file} validates it as OPTIONAL, never as a required string`, () => {
      expect(src).toContain('imageOverrideId: T.optional(T.string)')
      // The trap, spelled out: `imageOverrideId: T.string` would make tldraw
      // reject every snapshot that predates this feature.
      expect(src).not.toMatch(/imageOverrideId:\s*T\.string\b/)
    })

    it(`${file} gives it a default, so a fresh shape carries the prop`, () => {
      expect(src).toMatch(/imageOverrideId:\s*undefined/)
    })
  }
})

describe('the preview event names the shape it came from', () => {
  for (const file of PREVIEW_SHAPES) {
    it(`${file} puts shapeId in the aleph:entity-preview detail`, () => {
      const src = shapeSrc(file)
      expect(src).toContain("'aleph:entity-preview'")
      expect(src).toContain('shapeId: shape.id')
    })
  }

  it('the diagram page reads shapeId out of the detail and passes it down', () => {
    expect(page).toMatch(/shapeId\?:\s*string/)
    expect(page).toContain('detail.shapeId')
    expect(page).toContain(':shape-id="popoverShapeId"')
  })
})

describe('hydration resolves the override instead of overwriting it', () => {
  it('routes every image prop through resolveShapeImageUrl', () => {
    expect(hydration).toContain('resolveShapeImageUrl(data, imageOverrideId)')
  })

  it('reads the override off the shape it is hydrating', () => {
    expect(hydration).toContain('shape.props?.imageOverrideId')
  })

  it('never assigns the primary straight into an image prop', () => {
    // This is the original bug, exactly: `portraitUrl: data.portraitUrl ?? undefined`
    // inside a per-type branch, which reverted any choice on every load.
    const offenders = hydration
      .split('\n')
      .filter((l) => /(portraitUrl|locationImageUrl|crestUrl)\s*:\s*data\.portraitUrl/.test(l))
    expect(offenders).toEqual([])
  })

  it('sets the faction crest, which it never used to touch (design D7)', () => {
    expect(hydration).toContain('getShapeImagePropKey(shapeType)')
    expect(SHAPE_IMAGE_PROP_KEY.factionCard).toBe('crestUrl')
  })
})

describe('the picker offers itself only when there is a choice to make', () => {
  it('is gated on the explicit flag, the shape id AND more than one image', () => {
    const gate = popover.split('\n').find((l) => l.includes('galleryImages.value.length'))
    expect(gate).toBeDefined()
    expect(gate).toContain('props.canPickImage')
    expect(gate).toContain('props.shapeId')
    expect(gate).toContain('> 1')
  })

  it('the page never offers it in read-only mode', () => {
    const idx = page.indexOf('popoverCanPickImage = computed')
    expect(idx).toBeGreaterThan(-1)
    const decl = page.slice(idx, idx + 260)
    expect(decl).toContain('!readOnly.value')
    expect(decl).toContain('supportsImageOverride')
  })

  it('the write handler refuses to run read-only', () => {
    const idx = page.indexOf('function onPopoverSelectImage')
    expect(idx).toBeGreaterThan(-1)
    expect(page.slice(idx, idx + 400)).toContain('if (readOnly.value')
  })
})

describe('the picker marks what the card SHOWS, not the override', () => {
  it('never compares a thumbnail against currentImageId directly', () => {
    // That comparison IS the defect: `currentImageId` is the shape's override and is
    // null until somebody picks something, so a card in its initial state had two
    // options and zero marked. Measured in the browser before the fix.
    const offenders = popover.split('\n').filter((l) => /image\.id\s*===\s*currentImageId/.test(l))
    expect(offenders).toEqual([])
  })

  it('marks on the resolved shown id, in the class, the aria state and the test hook', () => {
    for (const shape of [
      'image.id === shownImageId\n',
      ':aria-pressed="image.id === shownImageId"',
      ":data-selected=\"image.id === shownImageId ? 'true' : 'false'\"",
    ]) {
      expect(popover).toContain(shape.replace(/\n$/, ''))
    }
  })

  it('resolves the mark with the shared rule rather than a second copy of it', () => {
    expect(popover).toContain('resolveShownImageId(')
    expect(popover).toContain("from '~/utils/diagram-hydration'")
  })

  it('refuses to write when the click lands on what is already shown', () => {
    const idx = popover.indexOf('function chooseImage')
    expect(idx).toBeGreaterThan(-1)
    const body = popover.slice(idx, idx + 900)
    expect(body).toContain('imageId === shownImageId.value')
    expect(body).toContain("emit('selectImage'")
  })
})

describe('the popover does not own the editor (design D4)', () => {
  it('emits the choice instead of writing the shape itself', () => {
    expect(popover).toContain("emit('selectImage'")
    expect(popover).not.toContain('updateShapes')
    expect(popover).not.toMatch(/\beditorInstance\b/)
  })

  it('the page is what calls updateShapes for the picked image', () => {
    const idx = page.indexOf('function onPopoverSelectImage')
    expect(page.slice(idx, idx + 900)).toContain('updateShapes')
  })
})
