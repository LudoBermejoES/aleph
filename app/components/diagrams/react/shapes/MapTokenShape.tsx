/** @jsxImportSource react */
import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type MapTokenShape = TLBaseShape<
  'mapToken',
  {
    w: number
    h: number
    mapId: string
    campaignId: string
    mapName: string
    thumbnailUrl?: string
  }
>

export class MapTokenShapeUtil extends BaseBoxShapeUtil<MapTokenShape> {
  static override type = 'mapToken' as const

  static override props: RecordProps<MapTokenShape> = {
    w: T.number,
    h: T.number,
    mapId: T.string,
    campaignId: T.string,
    mapName: T.string,
    thumbnailUrl: T.optional(T.string),
  }

  override getDefaultProps() {
    return {
      w: 180,
      h: 120,
      mapId: '',
      campaignId: '',
      mapName: '',
      thumbnailUrl: undefined,
    }
  }

  override onDoubleClick = (shape: MapTokenShape) => {
    window.dispatchEvent(
      new CustomEvent('aleph:open-map', {
        detail: {
          mapId: shape.props.mapId,
          campaignId: shape.props.campaignId,
        },
      }),
    )
  }

  override component(shape: MapTokenShape) {
    return <MapTokenComponent shape={shape} />
  }

  override indicator(shape: MapTokenShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />
  }
}

function MapTokenComponent({ shape }: { shape: MapTokenShape }) {
  const [imgError, setImgError] = useState(false)
  const showThumb = shape.props.thumbnailUrl && !imgError
  const labelBarHeight = 28

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          borderRadius: 6,
          border: '2px solid #6b7280',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          cursor: 'default',
          background: '#f9fafb',
        }}
      >
        {/* Thumbnail or placeholder */}
        <div
          style={{
            flex: 1,
            background: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {showThumb ? (
            <img
              src={shape.props.thumbnailUrl}
              alt={shape.props.mapName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <svg
              width={48}
              height={48}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth={1.5}
            >
              <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-10l6-3m0 16l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 11V9" />
            </svg>
          )}
        </div>

        {/* Label bar */}
        <div
          style={{
            height: labelBarHeight,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'white',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shape.props.mapName}
          </span>
        </div>
      </div>
    </HTMLContainer>
  )
}
