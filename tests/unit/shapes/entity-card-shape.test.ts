/**
 * Guard for the reported defect: an `entityCard` (the fallback shape for any entity type
 * with no dedicated card -- Item, Session, Lore, Arc, and any future campaign-defined type)
 * rendered as a mostly-empty white box with a tiny fixed-size thumbnail beside the title,
 * while every OTHER card shape (locationPin, factionCard, npcToken) renders a full-bleed
 * image with a name bar underneath. `el-traje-de-oro` (an Item) is exactly this case.
 *
 * Written from the RULE the other card shapes already establish, not from the broken
 * markup: a card-style shape must (1) stack its image above its name (column layout, not
 * a row with the image beside the text), and (2) let the image fill its whole allotted
 * area (100% x 100%) rather than a small fixed pixel square that leaves the rest of the
 * card blank.
 *
 * Rendered via `react-dom/server` against the REAL `EntityCardShapeUtil.component`, wrapped
 * in tldraw's own `EditorContext` -- `useImageAspectFit` calls `useEditor()` unconditionally
 * on every render, which throws outside that provider regardless of whether an image is
 * present, so a fake editor object is supplied (its methods are never invoked by a static
 * render; `onLoad` never fires without a real browser painting the `<img>`).
 */
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { EditorContext } from '@tldraw/editor'
import {
  EntityCardShapeUtil,
  type EntityCardShape,
} from '../../../app/components/diagrams/react/shapes/EntityCardShape'

const fakeEditor = { updateShape: () => {} } as unknown as Parameters<
  typeof EditorContext.Provider
>[0]['value']

function renderCard(props: Partial<EntityCardShape['props']> = {}) {
  const shape = {
    id: 'shape:test',
    props: {
      w: 140,
      h: 160,
      entityId: 'e1',
      campaignId: 'c1',
      entityName: 'El Traje de Oro',
      entityType: 'item',
      slug: 'el-traje-de-oro',
      portraitUrl: undefined,
      imageOverrideId: undefined,
      aspectRatio: undefined,
      ...props,
    },
  } as unknown as EntityCardShape

  // `component` is an instance method that never touches `this`, so it can be
  // called off the prototype directly, same as the pre-existing
  // image-override-props.test.ts pattern for `getDefaultProps`.
  const element = (
    EntityCardShapeUtil.prototype.component as (s: EntityCardShape) => React.ReactElement
  ).call({}, shape)
  const wrapped = React.createElement(EditorContext.Provider, { value: fakeEditor }, element)
  const html = renderToStaticMarkup(wrapped)
  const dom = new JSDOM(html)
  return dom.window.document
}

/**
 * `HTMLContainer` (tldraw's own wrapper) renders a `<link rel="preload">` sibling plus a
 * `.tl-html-container` element ahead of the shape's own markup -- `doc.body.firstElementChild`
 * lands on that `<link>`, not on the card, and every assertion below silently reads `undefined`.
 * Verified against the real rendered output before writing the assertions.
 */
function cardRoot(doc: Document): HTMLElement {
  const container = doc.querySelector('.tl-html-container') as HTMLElement
  expect(container).not.toBeNull()
  return container.firstElementChild as HTMLElement
}

describe('EntityCardShapeUtil rendering', () => {
  it('stacks the image above the name (column layout), not beside it', () => {
    const doc = renderCard({ portraitUrl: '/img/el-traje-de-oro.webp' })
    const outer = cardRoot(doc)
    expect(outer.style.flexDirection).toBe('column')
  })

  it('renders the image full-bleed (100% x 100%), never a small fixed square', () => {
    const doc = renderCard({ portraitUrl: '/img/el-traje-de-oro.webp' })
    const img = doc.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('/img/el-traje-de-oro.webp')
    expect(img!.style.width).toBe('100%')
    expect(img!.style.height).toBe('100%')
  })

  it('places the name in a block that follows the image area, not inline with it', () => {
    const doc = renderCard({ portraitUrl: '/img/el-traje-de-oro.webp' })
    const outer = cardRoot(doc)
    const [imageArea, labelBar] = Array.from(outer.children) as HTMLElement[]
    expect(imageArea.querySelector('img')).not.toBeNull()
    expect(labelBar.textContent).toContain('El Traje de Oro')
    // The label bar must be a SIBLING after the image area, never its parent or child --
    // that adjacency is what "beside the image" vs "under the image" comes down to in a
    // flex column.
    expect(imageArea.nextElementSibling).toBe(labelBar)
  })

  it('shows a placeholder (not a broken layout) when there is no image yet', () => {
    const doc = renderCard({ portraitUrl: undefined })
    expect(doc.querySelector('img')).toBeNull()
    const outer = cardRoot(doc)
    const imageArea = outer.firstElementChild as HTMLElement
    expect(imageArea.textContent?.trim().length).toBeGreaterThan(0)
  })
})
