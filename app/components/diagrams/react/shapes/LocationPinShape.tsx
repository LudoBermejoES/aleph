/** @jsxImportSource react */
import React from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type LocationPinShape = TLBaseShape<
  'locationPin',
  {
    w: number
    h: number
    entityId: string
    campaignId: string
    locationName: string
    slug: string
  }
>

export class LocationPinShapeUtil extends BaseBoxShapeUtil<LocationPinShape> {
  static override type = 'locationPin' as const

  static override props: RecordProps<LocationPinShape> = {
    w: T.number,
    h: T.number,
    entityId: T.string,
    campaignId: T.string,
    locationName: T.string,
    slug: T.string,
  }

  override getDefaultProps() {
    return {
      w: 140,
      h: 48,
      entityId: '',
      campaignId: '',
      locationName: '',
      slug: '',
    }
  }

  override onDoubleClick = (shape: LocationPinShape) => {
    window.dispatchEvent(new CustomEvent('aleph:entity-preview', {
      detail: {
        entityId: shape.props.entityId,
        campaignId: shape.props.campaignId,
        slug: shape.props.slug,
        x: 200,
        y: 200,
      }
    }))
  }

  override component(shape: LocationPinShape) {
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            borderRadius: 24,
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            userSelect: 'none',
            cursor: 'default',
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shape.props.locationName}
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override indicator(shape: LocationPinShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={24} />
  }
}
