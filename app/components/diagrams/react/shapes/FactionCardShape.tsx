/** @jsxImportSource react */
import type React from 'react'
import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'
import { useImageAspectFit } from './useImageAspectFit'

export type FactionCardShape = TLBaseShape<
  'factionCard',
  {
    w: number
    h: number
    entityId: string
    campaignId: string
    slug: string
    factionName: string
    crestUrl?: string
    imageOverrideId?: string
    alignment?: string
    memberCount?: number
    aspectRatio?: number
  }
>

const BANNER_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#14b8a6',
]

function hashBannerColor(str: string): string {
  let h = 5381
  for (const c of str) h = (h << 5) + h + c.charCodeAt(0)
  return BANNER_COLORS[Math.abs(h) % BANNER_COLORS.length]!
}

const ALIGNMENT_COLORS: Record<string, string> = {
  lawful_good: '#3b82f6',
  neutral_good: '#22c55e',
  chaotic_good: '#10b981',
  lawful_neutral: '#6b7280',
  true_neutral: '#9ca3af',
  chaotic_neutral: '#f59e0b',
  lawful_evil: '#7c3aed',
  neutral_evil: '#dc2626',
  chaotic_evil: '#ef4444',
}

export class FactionCardShapeUtil extends BaseBoxShapeUtil<FactionCardShape> {
  static override type = 'factionCard' as const

  static override props: RecordProps<FactionCardShape> = {
    w: T.number,
    h: T.number,
    entityId: T.string,
    campaignId: T.string,
    slug: T.string,
    factionName: T.string,
    crestUrl: T.optional(T.string),
    // Per-shape image override: the id of one of the entity's gallery images.
    // OPTIONAL on purpose -- a required prop rejects every snapshot saved
    // before this feature existed and the diagram stops opening.
    imageOverrideId: T.optional(T.string),
    alignment: T.optional(T.string),
    memberCount: T.optional(T.number),
    aspectRatio: T.optional(T.number),
  }

  override getDefaultProps() {
    return {
      w: 140,
      h: 160,
      entityId: '',
      campaignId: '',
      slug: '',
      factionName: '',
      crestUrl: undefined,
      imageOverrideId: undefined,
      alignment: undefined,
      memberCount: undefined,
      aspectRatio: undefined,
    }
  }

  override isAspectRatioLocked() {
    return true
  }

  override onDoubleClick = (shape: FactionCardShape) => {
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

  override component(shape: FactionCardShape) {
    return <FactionCardComponent shape={shape} />
  }

  override getIndicatorPath(shape: FactionCardShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function FactionCardComponent({ shape }: { shape: FactionCardShape }) {
  const [imgError, setImgError] = useState(false)
  const bannerColor = hashBannerColor(shape.props.factionName)
  const firstLetter = shape.props.factionName.charAt(0).toUpperCase() || '?'
  const showCrest = shape.props.crestUrl && !imgError
  const alignmentColor = shape.props.alignment
    ? (ALIGNMENT_COLORS[shape.props.alignment] ?? '#6b7280')
    : null
  const alignmentLabel = shape.props.alignment?.replace(/_/g, ' ') ?? ''
  const fitImage = useImageAspectFit(shape.id, 'factionCard', shape.props.aspectRatio)

  const hasSecondRow = !!alignmentColor || shape.props.memberCount != null
  const chromeHeight = 8 + 14 + (hasSecondRow ? 4 + 14 : 0)

  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    fitImage(e, chromeHeight)
  }

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          borderRadius: 6,
          background: 'white',
          border: '2px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        {/* Image area */}
        <div
          style={{
            flex: 1,
            background: bannerColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {showCrest ? (
            <img
              src={shape.props.crestUrl}
              alt={shape.props.factionName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onLoad={handleLoad}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {firstLetter}
            </div>
          )}
        </div>

        {/* Name bar */}
        <div
          style={{
            padding: '4px 6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 11,
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
            {shape.props.factionName}
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
            {alignmentColor && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: 'white',
                  background: alignmentColor,
                  borderRadius: 4,
                  padding: '1px 5px',
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                }}
              >
                {alignmentLabel}
              </span>
            )}
            {shape.props.memberCount !== undefined && shape.props.memberCount !== null && (
              <span style={{ fontSize: 10, color: '#6b7280' }}>
                {shape.props.memberCount} members
              </span>
            )}
          </div>
        </div>
      </div>
    </HTMLContainer>
  )
}
