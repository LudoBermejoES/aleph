import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type NPCTokenShape = TLBaseShape<
  'npcToken',
  {
    w: number
    h: number
    entityId: string
    campaignId: string
    characterName: string
    portraitUrl?: string
    slug: string
  }
>

function PlaceholderToken({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Body silhouette */}
      <rect width="64" height="64" rx="4" fill="#ede9fe" />
      {/* Head */}
      <circle cx="32" cy="22" r="12" fill="#c4b5fd" />
      {/* Shoulders */}
      <ellipse cx="32" cy="52" rx="18" ry="14" fill="#c4b5fd" />
    </svg>
  )
}

export class NPCTokenShapeUtil extends BaseBoxShapeUtil<NPCTokenShape> {
  static override type = 'npcToken' as const

  static override props: RecordProps<NPCTokenShape> = {
    w: T.number,
    h: T.number,
    entityId: T.string,
    campaignId: T.string,
    characterName: T.string,
    portraitUrl: T.optional(T.string),
    slug: T.string,
  }

  override getDefaultProps() {
    return {
      w: 80,
      h: 100,
      entityId: '',
      campaignId: '',
      characterName: '',
      portraitUrl: undefined,
      slug: '',
    }
  }

  override onDoubleClick = (shape: NPCTokenShape) => {
    const url = `/campaigns/${shape.props.campaignId}/characters/${shape.props.slug}`
    window.open(url, '_blank')
  }

  override component(shape: NPCTokenShape) {
    return <NPCTokenComponent shape={shape} />
  }

  override indicator(shape: NPCTokenShape) {
    return <rect x={0} y={0} width={shape.props.w} height={shape.props.h} rx={4} />
  }
}

function NPCTokenComponent({ shape }: { shape: NPCTokenShape }) {
  const [imgError, setImgError] = useState(false)
  const showImage = shape.props.portraitUrl && !imgError
  const imgSize = Math.min(shape.props.w, shape.props.h - 20)

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        <div
          style={{
            width: imgSize,
            height: imgSize,
            overflow: 'hidden',
            border: '2px solid #8b5cf6',
            borderRadius: 4,
            background: '#ede9fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {showImage ? (
            <img
              src={shape.props.portraitUrl}
              alt={shape.props.characterName}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <PlaceholderToken size={imgSize} />
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: shape.props.w,
          }}
        >
          {shape.props.characterName}
        </div>
      </div>
    </HTMLContainer>
  )
}
