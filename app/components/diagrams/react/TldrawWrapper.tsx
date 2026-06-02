/** @jsxImportSource react */
import 'tldraw/tldraw.css'
import './TldrawWrapper.css'
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import {
  Tldraw,
  getSnapshot,
  loadSnapshot,
  parseTldrawJsonFile,
  inlineBase64AssetStore,
  defaultShapeUtils,
  defaultBindingUtils,
  atom,
  type Editor,
  type TLEditorSnapshot,
  type TLUserStore,
} from 'tldraw'
import { createAlephAssetStore } from '../../../utils/aleph-asset-store'
import { useSync } from '@tldraw/sync'
import type { RemoteTLStoreWithStatus } from '@tldraw/sync'
import { createUserId } from '@tldraw/tlschema'
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
import { GenealogyNodeShapeUtil } from './shapes/GenealogyNodeShape'

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
  GenealogyNodeShapeUtil,
]

export interface TldrawWrapperHandle {
  importTldrJson: (json: string) => void
}

export interface TldrawWrapperUserInfo {
  id: string
  name: string
  color: string
}

export interface TldrawWrapperProps {
  snapshot?: TLEditorSnapshot
  readOnly?: boolean
  campaignId?: string
  darkMode?: boolean
  syncUri?: string
  userInfo?: TldrawWrapperUserInfo
  onChange?: (snapshot: TLEditorSnapshot) => void
  onEditorReady?: (editor: Editor) => void
  onSyncStatusChange?: (status: RemoteTLStoreWithStatus['status']) => void
  onNativeDrop?: (event: DragEvent, editor: Editor) => void
  handleRef?: React.Ref<TldrawWrapperHandle>
}

// Shared mount/drag logic extracted to avoid duplication between sync and snapshot modes
function useTldrawMount({
  readOnly,
  darkMode,
  campaignId,
  onChange,
  onEditorReady,
  isSyncMode,
  editorRef,
}: {
  readOnly?: boolean
  darkMode?: boolean
  campaignId?: string
  onChange?: (snapshot: TLEditorSnapshot) => void
  onEditorReady?: (editor: Editor) => void
  isSyncMode: boolean
  editorRef: React.MutableRefObject<Editor | null>
}) {
  return useCallback(
    (editor: Editor) => {
      editorRef.current = editor
      if (readOnly && !isSyncMode) {
        editor.setCurrentTool('hand')
        editor.updateInstanceState({ isReadonly: true })
      }
      if (darkMode) {
        editor.user.updateUserPreferences({ colorScheme: 'dark' })
      }
      onEditorReady?.(editor)
      if (campaignId) {
        setTimeout(() => {
          import('../../../utils/diagram-hydration').then(({ hydrateEntityShapes }) => {
            hydrateEntityShapes(editor, campaignId).catch(console.error)
          })
        }, 0)
      }
      if (!isSyncMode) {
        editor.store.listen(
          () => {
            if (!readOnly && onChange) onChange(getSnapshot(editor.store))
          },
          { scope: 'document', source: 'user' },
        )
      }
    },
    [readOnly, darkMode, campaignId, onChange, onEditorReady, isSyncMode, editorRef],
  )
}

// Sync mode: useSync is only called when multiplayer is actually active.
// Keeping it in a separate component ensures the hook is never invoked in
// snapshot mode, which prevents tldraw v5 from spamming WebSocket reconnects
// against ws://unused.
function TldrawWrapperSync({
  readOnly,
  campaignId,
  darkMode,
  syncUri,
  userInfo,
  onChange,
  onEditorReady,
  onSyncStatusChange,
  assetStore,
  allShapeUtils,
  allBindingUtils,
}: Pick<
  TldrawWrapperProps,
  | 'readOnly'
  | 'campaignId'
  | 'darkMode'
  | 'syncUri'
  | 'userInfo'
  | 'onChange'
  | 'onEditorReady'
  | 'onSyncStatusChange'
> & {
  assetStore: ReturnType<typeof createAlephAssetStore> | typeof inlineBase64AssetStore
  allShapeUtils: typeof SHAPE_UTILS
  allBindingUtils: typeof defaultBindingUtils
}) {
  const editorRef = useRef<Editor | null>(null)

  const userStore = useMemo<TLUserStore | undefined>(() => {
    if (!userInfo) return undefined
    const currentUser = atom('currentUser', {
      id: createUserId(userInfo.id),
      typeName: 'user' as const,
      name: userInfo.name,
      color: userInfo.color,
      imageUrl: '',
      meta: {},
    })
    return { currentUser }
  }, [userInfo])

  const syncStore = useSync({
    uri: syncUri!,
    assets: assetStore,
    users: userStore,
    shapeUtils: allShapeUtils,
    bindingUtils: allBindingUtils,
  })

  const lastSyncStatus = useRef<RemoteTLStoreWithStatus['status'] | null>(null)
  useEffect(() => {
    if (!onSyncStatusChange) return
    const status = syncStore.status
    if (status !== lastSyncStatus.current) {
      lastSyncStatus.current = status
      onSyncStatusChange(status)
    }
  }, [syncStore.status, onSyncStatusChange])

  const handleMount = useTldrawMount({
    readOnly,
    darkMode,
    campaignId,
    onChange,
    onEditorReady,
    isSyncMode: true,
    editorRef,
  })

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  if (syncStore.status === 'loading') {
    return <div className="tldraw-wrapper flex items-center justify-center">Connecting...</div>
  }
  if (syncStore.status === 'error') {
    return null
  }
  return (
    <div className="tldraw-wrapper" onDragOver={handleDragOver}>
      <Tldraw
        store={syncStore}
        shapeUtils={SHAPE_UTILS}
        onMount={handleMount}
        hideUi={readOnly}
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
      />
    </div>
  )
}

export function TldrawWrapper({
  snapshot,
  readOnly,
  campaignId,
  darkMode,
  syncUri,
  userInfo,
  onChange,
  onEditorReady,
  onSyncStatusChange,
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

  const assetStore = useMemo(
    () => (campaignId ? createAlephAssetStore(campaignId) : inlineBase64AssetStore),
    [campaignId],
  )
  const allShapeUtils = useMemo(() => [...defaultShapeUtils, ...SHAPE_UTILS], [])
  const allBindingUtils = useMemo(() => [...defaultBindingUtils], [])

  void onNativeDrop

  // Sync mode: delegate to TldrawWrapperSync which is the only place useSync is called.
  // This prevents tldraw v5 from opening WebSocket connections in snapshot mode.
  if (syncUri && userInfo) {
    return (
      <TldrawWrapperSync
        readOnly={readOnly}
        campaignId={campaignId}
        darkMode={darkMode}
        syncUri={syncUri}
        userInfo={userInfo}
        onChange={onChange}
        onEditorReady={onEditorReady}
        onSyncStatusChange={onSyncStatusChange}
        assetStore={assetStore}
        allShapeUtils={allShapeUtils}
        allBindingUtils={allBindingUtils}
      />
    )
  }

  // Snapshot mode: no WebSocket, no useSync
  const handleMount = useTldrawMount({
    readOnly,
    darkMode,
    campaignId,
    onChange,
    onEditorReady,
    isSyncMode: false,
    editorRef,
  })

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  return (
    <div className="tldraw-wrapper" onDragOver={handleDragOver}>
      <Tldraw
        snapshot={snapshot}
        shapeUtils={SHAPE_UTILS}
        assets={assetStore}
        onMount={handleMount}
        hideUi={readOnly}
        licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
      />
    </div>
  )
}
