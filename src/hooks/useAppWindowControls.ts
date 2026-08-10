import { useCallback, useRef } from 'react'
import type { MutableRefObject } from 'react'
import {
  applyMainWindowSizeConstraints,
  getMainWindowMinWidth,
  useMainWindowSizeConstraints,
} from './useMainWindowSizeConstraints'
import { useViewMode, type ViewMode } from './useViewMode'
import { useZoom } from './useZoom'
import { useBuildNumber } from './useBuildNumber'
import type { useLayoutPanels } from './useLayoutPanels'
import type { NotePdfExportSource } from '../utils/notePdfExport'
import { isWindows } from '../utils/platform'

type FindInNoteHandler = (options?: { replace?: boolean }) => void
type PdfExportHandler = (source?: NotePdfExportSource) => void
type WindowConstraintUpdater = (
  nextSidebarVisible: boolean,
  nextNoteListVisible: boolean,
  nextRightPanelCollapsed?: boolean,
) => void

interface UseAppWindowControlsParams {
  layout: ReturnType<typeof useLayoutPanels>
}

interface AppWindowActionRefs {
  backlinksToggleRef: MutableRefObject<() => void>
  findInNoteRef: MutableRefObject<FindInNoteHandler | null>
  pdfExportRef: MutableRefObject<PdfExportHandler | null>
  rawToggleRef: MutableRefObject<() => void>
  tableOfContentsToggleRef: MutableRefObject<() => void>
}

interface AppWindowControls {
  backlinksToggleRef: MutableRefObject<() => void>
  buildNumber: string | undefined
  findInNoteRef: MutableRefObject<FindInNoteHandler | null>
  handleCollapseSidebar: () => void
  handleSetViewMode: (mode: ViewMode) => void
  handleToggleRightPanel: () => void
  noteListVisible: boolean
  pdfExportRef: MutableRefObject<PdfExportHandler | null>
  rawToggleRef: MutableRefObject<() => void>
  sidebarVisible: boolean
  tableOfContentsToggleRef: MutableRefObject<() => void>
  zoom: ReturnType<typeof useZoom>
}

function useAppWindowActionRefs(): AppWindowActionRefs {
  return {
    backlinksToggleRef: useRef<() => void>(() => { /* Initialized before the action is exposed. */ }),
    findInNoteRef: useRef<FindInNoteHandler | null>(null),
    pdfExportRef: useRef<PdfExportHandler | null>(null),
    rawToggleRef: useRef<() => void>(() => { /* Initialized before the action is exposed. */ }),
    tableOfContentsToggleRef: useRef<() => void>(() => { /* Initialized before the action is exposed. */ }),
  }
}

function useMainWindowConstraintUpdater(
  layout: ReturnType<typeof useLayoutPanels>,
): WindowConstraintUpdater {
  return useCallback((
    nextSidebarVisible: boolean,
    nextNoteListVisible: boolean,
    nextRightPanelCollapsed: boolean = layout.rightPanelCollapsed,
  ) => {
    const minWidth = getMainWindowMinWidth({
      sidebarVisible: nextSidebarVisible,
      noteListVisible: nextNoteListVisible,
      rightPanelCollapsed: nextRightPanelCollapsed,
      sidebarWidth: layout.sidebarWidth,
      noteListWidth: layout.noteListWidth,
      rightPanelWidth: layout.rightPanelWidth,
    })

    void applyMainWindowSizeConstraints(minWidth, { growToFit: !isWindows() })
      .catch((err: unknown) => { console.warn('[window] Size constraints failed:', err); })
  }, [
    layout.rightPanelCollapsed,
    layout.rightPanelWidth,
    layout.noteListWidth,
    layout.sidebarWidth,
  ])
}

export function useAppWindowControls({
  layout,
}: UseAppWindowControlsParams): AppWindowControls {
  const {
    backlinksToggleRef,
    findInNoteRef,
    pdfExportRef,
    rawToggleRef,
    tableOfContentsToggleRef,
  } = useAppWindowActionRefs()

  const { setViewMode, sidebarVisible, noteListVisible } = useViewMode()
  const zoom = useZoom()
  const buildNumber = useBuildNumber()
  const updateMainWindowConstraints = useMainWindowConstraintUpdater(layout)

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    updateMainWindowConstraints(mode === 'all', mode !== 'editor-only')
  }, [setViewMode, updateMainWindowConstraints])

  const handleCollapseSidebar = useCallback(() => {
    handleSetViewMode('editor-list')
  }, [handleSetViewMode])

  const handleToggleRightPanel = useCallback(() => {
    const nextRightPanelCollapsed = !layout.rightPanelCollapsed
    layout.setRightPanelCollapsed(nextRightPanelCollapsed)
    updateMainWindowConstraints(sidebarVisible, noteListVisible, nextRightPanelCollapsed)
  }, [
    layout,
    noteListVisible,
    sidebarVisible,
    updateMainWindowConstraints,
  ])

  useMainWindowSizeConstraints({
    enabled: true,
    sidebarVisible,
    noteListVisible,
    rightPanelCollapsed: layout.rightPanelCollapsed,
    sidebarWidth: layout.sidebarWidth,
    noteListWidth: layout.noteListWidth,
    rightPanelWidth: layout.rightPanelWidth,
  })

  return {
    backlinksToggleRef,
    buildNumber,
    findInNoteRef,
    handleCollapseSidebar,
    handleSetViewMode,
    handleToggleRightPanel,
    noteListVisible,
    pdfExportRef,
    rawToggleRef,
    sidebarVisible,
    tableOfContentsToggleRef,
    zoom,
  }
}
