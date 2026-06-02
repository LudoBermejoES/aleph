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

export type StickyNoteShape = TLBaseShape<
  'stickyNote',
  {
    w: number
    h: number
    text: string
    color: string
  }
>

export class StickyNoteShapeUtil extends BaseBoxShapeUtil<StickyNoteShape> {
  static override type = 'stickyNote' as const

  static override props: RecordProps<StickyNoteShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
    color: T.string,
  }

  override getDefaultProps() {
    return {
      w: 160,
      h: 120,
      text: '',
      color: '#fef3c7',
    }
  }

  override component(shape: StickyNoteShape) {
    return <StickyNoteComponent shape={shape} />
  }

  override getIndicatorPath(shape: StickyNoteShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function StickyNoteComponent({ shape }: { shape: StickyNoteShape }) {
  const editor = useEditor()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleInput = useCallback(() => {
    const text = contentRef.current?.innerText ?? ''
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      editor.updateShape<StickyNoteShape>({
        id: shape.id,
        type: 'stickyNote',
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
          background: shape.props.color,
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '2px 2px 6px rgba(0,0,0,0.15)',
          padding: 10,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            fontSize: 13,
            lineHeight: 1.5,
            color: '#1c1917',
            outline: 'none',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            pointerEvents: 'all',
            cursor: 'text',
          }}
          dangerouslySetInnerHTML={{ __html: shape.props.text }}
        />
      </div>
    </HTMLContainer>
  )
}
