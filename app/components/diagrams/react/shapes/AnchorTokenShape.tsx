/** @jsxImportSource react */
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type AnchorTokenShape = TLBaseShape<
  'anchorToken',
  {
    w: number
    h: number
    targetType: string
    targetDiagramId?: string
    targetUrl?: string
    label: string
    targetExists?: boolean
  }
>

export class AnchorTokenShapeUtil extends BaseBoxShapeUtil<AnchorTokenShape> {
  static override type = 'anchorToken' as const

  static override props: RecordProps<AnchorTokenShape> = {
    w: T.number,
    h: T.number,
    targetType: T.string,
    targetDiagramId: T.optional(T.string),
    targetUrl: T.optional(T.string),
    label: T.string,
    targetExists: T.optional(T.boolean),
  }

  override getDefaultProps() {
    return {
      w: 160,
      h: 44,
      targetType: 'diagram',
      targetDiagramId: undefined,
      targetUrl: undefined,
      label: 'Link',
      targetExists: undefined,
    }
  }

  override onDoubleClick = (shape: AnchorTokenShape) => {
    window.dispatchEvent(
      new CustomEvent('aleph:navigate', {
        detail: {
          targetType: shape.props.targetType,
          targetDiagramId: shape.props.targetDiagramId,
          targetUrl: shape.props.targetUrl,
        },
      }),
    )
  }

  override component(shape: AnchorTokenShape) {
    const isBroken =
      shape.props.targetType === 'diagram' &&
      shape.props.targetDiagramId &&
      shape.props.targetExists === false

    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 14px',
            borderRadius: 22,
            background: isBroken ? '#fef2f2' : '#eff6ff',
            border: `2px solid ${isBroken ? '#fca5a5' : '#93c5fd'}`,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            userSelect: 'none',
            cursor: 'default',
            boxSizing: 'border-box',
          }}
        >
          {isBroken ? (
            <>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Not found</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 14 }}>↗</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1d4ed8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {shape.props.label}
              </span>
            </>
          )}
        </div>
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: AnchorTokenShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}
