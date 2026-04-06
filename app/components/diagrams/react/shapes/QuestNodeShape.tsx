import { BaseBoxShapeUtil, type TLBaseShape, HTMLContainer, type RecordProps, T } from 'tldraw'

export type QuestNodeShape = TLBaseShape<
  'questNode',
  {
    w: number
    h: number
    entityId: string
    campaignId: string
    questTitle: string
    status: string
    slug: string
  }
>

const STATUS_COLORS: Record<string, string> = {
  active: '#3b82f6',
  completed: '#22c55e',
  failed: '#ef4444',
  planned: '#a855f7',
}

export class QuestNodeShapeUtil extends BaseBoxShapeUtil<QuestNodeShape> {
  static override type = 'questNode' as const

  static override props: RecordProps<QuestNodeShape> = {
    w: T.number,
    h: T.number,
    entityId: T.string,
    campaignId: T.string,
    questTitle: T.string,
    status: T.string,
    slug: T.string,
  }

  override getDefaultProps() {
    return {
      w: 200,
      h: 60,
      entityId: '',
      campaignId: '',
      questTitle: '',
      status: 'planned',
      slug: '',
    }
  }

  override onDoubleClick = (shape: QuestNodeShape) => {
    const url = `/campaigns/${shape.props.campaignId}/quests/${shape.props.slug}`
    window.open(url, '_blank')
  }

  override component(shape: QuestNodeShape) {
    const color = STATUS_COLORS[shape.props.status] ?? '#6b7280'
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: 6,
            background: 'white',
            border: `2px solid ${color}`,
            borderLeft: `6px solid ${color}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            userSelect: 'none',
            cursor: 'default',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shape.props.questTitle}
            </div>
            <div style={{ fontSize: 11, color, textTransform: 'capitalize', marginTop: 2 }}>
              {shape.props.status}
            </div>
          </div>
        </div>
      </HTMLContainer>
    )
  }

  override indicator(shape: QuestNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={6} />
  }
}
