/** @jsxImportSource react */
import React, { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'
import { useImageAspectFit } from './useImageAspectFit'

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
    aspectRatio?: number
  }
>

// Placeholder size shown before the image loads (or when there is none) — close to a
// typical portrait photo so the layout doesn't jump much once the real ratio is known.
const DEFAULT_W = 140
const DEFAULT_H = 175
const LABEL_HEIGHT = 28

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
    aspectRatio: T.optional(T.number),
  }

  override getDefaultProps() {
    return {
      w: DEFAULT_W,
      h: DEFAULT_H,
      entityId: '',
      campaignId: '',
      locationName: '',
      slug: '',
      locationImageUrl: undefined,
      aspectRatio: undefined,
    }
  }

  override isAspectRatioLocked() {
    return true
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
  const fitImage = useImageAspectFit(shape.id, 'locationPin', shape.props.aspectRatio)

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
          border: '2px solid #f59e0b',
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
            background: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {showImage ? (
            <img
              src={shape.props.locationImageUrl}
              alt={shape.props.locationName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onLoad={handleLoad}
              onError={() => setImgError(true)}
            />
          ) : (
            <span style={{ fontSize: 32 }}>📍</span>
          )}
        </div>
        <div
          style={{
            padding: '4px 8px',
            fontWeight: 600,
            fontSize: 13,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {shape.props.locationName}
        </div>
      </div>
    </HTMLContainer>
  )
}
