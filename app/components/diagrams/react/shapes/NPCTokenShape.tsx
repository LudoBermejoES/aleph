/** @jsxImportSource react */
import type React from 'react'
import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'
import { useImageAspectFit } from './useImageAspectFit'

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
    statusBadge?: string
    tags?: string[]
    aspectRatio?: number
  }
>

const STATUS_COLORS: Record<string, string> = {
  alive: '#22c55e',
  dead: '#6b7280',
  missing: '#f59e0b',
  unknown: '#9ca3af',
  hostile: '#ef4444',
  inactive: '#9ca3af',
}

function hashColor(str: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']
  let h = 5381
  for (const c of str) h = (h << 5) + h + c.charCodeAt(0)
  return colors[Math.abs(h) % colors.length]!
}

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
    statusBadge: T.optional(T.string),
    tags: T.optional(T.arrayOf(T.string)),
    aspectRatio: T.optional(T.number),
  }

  override getDefaultProps() {
    return {
      w: 80,
      h: 120,
      entityId: '',
      campaignId: '',
      characterName: '',
      portraitUrl: undefined,
      slug: '',
      statusBadge: undefined,
      tags: [] as string[],
      aspectRatio: undefined,
    }
  }

  override isAspectRatioLocked() {
    return true
  }

  override onDoubleClick = (shape: NPCTokenShape) => {
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

  override component(shape: NPCTokenShape) {
    return <NPCTokenComponent shape={shape} />
  }

  override getIndicatorPath(shape: NPCTokenShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function NPCTokenComponent({ shape }: { shape: NPCTokenShape }) {
  const [imgError, setImgError] = useState(false)
  const showImage = shape.props.portraitUrl && !imgError
  const tags = shape.props.tags ?? []
  const visibleTags = tags.slice(0, 2)
  const overflowCount = tags.length - visibleTags.length
  const fitImage = useImageAspectFit(shape.id, 'npcToken', shape.props.aspectRatio)

  // Reserve space for tags row if there are tags
  const tagsRowHeight = tags.length > 0 ? 20 : 0
  const nameRowHeight = 18
  const chromeHeight = nameRowHeight + tagsRowHeight + 12
  // Square while there's no image (or it hasn't loaded/fitted yet) — once fitted, the
  // portrait area takes the shape's own w/h, matching the image's true aspect ratio.
  const imgW = shape.props.w
  const imgH = Math.max(shape.props.h - chromeHeight, 0)

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    fitImage(e, chromeHeight)
  }

  const statusColor = shape.props.statusBadge
    ? (STATUS_COLORS[shape.props.statusBadge] ?? '#9ca3af')
    : null

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
        {/* Portrait with status badge */}
        <div
          style={{
            position: 'relative',
            width: imgW,
            height: imgH,
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
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onLoad={handleLoad}
              onError={() => setImgError(true)}
            />
          ) : (
            <PlaceholderToken size={Math.min(imgW, imgH)} />
          )}
          {/* Status badge */}
          {statusColor && (
            <div
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: statusColor,
                border: '1.5px solid white',
              }}
            />
          )}
        </div>

        {/* Name */}
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

        {/* Tag chips */}
        {tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 2,
              flexWrap: 'nowrap',
              maxWidth: shape.props.w,
              overflow: 'hidden',
            }}
          >
            {visibleTags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: 'white',
                  background: hashColor(tag),
                  borderRadius: 6,
                  padding: '1px 5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 50,
                }}
              >
                {tag}
              </span>
            ))}
            {overflowCount > 0 && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  color: '#6b7280',
                  background: '#f3f4f6',
                  borderRadius: 6,
                  padding: '1px 5px',
                  whiteSpace: 'nowrap',
                }}
              >
                +{overflowCount}
              </span>
            )}
          </div>
        )}
      </div>
    </HTMLContainer>
  )
}
