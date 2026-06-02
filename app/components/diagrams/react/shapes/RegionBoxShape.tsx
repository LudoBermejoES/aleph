/** @jsxImportSource react */
import { useEffect, useRef } from 'react'
import {
  BaseBoxShapeUtil,
  type TLBaseShape,
  HTMLContainer,
  type RecordProps,
  T,
  useEditor,
} from 'tldraw'

export type RegionBoxShape = TLBaseShape<
  'regionBox',
  {
    w: number
    h: number
    label: string
    color: string
  }
>

export class RegionBoxShapeUtil extends BaseBoxShapeUtil<RegionBoxShape> {
  static override type = 'regionBox' as const

  static override props: RecordProps<RegionBoxShape> = {
    w: T.number,
    h: T.number,
    label: T.string,
    color: T.string,
  }

  override getDefaultProps() {
    return {
      w: 300,
      h: 200,
      label: 'Region',
      color: '#6366f1',
    }
  }

  override component(shape: RegionBoxShape) {
    return <RegionBoxComponent shape={shape} />
  }

  override getIndicatorPath(shape: RegionBoxShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return `rgba(99,102,241,${alpha})`
  const r = parseInt(result[1]!, 16)
  const g = parseInt(result[2]!, 16)
  const b = parseInt(result[3]!, 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function RegionBoxComponent({ shape }: { shape: RegionBoxShape }) {
  const editor = useEditor()
  const labelRef = useRef<HTMLDivElement>(null)
  const isFirstMount = useRef(true)

  // Send to back on first mount
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      try {
        editor.sendToBack([shape.id])
      } catch {
        // ignore if not possible
      }
    }
  }, [editor, shape.id])

  const bgColor = hexToRgba(shape.props.color, 0.15)

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (labelRef.current) {
      labelRef.current.focus()
      // Place cursor at end
      const range = document.createRange()
      range.selectNodeContents(labelRef.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  function handleInput() {
    const text = labelRef.current?.innerText ?? ''
    editor.updateShape<RegionBoxShape>({
      id: shape.id,
      type: 'regionBox',
      props: { label: text },
    })
  }

  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          background: bgColor,
          border: `2px solid ${shape.props.color}`,
          borderRadius: 8,
          position: 'relative',
          boxSizing: 'border-box',
          pointerEvents: 'all',
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Corner label */}
        <div
          ref={labelRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 6,
            left: 10,
            fontSize: 13,
            fontWeight: 600,
            color: shape.props.color,
            background: 'transparent',
            outline: 'none',
            minWidth: 20,
            maxWidth: shape.props.w - 20,
            whiteSpace: 'pre',
            overflow: 'hidden',
            pointerEvents: 'all',
            cursor: 'text',
          }}
          dangerouslySetInnerHTML={{ __html: shape.props.label }}
        />
      </div>
    </HTMLContainer>
  )
}
