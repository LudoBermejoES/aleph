import 'tldraw/tldraw.css'
import { Tldraw, type Editor, type TLStoreSnapshot } from 'tldraw'
import { useCallback, useRef } from 'react'
import { EntityCardShapeUtil } from './shapes/EntityCardShape'
import { QuestNodeShapeUtil } from './shapes/QuestNodeShape'
import { LocationPinShapeUtil } from './shapes/LocationPinShape'
import { NPCTokenShapeUtil } from './shapes/NPCTokenShape'

const SHAPE_UTILS = [
  EntityCardShapeUtil,
  QuestNodeShapeUtil,
  LocationPinShapeUtil,
  NPCTokenShapeUtil,
]

export interface TldrawWrapperProps {
  snapshot?: TLStoreSnapshot
  readOnly?: boolean
  onChange?: (snapshot: TLStoreSnapshot) => void
  onEditorReady?: (editor: Editor) => void
  onDrop?: (event: DragEvent, editor: Editor) => void
}

export function TldrawWrapper({
  snapshot,
  readOnly,
  onChange,
  onEditorReady,
  onDrop,
}: TldrawWrapperProps) {
  const editorRef = useRef<Editor | null>(null)

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor

      if (readOnly) {
        editor.setCurrentTool('hand')
        editor.updateInstanceState({ isReadonly: true })
      }

      onEditorReady?.(editor)

      editor.store.listen(
        () => {
          if (!readOnly && onChange) {
            onChange(editor.store.getSnapshot())
          }
        },
        { scope: 'document', source: 'user' },
      )
    },
    [readOnly, onChange, onEditorReady],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (editorRef.current && onDrop) {
        onDrop(event.nativeEvent, editorRef.current)
      }
    },
    [onDrop],
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  return (
    <div style={{ width: '100%', height: '100%' }} onDrop={handleDrop} onDragOver={handleDragOver}>
      <Tldraw
        snapshot={snapshot}
        shapeUtils={SHAPE_UTILS}
        onMount={handleMount}
        hideUi={readOnly}
      />
    </div>
  )
}
