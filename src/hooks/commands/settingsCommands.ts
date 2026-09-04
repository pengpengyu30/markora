import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import type { CommandAction } from './types'
import { requestGitignoredVisibilityToggle } from '../../lib/gitignoredVisibilityEvents'
import {
  APP_LOCALES,
  SYSTEM_UI_LANGUAGE,
  createTranslator,
  localeDisplayName,
  localeSearchKeywords,
  type AppLocale,
  type UiLanguagePreference,
} from '../../lib/i18n'
import type { ThemeMode } from '../../lib/themeMode'
import {
  EDITOR_THEME_CATALOG,
  type EditorThemeId,
} from '../../editorThemes/editorThemeCatalog'

interface SettingsCommandsConfig {
  vaultCount?: number
  isGettingStartedHidden?: boolean
  onOpenSettings: () => void
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onRemoveActiveVault?: () => void
  onRestoreGettingStarted?: () => void
  onReloadVault?: () => void
  onRepairVault?: () => void
  onRestoreDeletedNote?: () => void
  onToggleGitignoredFilesVisibility?: () => void
  locale?: AppLocale
  systemLocale?: AppLocale
  selectedUiLanguage?: UiLanguagePreference
  onSetUiLanguage?: (language: UiLanguagePreference) => void
  onSetThemeMode?: (mode: ThemeMode) => void
  onSetEditorTheme?: (themeId: EditorThemeId) => void | Promise<unknown>
}

function commandKeywords(raw: string): string[] {
  return raw.split(/\s+/).filter(Boolean)
}

function buildPrimarySettingsCommands({
  locale = 'en',
  onOpenSettings,
}: Pick<SettingsCommandsConfig, 'locale' | 'onOpenSettings'>): CommandAction[] {
  const t = createTranslator(locale)
  return [
    {
      id: 'open-settings',
      label: t('command.openSettings'),
      group: 'Settings',
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.appSettings),
      keywords: commandKeywords(t('command.openSettings.keywords')),
      enabled: true,
      execute: onOpenSettings,
    },
    {
      id: 'open-h1-auto-rename-setting',
      label: t('command.openH1Setting'),
      group: 'Settings',
      keywords: ['h1', 'title', 'filename', 'rename', 'auto', 'untitled', 'sync', 'preference'],
      enabled: true,
      execute: onOpenSettings,
    },
  ]
}

function buildLanguageCommands({
  locale = 'en',
  systemLocale = locale,
  selectedUiLanguage = SYSTEM_UI_LANGUAGE,
  onOpenSettings,
  onSetUiLanguage,
}: Pick<SettingsCommandsConfig, 'locale' | 'systemLocale' | 'selectedUiLanguage' | 'onOpenSettings' | 'onSetUiLanguage'>): CommandAction[] {
  const t = createTranslator(locale)
  const canSwitchLanguage = !!onSetUiLanguage

  return [
    {
      id: 'open-language-settings',
      label: t('command.openLanguageSettings'),
      group: 'Settings',
      keywords: commandKeywords(t('command.openLanguageSettings.keywords')),
      enabled: true,
      execute: onOpenSettings,
    },
    {
      id: 'use-system-language',
      label: `${t('command.useSystemLanguage')} (${localeDisplayName(systemLocale, locale)})`,
      group: 'Settings',
      keywords: ['language', 'locale', 'system', 'auto'],
      enabled: canSwitchLanguage && selectedUiLanguage !== SYSTEM_UI_LANGUAGE,
      execute: () => onSetUiLanguage?.(SYSTEM_UI_LANGUAGE),
    },
    ...APP_LOCALES.map((targetLocale) => ({
      id: `switch-language-${targetLocale.toLowerCase()}`,
      label: t('command.switchLanguage', {
        language: localeDisplayName(targetLocale, locale),
      }),
      group: 'Settings' as const,
      keywords: [
        'language',
        'locale',
        ...localeSearchKeywords(targetLocale),
      ],
      enabled: canSwitchLanguage && selectedUiLanguage !== targetLocale,
      execute: () => onSetUiLanguage?.(targetLocale),
    })),
  ]
}

