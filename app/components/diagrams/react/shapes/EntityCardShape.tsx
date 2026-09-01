/** @jsxImportSource react */
import type React from 'react'
import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'
import { useImageAspectFit } from './useImageAspectFit'

export type EntityCardShape = TLBaseShape<
  'entityCard',
  {
    w: number
    h: number
    entityId: string
    campaignId: string
    entityName: string
    entityType: string
    portraitUrl?: string
    imageOverrideId?: string
    slug: string
    aspectRatio?: number
  }
>

// This is the fallback shape for every entity type with no dedicated card (Item, Session,
// Lore, Arc and any future campaign-defined type — see design.md D4 of
// add-all-entity-types-to-diagram-palette). It must share the visual grammar of the other
// card shapes (full-bleed image, rounded border, white name bar) rather than the older
// horizontal "icon beside text" layout, which read as a mostly-empty card once the fan-out
// started routing real entities here.
const LABEL_HEIGHT = 32

export class EntityCardShapeUtil extends BaseBoxShapeUtil<EntityCardShape> {
  static override type = 'entityCard' as const

  static override props: RecordProps<EntityCardShape> = {
    w: T.number,
    h: T.number,
    entityId: T.string,
    campaignId: T.string,
    entityName: T.string,
    entityType: T.string,
    portraitUrl: T.optional(T.string),
    // Per-shape image override: the id of one of the entity's gallery images.
    // OPTIONAL on purpose -- a required prop rejects every snapshot saved
    // before this feature existed and the diagram stops opening.
    imageOverrideId: T.optional(T.string),
    slug: T.string,
    aspectRatio: T.optional(T.number),
  }

  override getDefaultProps() {
    return {
      w: 140,
      h: 160,
      entityId: '',
      campaignId: '',
      entityName: '',
      entityType: 'entity',
      portraitUrl: undefined,
      imageOverrideId: undefined,
      slug: '',
      aspectRatio: undefined,
    }
  }

  override isAspectRatioLocked() {
    return true
  }

  override onDoubleClick = (shape: EntityCardShape) => {
    window.dispatchEvent(
      new CustomEvent('aleph:entity-preview', {
        detail: {
          entityId: shape.props.entityId,
          campaignId: shape.props.campaignId,
          slug: shape.props.slug,
          shapeId: shape.id,
          x: 200,
          y: 200,
        },
      }),
    )
  }

  override component(shape: EntityCardShape) {
    return <EntityCardComponent shape={shape} />
  }

  override getIndicatorPath(shape: EntityCardShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function EntityCardComponent({ shape }: { shape: EntityCardShape }) {
  const [imgError, setImgError] = useState(false)
  const showImage = shape.props.portraitUrl && !imgError
  const fitImage = useImageAspectFit(shape.id, 'entityCard', shape.props.aspectRatio)

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    fitImage(e, LABEL_HEIGHT)
  }

  const imageAreaHeight = Math.max(shape.props.h - LABEL_HEIGHT, 0)

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 8,
          background: 'white',
          border: '2px solid #6366f1',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        <div
          style={{
            width: '100%',
            height: imageAreaHeight,
            background: '#e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {showImage ? (
            <img
              src={shape.props.portraitUrl}
              alt={shape.props.entityName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onLoad={handleLoad}
              onError={() => setImgError(true)}
            />
          ) : (
            <span style={{ fontSize: 32 }}>📋</span>
          )}
        </div>
        <div
          style={{
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              // Explicit dark color: this bar's background is always white regardless of
              // the campaign's theme, but text color without one would inherit the theme's
              // foreground (light/near-white in dark themes), making it unreadable here.
              color: '#111827',
            }}
          >
            {shape.props.entityName}
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#6b7280',
              textAlign: 'center',
              textTransform: 'capitalize',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shape.props.entityType}
          </div>
        </div>
      </div>
    </HTMLContainer>
  )
}
