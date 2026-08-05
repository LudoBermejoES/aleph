/** @jsxImportSource react */
import React, { useState } from 'react'
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
    locationImageUrl?: string
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
    locationImageUrl: T.optional(T.string),
  }

  override getDefaultProps() {
    return {
      w: 140,
      h: 48,
      entityId: '',
      campaignId: '',
      locationName: '',
      slug: '',
      locationImageUrl: undefined,
    }
  }

  override onDoubleClick = (shape: LocationPinShape) => {
    window.dispatchEvent(
      new CustomEvent('aleph:entity-preview', {
        detail: {
          entityId: shape.props.entityId,
          campaignId: shape.props.campaignId,
          slug: shape.props.slug,
          x: 200,
          y: 200,
        },
      }),
    )
  }

  override component(shape: LocationPinShape) {
    return <LocationPinComponent shape={shape} />
  }

  override getIndicatorPath(shape: LocationPinShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function LocationPinComponent({ shape }: { shape: LocationPinShape }) {
  const [imgError, setImgError] = useState(false)
  const showImage = shape.props.locationImageUrl && !imgError
  const iconSize = Math.min(32, shape.props.h - 12)

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
        {showImage ? (
          <img
            src={shape.props.locationImageUrl}
            alt={shape.props.locationName}
            style={{
              width: iconSize,
              height: iconSize,
              flexShrink: 0,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid #f59e0b',
            }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
        )}
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
