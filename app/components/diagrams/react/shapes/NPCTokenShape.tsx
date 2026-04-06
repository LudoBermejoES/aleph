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
              width: 64,
              height: 64,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #8b5cf6',
              background: '#ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {shape.props.portraitUrl ? (
              <img
                src={shape.props.portraitUrl}
                alt={shape.props.characterName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 28 }}>🧑</span>
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

  override indicator(shape: NPCTokenShape) {
    return <ellipse cx={shape.props.w / 2} cy={32} rx={32} ry={32} />
  }
}
