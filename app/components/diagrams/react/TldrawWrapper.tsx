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
import { RelationshipArrowShapeUtil } from './shapes/RelationshipArrowShape'
import { RegionBoxShapeUtil } from './shapes/RegionBoxShape'
import { FactionCardShapeUtil } from './shapes/FactionCardShape'
import { AnchorTokenShapeUtil } from './shapes/AnchorTokenShape'
import { MapTokenShapeUtil } from './shapes/MapTokenShape'
import { StickyNoteShapeUtil } from './shapes/StickyNoteShape'
import { CanvasLabelShapeUtil } from './shapes/CanvasLabelShape'

const SHAPE_UTILS = [
  EntityCardShapeUtil,
  QuestNodeShapeUtil,
  LocationPinShapeUtil,
  NPCTokenShapeUtil,
  RelationshipArrowShapeUtil,
  RegionBoxShapeUtil,
  FactionCardShapeUtil,
  AnchorTokenShapeUtil,
  MapTokenShapeUtil,
  StickyNoteShapeUtil,
  CanvasLabelShapeUtil,
]

export interface TldrawWrapperHandle {
  importTldrJson: (json: string) => void
}

export interface TldrawWrapperProps {
  snapshot?: TLEditorSnapshot
  readOnly?: boolean
  campaignId?: string
  darkMode?: boolean
  onChange?: (snapshot: TLEditorSnapshot) => void
  onEditorReady?: (editor: Editor) => void
  onNativeDrop?: (event: DragEvent, editor: Editor) => void
  handleRef?: React.Ref<TldrawWrapperHandle>
}

export function TldrawWrapper({
  snapshot,
  readOnly,
  campaignId,
  darkMode,
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

      if (result.ok) {
        loadSnapshot(editor.store, getSnapshot(result.value))
      } else if (result.error.type === 'migrationFailed') {
        // The file was created with a newer tldraw than the installed package.
        // Strategy: replace the file's schema with the installed schema so the
        // migration engine only sees sequences it knows, then drop any records
        // whose typeName is unknown to the installed store.
        let parsed: {
          schema: { sequences: Record<string, number> }
          records: Array<{ id: string; typeName: string }>
        }
        try {
          parsed = JSON.parse(json) as typeof parsed
        } catch {
          console.error('[TldrawWrapper] Failed to parse .tldr JSON')
          return
        }

        const installedSchema = editor.store.schema.serialize()
        const knownTypeNames = new Set(
          Object.keys(installedSchema.sequences).map((k) => k.split('.').pop()!),
        )
        // Keep only records whose typeName is known to the installed schema
        const safeRecords = parsed.records.filter((r) => knownTypeNames.has(r.typeName))

        const storeSnapshot = {
          store: Object.fromEntries(safeRecords.map((r) => [r.id, r])),
          schema: installedSchema,
        }
        try {
          loadSnapshot(editor.store, storeSnapshot as Parameters<typeof loadSnapshot>[1])
        } catch (e) {
          console.error('[TldrawWrapper] Failed to load .tldr with schema substitution:', e)
          return
        }
      } else {
        console.error('[TldrawWrapper] Failed to parse .tldr file:', result.error)
        return
      }

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

      if (darkMode) {
        editor.user.updateUserPreferences({ colorScheme: 'dark' })
      }

      onEditorReady?.(editor)

      // Hydrate entity shapes with fresh data after mount
      if (campaignId) {
        setTimeout(() => {
          import('../../../utils/diagram-hydration').then(({ hydrateEntityShapes }) => {
            hydrateEntityShapes(editor, campaignId).catch(console.error)
          })
        }, 0)
      }

      editor.store.listen(
        () => {
          if (!readOnly && onChange) {
            onChange(getSnapshot(editor.store))
          }
        },
        { scope: 'document', source: 'user' },
      )
    },
    [readOnly, darkMode, campaignId, onChange, onEditorReady],
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
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
      />
    </div>
  )
}