function buildThemeCommands({
  locale = 'en',
  onSetThemeMode,
}: Pick<SettingsCommandsConfig, 'locale' | 'onSetThemeMode'>): CommandAction[] {
  const t = createTranslator(locale)
  const canSetThemeMode = !!onSetThemeMode

  return [
    {
      id: 'use-light-mode',
      label: t('command.settings.useLightMode'),
      group: 'Settings',
      keywords: ['theme', 'appearance', 'light', 'light mode', 'day'],
      enabled: canSetThemeMode,
      execute: () => onSetThemeMode?.('light'),
    },
    {
      id: 'use-dark-mode',
      label: t('command.settings.useDarkMode'),
      group: 'Settings',
      keywords: ['theme', 'appearance', 'dark', 'dark mode', 'night'],
      enabled: canSetThemeMode,
      execute: () => onSetThemeMode?.('dark'),
    },
    {
      id: 'use-system-theme-mode',
      label: t('command.settings.useSystemTheme'),
      group: 'Settings',
      keywords: ['theme', 'appearance', 'system', 'system theme', 'auto'],
      enabled: canSetThemeMode,
      execute: () => onSetThemeMode?.('system'),
    },
  ]
}

const EDITOR_THEME_COMMANDS = [
  { id: 'set-editor-theme-default', themeId: 'default', labelKey: 'command.settings.editorThemeDefault', descriptionKey: 'editorTheme.default.description' },
  { id: 'set-editor-theme-code', themeId: 'code', labelKey: 'command.settings.editorThemeCode', descriptionKey: 'editorTheme.code.description' },
  { id: 'set-editor-theme-editorial', themeId: 'editorial', labelKey: 'command.settings.editorThemeEditorial', descriptionKey: 'editorTheme.editorial.description' },
  { id: 'set-editor-theme-canvas', themeId: 'canvas', labelKey: 'command.settings.editorThemeCanvas', descriptionKey: 'editorTheme.canvas.description' },
] as const

function buildEditorThemeKeywords(
  themeId: EditorThemeId,
  description: string,
  label: string,
): string[] {
  const theme = EDITOR_THEME_CATALOG.find((item) => item.id === themeId)
  return Array.from(new Set([
    'editor theme',
    theme?.displayName.toLowerCase() ?? themeId,
    'theme',
    ...commandKeywords(label.toLowerCase()),
    ...commandKeywords(description.toLowerCase()),
  ]))
}

function buildEditorThemeCommands({
  locale = 'en',
  onSetEditorTheme,
}: Pick<SettingsCommandsConfig, 'locale' | 'onSetEditorTheme'>): CommandAction[] {
  const t = createTranslator(locale)
  const canSetEditorTheme = !!onSetEditorTheme
  const commands = EDITOR_THEME_COMMANDS.map(({ id, themeId, labelKey, descriptionKey }) => {
    const label = t(labelKey)
    return {
      id,
      label,
      group: 'Settings' as const,
      keywords: buildEditorThemeKeywords(themeId, t(descriptionKey), t('settings.editorTheme.label')),
      enabled: canSetEditorTheme,
      execute: () => { void onSetEditorTheme?.(themeId) },
    }
  })
  return [
    ...commands,
    {
      id: 'reset-editor-theme',
      label: t('command.settings.resetEditorTheme'),
      group: 'Settings' as const,
      keywords: buildEditorThemeKeywords('default', t('settings.editorTheme.label'), t('command.settings.resetEditorTheme')),
      enabled: canSetEditorTheme,
      execute: () => { void onSetEditorTheme?.('default') },
    },
  ]
}

