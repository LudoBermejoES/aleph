/** @jsxImportSource react */
import { useRef, useCallback } from 'react'
import {
  BaseBoxShapeUtil,
  type TLBaseShape,
  HTMLContainer,
  type RecordProps,
  T,
  useEditor,
} from 'tldraw'

export type CanvasLabelShape = TLBaseShape<
  'canvasLabel',
  {
    w: number
    h: number
    text: string
  }
>

export class CanvasLabelShapeUtil extends BaseBoxShapeUtil<CanvasLabelShape> {
  static override type = 'canvasLabel' as const

  static override props: RecordProps<CanvasLabelShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
  }

  override getDefaultProps() {
    return {
      w: 200,
      h: 50,
      text: 'Label',
    }
  }

  override component(shape: CanvasLabelShape) {
    return <CanvasLabelComponent shape={shape} />
  }

  override indicator(shape: CanvasLabelShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={4} />
  }
}

function CanvasLabelComponent({ shape }: { shape: CanvasLabelShape }) {
  const editor = useEditor()
  const contentRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleInput = useCallback(() => {
    const text = contentRef.current?.innerText ?? ''
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      editor.updateShape<CanvasLabelShape>({
        id: shape.id,
        type: 'canvasLabel',
        props: { text },
      })
    }, 500)
  }, [editor, shape.id])

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#64748b',
            background: 'transparent',
            outline: 'none',
            wordBreak: 'break-word',
            whiteSpace: 'pre',
            overflow: 'hidden',
            pointerEvents: 'all',
            cursor: 'text',
            width: '100%',
          }}
          dangerouslySetInnerHTML={{ __html: shape.props.text }}
        />
      </div>
    </HTMLContainer>
  )
}
