import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import type { CommandAction } from './types'
import type { ViewMode } from '../useViewMode'
import type { NoteWidthMode } from '../../types'
import { DEFAULT_NOTE_WIDTH_MODE } from '../../utils/noteWidth'

const NOTE_WIDTH_COMMAND_LABELS: Record<NoteWidthMode, string> = {
  normal: 'Use Normal Note Width',
  wide: 'Use Wide Note Width',
}

const DEFAULT_NOTE_WIDTH_COMMAND_LABELS: Record<NoteWidthMode, string> = {
  normal: 'Use Normal Note Width by Default',
  wide: 'Use Wide Note Width by Default',
}

const noop = () => {}

interface ViewCommandsConfig {
  hasActiveNote: boolean
  onSetViewMode: (mode: ViewMode) => void
  onToggleBacklinks: () => void
  onToggleRawEditor?: () => void
  noteWidth?: NoteWidthMode
  defaultNoteWidth?: NoteWidthMode
  onSetNoteWidth?: (mode: NoteWidthMode) => void
  onSetDefaultNoteWidth?: (mode: NoteWidthMode) => void
  onToggleTableOfContents?: () => void
  zoomLevel: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

function buildSetNoteWidthCommand(
  mode: NoteWidthMode,
  activeMode: NoteWidthMode,
  hasActiveNote: boolean,
  onSetNoteWidth?: (mode: NoteWidthMode) => void,
): CommandAction {
  return {
    id: `set-note-width-${mode}`,
    label: Reflect.get(NOTE_WIDTH_COMMAND_LABELS, mode) as string,
    group: 'View',
    keywords: ['layout', 'note', 'column', 'width', mode, 'reading'],
    enabled: hasActiveNote && Boolean(onSetNoteWidth) && activeMode !== mode,
    execute: onSetNoteWidth ? () => onSetNoteWidth(mode) : noop,
  }
}

function buildSetDefaultNoteWidthCommand(
  mode: NoteWidthMode,
  defaultMode: NoteWidthMode,
  onSetDefaultNoteWidth?: (mode: NoteWidthMode) => void,
): CommandAction {
  return {
    id: `set-default-note-width-${mode}`,
    label: Reflect.get(DEFAULT_NOTE_WIDTH_COMMAND_LABELS, mode) as string,
    group: 'View',
    keywords: ['layout', 'note', 'column', 'width', mode, 'default', 'reading'],
    enabled: Boolean(onSetDefaultNoteWidth) && defaultMode !== mode,
    execute: onSetDefaultNoteWidth ? () => onSetDefaultNoteWidth(mode) : noop,
  }
}

function buildToggleTableOfContentsCommand(
  hasActiveNote: boolean,
  onToggleTableOfContents?: () => void,
): CommandAction {
  return {
    id: 'toggle-table-of-contents',
    label: 'Toggle Table of Contents',
    group: 'View',
    shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewToggleTableOfContents),
    keywords: ['toc', 'outline', 'headings', 'contents', 'panel'],
    enabled: hasActiveNote && !!onToggleTableOfContents,
    execute: () => onToggleTableOfContents?.(),
  }
}

export function buildViewCommands(config: ViewCommandsConfig): CommandAction[] {
  const {
    hasActiveNote,
    onSetViewMode, onToggleBacklinks, onToggleRawEditor,
    noteWidth = DEFAULT_NOTE_WIDTH_MODE, defaultNoteWidth = DEFAULT_NOTE_WIDTH_MODE,
    onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents,
    zoomLevel, onZoomIn, onZoomOut, onZoomReset,
  } = config

  return [
    { id: 'view-editor', label: 'Editor Only', group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewEditorOnly), keywords: ['layout', 'focus'], enabled: true, execute: () => onSetViewMode('editor-only') },
    { id: 'view-editor-list', label: 'Editor + Note List', group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewEditorList), keywords: ['layout'], enabled: true, execute: () => onSetViewMode('editor-list') },
    { id: 'view-all', label: 'Full Layout', group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewAll), keywords: ['layout', 'sidebar'], enabled: true, execute: () => onSetViewMode('all') },
    { id: 'toggle-raw-editor', label: 'Toggle Raw Editor', group: 'View', keywords: ['raw', 'source', 'markdown', 'frontmatter', 'code', 'textarea'], enabled: hasActiveNote && !!onToggleRawEditor, execute: () => onToggleRawEditor?.() },
    buildSetNoteWidthCommand('normal', noteWidth, hasActiveNote, onSetNoteWidth),
    buildSetNoteWidthCommand('wide', noteWidth, hasActiveNote, onSetNoteWidth),
    buildSetDefaultNoteWidthCommand('normal', defaultNoteWidth, onSetDefaultNoteWidth),
    buildSetDefaultNoteWidthCommand('wide', defaultNoteWidth, onSetDefaultNoteWidth),
    buildToggleTableOfContentsCommand(hasActiveNote, onToggleTableOfContents),
    { id: 'toggle-backlinks', label: 'Toggle Backlinks', group: 'View', keywords: ['backlinks', 'references', 'links', 'mentions', 'incoming'], enabled: hasActiveNote, execute: onToggleBacklinks },
    { id: 'zoom-in', label: `Zoom In (${zoomLevel}%)`, group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewZoomIn), keywords: ['zoom', 'bigger', 'larger', 'scale'], enabled: zoomLevel < 150, execute: onZoomIn },
    { id: 'zoom-out', label: `Zoom Out (${zoomLevel}%)`, group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewZoomOut), keywords: ['zoom', 'smaller', 'scale'], enabled: zoomLevel > 80, execute: onZoomOut },
    { id: 'zoom-reset', label: 'Reset Zoom', group: 'View', shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.viewZoomReset), keywords: ['zoom', 'actual', 'default', '100'], enabled: zoomLevel !== 100, execute: onZoomReset },
  ]
}