function buildVaultSettingsCommands({
  vaultCount,
  isGettingStartedHidden,
  onOpenVault,
  onCreateEmptyVault,
  onRemoveActiveVault,
  onRestoreGettingStarted,
}: Pick<SettingsCommandsConfig, 'vaultCount' | 'isGettingStartedHidden' | 'onOpenVault' | 'onCreateEmptyVault' | 'onRemoveActiveVault' | 'onRestoreGettingStarted'>): CommandAction[] {
  return [
    { id: 'create-empty-vault', label: 'Create Empty Project…', group: 'Settings', keywords: ['project', 'vault', 'create', 'new', 'empty', 'folder'], enabled: !!onCreateEmptyVault, execute: () => onCreateEmptyVault?.() },
    { id: 'open-vault', label: 'Open Project…', group: 'Settings', keywords: ['project', 'vault', 'folder', 'switch', 'open', 'workspace'], enabled: true, execute: () => onOpenVault?.() },
    { id: 'remove-vault', label: 'Remove Project from List', group: 'Settings', keywords: ['project', 'vault', 'remove', 'disconnect', 'hide'], enabled: (vaultCount ?? 0) > 1 && !!onRemoveActiveVault, execute: () => onRemoveActiveVault?.() },
    { id: 'restore-getting-started', label: 'Restore Getting Started Project', group: 'Settings', keywords: ['project', 'vault', 'restore', 'demo', 'getting started', 'reset'], enabled: !!isGettingStartedHidden && !!onRestoreGettingStarted, execute: () => onRestoreGettingStarted?.() },
  ]
}

function buildMaintenanceCommands({
  onReloadVault,
  onRepairVault,
  onRestoreDeletedNote,
  onToggleGitignoredFilesVisibility,
}: Pick<SettingsCommandsConfig, 'onReloadVault' | 'onRepairVault' | 'onRestoreDeletedNote' | 'onToggleGitignoredFilesVisibility'>): CommandAction[] {
  return [
    {
      id: 'toggle-gitignored-files-visibility',
      label: 'Toggle Gitignored Files Visibility',
      group: 'Settings',
      keywords: ['gitignore', 'ignored', 'files', 'folders', 'visibility', 'hide', 'show', 'generated', 'local'],
      enabled: true,
      execute: onToggleGitignoredFilesVisibility ?? requestGitignoredVisibilityToggle,
    },
    { id: 'reload-vault', label: 'Reload Project', group: 'Settings', keywords: ['project', 'reload', 'refresh', 'rescan', 'sync', 'filesystem', 'cache'], enabled: !!onReloadVault, execute: () => onReloadVault?.() },
    { id: 'repair-vault', label: 'Repair Project', group: 'Settings', keywords: ['project', 'repair', 'fix', 'restore', 'config', 'missing', 'reset', 'flatten', 'structure'], enabled: !!onRepairVault, execute: () => onRepairVault?.() },
    { id: 'restore-deleted-note', label: 'Restore Deleted Note…', group: 'Settings', keywords: ['restore', 'deleted', 'note', 'recover', 'recovery', 'undo'], enabled: !!onRestoreDeletedNote, execute: () => onRestoreDeletedNote?.() },
  ]
}

export function buildSettingsCommands(config: SettingsCommandsConfig): CommandAction[] {
  const {
    vaultCount, isGettingStartedHidden,
    onOpenSettings, onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onReloadVault, onRepairVault, onRestoreDeletedNote, onToggleGitignoredFilesVisibility,
    locale = 'en', systemLocale = locale, selectedUiLanguage = SYSTEM_UI_LANGUAGE, onSetUiLanguage, onSetThemeMode,
    onSetEditorTheme,
  } = config

  return [
    ...buildPrimarySettingsCommands({ locale, onOpenSettings }),
    ...buildThemeCommands({ locale, onSetThemeMode }),
    ...buildEditorThemeCommands({ locale, onSetEditorTheme }),
    ...buildLanguageCommands({
      locale,
      systemLocale,
      selectedUiLanguage,
      onOpenSettings,
      onSetUiLanguage,
    }),
    ...buildVaultSettingsCommands({
      vaultCount,
      isGettingStartedHidden,
      onOpenVault,
      onCreateEmptyVault,
      onRemoveActiveVault,
      onRestoreGettingStarted,
    }),
    ...buildMaintenanceCommands({
      onReloadVault,
      onRepairVault,
      onRestoreDeletedNote,
      onToggleGitignoredFilesVisibility,
    }),
  ]
}
