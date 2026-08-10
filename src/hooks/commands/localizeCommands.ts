import { createTranslator, type AppLocale, type TranslationKey } from '../../lib/i18n'
import type { CommandAction, CommandGroup } from './types'

type Translate = ReturnType<typeof createTranslator>

const GROUP_LABEL_KEYS = {
  Navigation: 'command.group.navigation',
  Note: 'command.group.note',
  View: 'command.group.view',
  Settings: 'command.group.settings',
} satisfies Record<CommandGroup, TranslationKey>

const STATIC_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  'search-notes': 'command.navigation.searchNotes',
  'go-all': 'command.navigation.goAllNotes',
  'go-back': 'command.navigation.goBack',
  'go-forward': 'command.navigation.goForward',
  'rename-folder': 'command.navigation.renameFolder',
  'delete-folder': 'command.navigation.deleteFolder',
  'filter-open': 'command.navigation.showOpenNotes',
  'create-note': 'command.note.newNote',
  'create-note-current-folder': 'command.note.newNoteInCurrentFolder',
  'save-note': 'command.note.saveNote',
  'paste-plain-text': 'command.note.pastePlainText',
  'find-in-note': 'command.note.findInNote',
  'replace-in-note': 'command.note.replaceInNote',
  'delete-note': 'command.note.deleteNote',
  'move-note-to-folder': 'command.note.moveToFolder',
  'copy-active-deep-link': 'command.note.copyDeepLink',
  'export-note-pdf': 'command.note.exportPdf',
  'open-in-new-window': 'command.note.openNewWindow',
  'view-editor': 'command.view.editorOnly',
  'view-editor-list': 'command.view.editorNoteList',
  'view-all': 'command.view.fullLayout',
  'toggle-raw-editor': 'command.view.toggleRaw',
  'set-note-width-normal': 'command.view.noteWidthNormal',
  'set-note-width-wide': 'command.view.noteWidthWide',
  'set-default-note-width-normal': 'command.view.defaultNoteWidthNormal',
  'set-default-note-width-wide': 'command.view.defaultNoteWidthWide',
  'toggle-backlinks': 'command.view.toggleBacklinks',
  'zoom-reset': 'command.view.resetZoom',
  'create-empty-vault': 'command.settings.createEmptyVault',
  'open-vault': 'command.settings.openVault',
  'remove-vault': 'command.settings.removeVault',
  'restore-getting-started': 'command.settings.restoreGettingStarted',
  'reload-vault': 'command.settings.reloadVault',
  'repair-vault': 'command.settings.repairVault',
  'restore-deleted-note': 'command.settings.restoreDeletedNote',
  'use-light-mode': 'command.settings.useLightMode',
  'use-dark-mode': 'command.settings.useDarkMode',
  'use-system-theme-mode': 'command.settings.useSystemTheme',
  'toggle-gitignored-files-visibility': 'command.settings.toggleGitignoredFilesVisibility',
}

function stripKnownPrefix(label: string, prefix: string): string {
  return label.startsWith(prefix) ? label.slice(prefix.length) : label
}

function parenthesizedSuffix(label: string): string | null {
  return label.match(/\(([^)]+)\)$/)?.[1] ?? null
}

function localizeUndoRedoCommand(command: CommandAction, t: Translate): string | null {
  if (command.id === 'undo-action') {
    const action = stripKnownPrefix(command.label, 'Undo ')
    return action && action !== command.label
      ? t('command.note.undoAction', { action })
      : t('command.note.undo')
  }

  if (command.id === 'redo-action') {
    const action = stripKnownPrefix(command.label, 'Redo ')
    return action && action !== command.label
      ? t('command.note.redoAction', { action })
      : t('command.note.redo')
  }

  return null
}

function localizeNoteStateCommand(command: CommandAction, t: Translate): string | null {
  return localizeUndoRedoCommand(command, t)
}

type CommandLocalizer = (command: CommandAction, t: Translate) => string
type NullableCommandLocalizer = (command: CommandAction, t: Translate) => string | null

const VIEW_STATE_LOCALIZERS: readonly [string, CommandLocalizer][] = [
  ['zoom-in', (command, t) =>
    t('command.view.zoomIn', { zoom: parenthesizedSuffix(command.label)?.replace('%', '') ?? '' })],
  ['zoom-out', (command, t) =>
    t('command.view.zoomOut', { zoom: parenthesizedSuffix(command.label)?.replace('%', '') ?? '' })],
]

function localizeViewStateCommand(command: CommandAction, t: Translate): string | null {
  return VIEW_STATE_LOCALIZERS.find(([id]) => id === command.id)?.[1](command, t) ?? null
}

export function localizeCommandGroup(group: CommandGroup, locale: AppLocale = 'en'): string {
  return createTranslator(locale)(Reflect.get(GROUP_LABEL_KEYS, group) as keyof ReturnType<typeof createTranslator> extends never ? never : Parameters<ReturnType<typeof createTranslator>>[0])
}

const DYNAMIC_COMMAND_LOCALIZERS: readonly NullableCommandLocalizer[] = [
  localizeNoteStateCommand,
  localizeViewStateCommand,
]

function localizeDynamicCommand(command: CommandAction, t: Translate): string | null {
  for (const localize of DYNAMIC_COMMAND_LOCALIZERS) {
    const label = localize(command, t)
    if (label) return label
  }
  return null
}

function localizeCommandAction(command: CommandAction, t: Translate): CommandAction {
  const key = STATIC_LABEL_KEYS[command.id]
  const label = key ? t(key) : localizeDynamicCommand(command, t) ?? command.label
  return label === command.label ? command : { ...command, label }
}

export function localizeCommandActions(commands: CommandAction[], locale: AppLocale = 'en'): CommandAction[] {
  const t = createTranslator(locale)
  return commands.map((command) => localizeCommandAction(command, t))
}
