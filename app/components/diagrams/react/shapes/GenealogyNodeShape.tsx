/** @jsxImportSource react */
import { useState } from 'react'
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type GenealogyNodeShape = TLBaseShape<
  'genealogyNode',
  {
    w: number
    h: number
    entityId: string
    campaignId: string
    name: string
    slug: string
    portraitUrl?: string
    birthYear?: number
    deathYear?: number
    gender?: string
    isFocus: boolean
  }
>

export function formatYearLabel(
  birthYear: number | null | undefined,
  deathYear: number | null | undefined,
): string {
  if (birthYear == null && deathYear == null) return ''
  const b = birthYear != null ? String(birthYear) : '?'
  const d = deathYear != null ? `–${deathYear}` : ''
  return `(${b}${d})`
}

export function genderToColor(gender: string | null | undefined): string {
  if (!gender) return '#9ca3af'
  const g = gender.toLowerCase()
  if (g === 'male' || g === 'man' || g === 'masculine') return '#3b82f6'
  if (g === 'female' || g === 'woman' || g === 'feminine') return '#ec4899'
  return '#9ca3af'
}

function PlaceholderPortrait({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <rect width="64" height="64" rx="4" fill="#ede9fe" />
      <circle cx="32" cy="22" r="12" fill="#c4b5fd" />
      <ellipse cx="32" cy="52" rx="18" ry="14" fill="#c4b5fd" />
    </svg>
  )
}

export class GenealogyNodeShapeUtil extends BaseBoxShapeUtil<GenealogyNodeShape> {
  static override type = 'genealogyNode' as const

  static override props: RecordProps<GenealogyNodeShape> = {
    w: T.number,
    h: T.number,
    entityId: T.string,
    campaignId: T.string,
    name: T.string,
    slug: T.string,
    portraitUrl: T.optional(T.string),
    birthYear: T.optional(T.number),
    deathYear: T.optional(T.number),
    gender: T.optional(T.string),
    isFocus: T.boolean,
  }

  override getDefaultProps() {
    return {
      w: 120,
      h: 160,
      entityId: '',
      campaignId: '',
      name: '',
      slug: '',
      portraitUrl: undefined,
      birthYear: undefined,
      deathYear: undefined,
      gender: undefined,
      isFocus: false,
    }
  }

  override component(shape: GenealogyNodeShape) {
    return <GenealogyNodeComponent shape={shape} />
  }

  override getIndicatorPath(shape: GenealogyNodeShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function GenealogyNodeComponent({ shape }: { shape: GenealogyNodeShape }) {
  const [imgError, setImgError] = useState(false)
  const { portraitUrl, name, birthYear, deathYear, gender, isFocus, w, h } = shape.props
  const showImage = portraitUrl && !imgError

  const accentColor = genderToColor(gender)
  const yearLabel = formatYearLabel(birthYear, deathYear)
  const nameRowHeight = 18
  const yearRowHeight = yearLabel ? 14 : 0
  const imgSize = Math.min(w, h - nameRowHeight - yearRowHeight - 16)

  return (
    <HTMLContainer>
      <div
        style={{
          width: w,
          height: h,
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
            position: 'relative',
            width: imgSize,
            height: imgSize,
            overflow: 'hidden',
            border: `2px solid ${isFocus ? '#f59e0b' : accentColor}`,
            borderRadius: 6,
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {showImage ? (
            <img
              src={portraitUrl}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={() => setImgError(true)}
            />
          ) : (
            <PlaceholderPortrait size={imgSize} />
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
            maxWidth: w,
          }}
        >
          {name}
        </div>

        {yearLabel && (
          <div
            style={{
              fontSize: 9,
              color: '#6b7280',
              textAlign: 'center',
            }}
          >
            {yearLabel}
          </div>
        )}
      </div>
    </HTMLContainer>
  )
}
