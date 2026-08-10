import {
  APP_COMMAND_IDS,
  formatShortcutDisplay,
  getAppCommandShortcutDisplay,
} from '../appCommandCatalog'
import { buildEditorFindCommands } from './editorFindCommands'
import { translate, type AppLocale } from '../../lib/i18n'
import type { ImmediateCreateOptions } from '../useNoteCreation'
import type { CommandAction } from './types'
import {
  RICH_EDITOR_BLOCK_TYPE_DEFINITIONS,
  richEditorBlockTypeName,
  type RichEditorBlockTypeDefinition,
} from '../../utils/richEditorBlockTypes'

interface NoteCommandsConfig {
  hasActiveNote: boolean
  activeTabPath: string | null
  activeFileKind?: 'markdown' | 'text' | 'binary'
  onCreateNote: (options?: ImmediateCreateOptions) => void
  currentFolderCreateOptions?: ImmediateCreateOptions
  onSave: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  undoLabel?: string | null
  redoLabel?: string | null
  onFindInNote?: () => void
  onReplaceInNote?: () => void
  onPastePlainText: () => void
  onDeleteNote: (path: string) => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  onTurnCurrentBlockInto?: (target: RichEditorBlockTypeDefinition) => void
  onOpenInNewWindow?: () => void
  onRevealActiveFile?: (path: string) => void
  onCopyActiveFilePath?: (path: string) => void
  onCopyActiveDeepLink?: (path: string) => void
  onOpenActiveFileExternal?: (path: string) => void
  locale?: AppLocale
  onExportNoteAsPdf?: () => void
}

interface NoteCommandConfig {
  id: string
  label: string
  keywords: string[]
  enabled: boolean
  execute?: () => void
  shortcut?: string
  path?: string | null
  run?: (path: string) => void
}

function createNoteCommand(config: NoteCommandConfig): CommandAction {
  return {
    id: config.id,
    label: config.label,
    group: 'Note',
    shortcut: config.shortcut,
    keywords: config.keywords,
    enabled: config.enabled,
    execute: () => {
      if (config.path && config.run) {
        config.run(config.path)
        return
      }
      config.execute?.()
    },
  }
}

function buildCurrentFolderNoteCommand(config: NoteCommandsConfig): CommandAction {
  return createNoteCommand({
    id: 'create-note-current-folder',
    label: 'Create New Note in Current Folder',
    keywords: ['new', 'create', 'add', 'folder', 'current'],
    enabled: config.currentFolderCreateOptions !== undefined,
    execute: () => config.onCreateNote(config.currentFolderCreateOptions),
  })
}

function buildCoreNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'create-note',
      label: 'New Note',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileNewNote),
      keywords: ['new', 'create', 'add'],
      enabled: true,
      execute: config.onCreateNote,
    }),
    createNoteCommand({
      id: 'create-sheet',
      label: 'New Sheet',
      keywords: ['new', 'create', 'add', 'sheet', 'spreadsheet', 'table', 'csv'],
      enabled: true,
      execute: () => config.onCreateNote({ creationPath: 'cmd_sheet', format: 'sheet' }),
    }),
    buildCurrentFolderNoteCommand(config),
    createNoteCommand({
      id: 'save-note',
      label: 'Save Note',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.fileSave),
      keywords: ['write'],
      enabled: config.hasActiveNote,
      execute: config.onSave,
    }),
    ...buildHistoryNoteCommands(config),
    createNoteCommand({
      id: 'paste-plain-text',
      label: 'Paste without formatting',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.editPastePlainText),
      keywords: ['paste', 'plain', 'formatting', 'clipboard', 'match style'],
      enabled: true,
      execute: config.onPastePlainText,
    }),
    ...buildEditorFindCommands(config),
  ]
}

function historyCommandLabel(action: string, label?: string | null): string {
  return [action, label].filter(Boolean).join(' ')
}

function buildHistoryNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'undo-action',
      label: historyCommandLabel('Undo', config.undoLabel),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.editUndo),
      keywords: ['undo', 'revert', 'history'],
      enabled: Boolean(config.canUndo && config.onUndo),
      execute: config.onUndo,
    }),
    createNoteCommand({
      id: 'redo-action',
      label: historyCommandLabel('Redo', config.redoLabel),
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.editRedo),
      keywords: ['redo', 'repeat', 'history'],
      enabled: Boolean(config.canRedo && config.onRedo),
      execute: config.onRedo,
    }),
  ]
}

function buildPathNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return buildDestructiveNoteCommands(config)
}

function buildDestructiveNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'delete-note',
      label: 'Delete Note',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteDelete),
      keywords: ['delete', 'remove'],
      enabled: config.hasActiveNote,
      path: config.activeTabPath,
      run: config.onDeleteNote,
    }),
  ]
}

function buildOptionalNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildFileActionCommands(config),
    ...buildRetargetingCommands(config),
    ...buildPresentationCommands(config),
  ]
}

function buildRetargetingCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'move-note-to-folder',
      label: 'Move Note to Folder…',
      keywords: ['folder', 'move', 'retarget', 'organize'],
      enabled: config.hasActiveNote && !!config.onMoveNoteToFolder && !!config.canMoveNoteToFolder,
      execute: () => config.onMoveNoteToFolder?.(),
    }),
  ]
}

function buildFocusedBlockTypeCommands(config: NoteCommandsConfig): CommandAction[] {
  const locale = config.locale ?? 'en'
  const commandEnabled = config.hasActiveNote
    && (config.activeFileKind ?? 'markdown') === 'markdown'
    && !!config.onTurnCurrentBlockInto

  return RICH_EDITOR_BLOCK_TYPE_DEFINITIONS.map((target) => createNoteCommand({
    id: `turn-current-block-into-${target.key}`,
    label: translate(locale, 'command.note.turnCurrentBlockInto', {
      type: richEditorBlockTypeName(locale, target),
    }),
    keywords: [
      'block',
      'convert',
      'current',
      'editor',
      'turn into',
      target.key,
      target.name.toLowerCase(),
      target.type.toLowerCase(),
    ],
    enabled: commandEnabled,
    shortcut: target.key === 'code-block'
      ? formatShortcutDisplay({ display: '⌘⇧`' })
      : undefined,
    execute: () => config.onTurnCurrentBlockInto?.(target),
  }))
}

interface ActivePathCommandConfig {
  enabled: boolean
  id: string
  keywords: string[]
  label: string
  run: (path: string) => void
}

function buildActivePathCommand(config: NoteCommandsConfig, command: ActivePathCommandConfig): CommandAction {
  return createNoteCommand({
    id: command.id,
    label: command.label,
    keywords: command.keywords,
    enabled: config.hasActiveNote && command.enabled,
    path: config.activeTabPath,
    run: command.run,
  })
}

function buildRevealActiveFileCommand(config: NoteCommandsConfig): CommandAction {
  return buildActivePathCommand(config, {
    id: 'reveal-active-file',
    label: 'Reveal in Finder',
    keywords: ['file', 'folder', 'finder', 'reveal', 'show', 'filesystem'],
    enabled: !!config.onRevealActiveFile,
    run: (path) => config.onRevealActiveFile?.(path),
  })
}

function buildCopyActiveFilePathCommand(config: NoteCommandsConfig): CommandAction {
  return buildActivePathCommand(config, {
    id: 'copy-active-file-path',
    label: 'Copy File Path',
    keywords: ['file', 'path', 'copy', 'clipboard', 'filesystem'],
    enabled: !!config.onCopyActiveFilePath,
    run: (path) => config.onCopyActiveFilePath?.(path),
  })
}

function buildCopyActiveDeepLinkCommand(config: NoteCommandsConfig): CommandAction {
  return buildActivePathCommand(config, {
    id: 'copy-active-deep-link',
    label: 'Copy deep link to current item',
    keywords: ['deeplink', 'deep link', 'url', 'link', 'copy', 'clipboard'],
    enabled: !!config.onCopyActiveDeepLink,
    run: (path) => config.onCopyActiveDeepLink?.(path),
  })
}

function buildExportNotePdfCommand(config: NoteCommandsConfig): CommandAction {
  return createNoteCommand({
    id: 'export-note-pdf',
    label: translate(config.locale ?? 'en', 'editor.toolbar.exportPdf'),
    keywords: ['export', 'pdf', 'print', 'share'],
    enabled: config.hasActiveNote && (config.activeFileKind ?? 'markdown') === 'markdown' && !!config.onExportNoteAsPdf,
    execute: () => config.onExportNoteAsPdf?.(),
  })
}

function buildOpenActiveFileExternalCommand(config: NoteCommandsConfig): CommandAction {
  return buildActivePathCommand(config, {
    id: 'open-active-file-external',
    label: 'Open in Default App',
    keywords: ['file', 'open', 'external', 'default', 'attachment'],
    enabled: (config.activeFileKind ?? 'markdown') !== 'markdown' && !!config.onOpenActiveFileExternal,
    run: (path) => config.onOpenActiveFileExternal?.(path),
  })
}

function buildFileActionCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    buildRevealActiveFileCommand(config),
    buildCopyActiveFilePathCommand(config),
    buildCopyActiveDeepLinkCommand(config),
    buildExportNotePdfCommand(config),
    buildOpenActiveFileExternalCommand(config),
  ]
}

function buildPresentationCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    createNoteCommand({
      id: 'open-in-new-window',
      label: 'Open in New Window',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.noteOpenInNewWindow),
      keywords: ['window', 'new', 'detach', 'pop', 'external', 'separate'],
      enabled: config.hasActiveNote,
      execute: () => config.onOpenInNewWindow?.(),
    }),
  ]
}

export function buildNoteCommands(config: NoteCommandsConfig): CommandAction[] {
  return [
    ...buildCoreNoteCommands(config),
    ...buildPathNoteCommands(config),
    ...buildFocusedBlockTypeCommands(config),
    ...buildOptionalNoteCommands(config),
  ]
}
