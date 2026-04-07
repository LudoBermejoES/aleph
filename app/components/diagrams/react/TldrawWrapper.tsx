/** @jsxImportSource react */
import 'tldraw/tldraw.css'
import './TldrawWrapper.css'
import React, { useCallback, useImperativeHandle, useRef } from 'react'
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  parseTldrawJsonFile,
  type Editor,
  type TLEditorSnapshot,
} from 'tldraw'
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

export interface TldrawWrapperHandle {
  importTldrJson: (json: string) => void
}

export interface TldrawWrapperProps {
  snapshot?: TLEditorSnapshot
  readOnly?: boolean
  onChange?: (snapshot: TLEditorSnapshot) => void
  onEditorReady?: (editor: Editor) => void
  onNativeDrop?: (event: DragEvent, editor: Editor) => void
  handleRef?: React.Ref<TldrawWrapperHandle>
}

export function TldrawWrapper({
  snapshot,
  readOnly,
  onChange,
  onEditorReady,
  onNativeDrop,
  handleRef,
}: TldrawWrapperProps) {
  const editorRef = useRef<Editor | null>(null)

  useImperativeHandle(handleRef, () => ({
    importTldrJson(json: string) {
      const editor = editorRef.current
      if (!editor) return
      const result = parseTldrawJsonFile({ json, schema: editor.store.schema })
      if (!result.ok) {
        console.error('[TldrawWrapper] Failed to parse .tldr file:', result.error)
        return
      }
      loadSnapshot(editor.store, getSnapshot(result.value))
      if (onChange) onChange(getSnapshot(editor.store))
    },
  }))

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
            onChange(getSnapshot(editor.store))
          }
        },
        { scope: 'document', source: 'user' },
      )
    },
    [readOnly, onChange, onEditorReady],
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  // Native drop is handled by TldrawCanvas.vue via DOM listeners to avoid
  // conflicts with React's synthetic event system. onNativeDrop is wired
  // there via the onEditorReady callback.
  void onNativeDrop

  return (
    <div className="tldraw-wrapper" onDragOver={handleDragOver}>
      <Tldraw
        snapshot={snapshot}
        shapeUtils={SHAPE_UTILS}
        onMount={handleMount}
        hideUi={readOnly}
      />
    </div>
  )
}
