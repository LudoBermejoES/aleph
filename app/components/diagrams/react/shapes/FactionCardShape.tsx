/** @jsxImportSource react */
import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

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
    alignment?: string
    memberCount?: number
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
    alignment: T.optional(T.string),
    memberCount: T.optional(T.number),
  }

  override getDefaultProps() {
    return {
      w: 180,
      h: 100,
      entityId: '',
      campaignId: '',
      slug: '',
      factionName: '',
      crestUrl: undefined,
      alignment: undefined,
      memberCount: undefined,
    }
  }

  override onDoubleClick = (shape: FactionCardShape) => {
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

  override component(shape: FactionCardShape) {
    return <FactionCardComponent shape={shape} />
  }

  override indicator(shape: FactionCardShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />
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
        {/* Banner area */}
        <div
          style={{
            height: 40,
            background: bannerColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {showCrest ? (
            <img
              src={shape.props.crestUrl}
              alt={shape.props.factionName}
              style={{ height: 32, width: 32, objectFit: 'contain' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {firstLetter}
            </div>
          )}
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
