/** @jsxImportSource react */
import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type RelationshipArrowShape = TLBaseShape<
  'relationshipArrow',
  {
    w: number
    h: number
    relType: string
    label: string
    bidirectional: boolean
  }
>

const REL_STYLES: Record<string, { color: string; dasharray?: string; noArrow?: boolean }> = {
  ally:    { color: '#22c55e', dasharray: '6 3' },
  enemy:   { color: '#ef4444' },
  family:  { color: '#3b82f6', noArrow: true },
  serves:  { color: '#8b5cf6' },
  hunts:   { color: '#f97316' },
  knows:   { color: '#6b7280', dasharray: '2 3' },
  rival:   { color: '#ef4444', dasharray: '6 3' },
  custom:  { color: '#9ca3af' },
}

export class RelationshipArrowShapeUtil extends BaseBoxShapeUtil<RelationshipArrowShape> {
  static override type = 'relationshipArrow' as const

  static override props: RecordProps<RelationshipArrowShape> = {
    w: T.number,
    h: T.number,
    relType: T.string,
    label: T.string,
    bidirectional: T.boolean,
  }

  override getDefaultProps() {
    return {
      w: 200,
      h: 100,
      relType: 'custom',
      label: '',
      bidirectional: false,
    }
  }

  override component(shape: RelationshipArrowShape) {
    const style = REL_STYLES[shape.props.relType] ?? REL_STYLES.custom!
    const { w, h } = shape.props
    const midX = w / 2
    const midY = h / 2

    // Arrowhead marker size
    const markerSize = 8

    // Build marker definitions
    const markerId = `arrow-${shape.id}`
    const markerStartId = `arrow-start-${shape.id}`

    return (
      <HTMLContainer>
        <svg
          width={w}
          height={h}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id={markerId}
              markerWidth={markerSize}
              markerHeight={markerSize}
              refX={markerSize - 1}
              refY={markerSize / 2}
              orient="auto"
            >
              <path
                d={`M0,0 L0,${markerSize} L${markerSize},${markerSize / 2} Z`}
                fill={style.color}
              />
            </marker>
            {shape.props.bidirectional && (
              <marker
                id={markerStartId}
                markerWidth={markerSize}
                markerHeight={markerSize}
                refX={1}
                refY={markerSize / 2}
                orient="auto-start-reverse"
              >
                <path
                  d={`M0,0 L0,${markerSize} L${markerSize},${markerSize / 2} Z`}
                  fill={style.color}
                />
              </marker>
            )}
          </defs>

          <line
            x1={0}
            y1={0}
            x2={w}
            y2={h}
            stroke={style.color}
            strokeWidth={2}
            strokeDasharray={style.dasharray}
            markerEnd={style.noArrow ? undefined : `url(#${markerId})`}
            markerStart={shape.props.bidirectional && !style.noArrow ? `url(#${markerStartId})` : undefined}
          />

          {/* Midpoint label */}
          {shape.props.label && (
            <g transform={`translate(${midX}, ${midY})`}>
              <rect
                x={-shape.props.label.length * 3.5 - 6}
                y={-10}
                width={shape.props.label.length * 7 + 12}
                height={20}
                rx={10}
                fill="white"
                stroke={style.color}
                strokeWidth={1}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={500}
                fill={style.color}
              >
                {shape.props.label}
              </text>
            </g>
          )}
        </svg>
      </HTMLContainer>
    )
  }

  override indicator(shape: RelationshipArrowShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
