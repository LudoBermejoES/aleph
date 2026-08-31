/** @jsxImportSource react */
import React from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

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
  }
>

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
  }

  override getDefaultProps() {
    return {
      w: 200,
      h: 80,
      entityId: '',
      campaignId: '',
      entityName: '',
      entityType: 'entity',
      portraitUrl: undefined,
      imageOverrideId: undefined,
      slug: '',
    }
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
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'white',
            border: '2px solid #6366f1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            userSelect: 'none',
            cursor: 'default',
          }}
        >
          {shape.props.portraitUrl ? (
            <img
              src={shape.props.portraitUrl}
              alt={shape.props.entityName}
              style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 4,
                background: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 20,
              }}
            >
              📋
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                // Explicit dark color: this card's background is always white regardless
                // of the campaign's theme, but unset text color would inherit the theme's
                // foreground (light/near-white in dark themes), making it unreadable here.
                color: '#111827',
              }}
            >
              {shape.props.entityName}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>
              {shape.props.entityType}
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: EntityCardShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}
