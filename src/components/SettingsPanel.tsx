import { Cube, Monitor, Moon, Sun, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { GitProviderId, Settings } from '../types'
import {
  APP_LOCALES,
  SYSTEM_UI_LANGUAGE,
  createTranslator,
  localeDisplayName,
  resolveEffectiveLocale,
  serializeUiLanguagePreference,
  type AppLocale,
  type UiLanguagePreference,
} from '../lib/i18n'
import {
  applyThemeSelectionToDocument,
  DEFAULT_THEME_MODE,
  readStoredThemeMode,
  type ThemeMode,
  writeStoredThemeMode,
} from '../lib/themeMode'
import { normalizeReleaseChannel, serializeReleaseChannel, type ReleaseChannel } from '../lib/releaseChannel'
import { shouldHideGitignoredFiles } from '../lib/gitignoredVisibility'
import { areGitFeaturesEnabled } from '../lib/gitSettings'
import { areAutomaticUpdateChecksEnabled } from '../lib/automaticUpdateChecks'
import { trackAllNotesVisibilityChanged } from '../lib/productAnalytics'
import { GitSettingsSection } from './GitSettingsSection'
import { PrivacySettingsSection } from './PrivacySettingsSection'
import { SettingsBodyNav } from './SettingsBodyNav'
import {
  SectionHeading,
  SelectControl,
  SettingsGroup,
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from './SettingsControls'
import { SettingsFooter } from './SettingsFooter'
import { VaultContentSettingsSection } from './VaultContentSettingsSection'
import { WorkspaceSettingsSection } from './WorkspaceSettingsSection'
import {
  resolveAllNotesFileVisibility,
  settingsWithAllNotesFileVisibility,
  type AllNotesFileVisibility,
} from '../utils/allNotesFileVisibility'
import { DEFAULT_NOTE_WIDTH_MODE, normalizeNoteWidthMode } from '../utils/noteWidth'
import { DEFAULT_DATE_DISPLAY_FORMAT, normalizeDateDisplayFormat, type DateDisplayFormat } from '../utils/dateDisplay'
import { Button } from './ui/button'
import type { NoteWidthMode } from '../types'
import type { VaultOption } from './status-bar/types'
import { SETTINGS_SECTION_IDS } from './settingsSectionIds'
import { trackSettingsPreferenceChanges, trackTelemetryConsentChange } from './settingsPreferenceTracking'
import { useSettingsPanelAutofocus, useSettingsPanelFocusTrap } from './useSettingsPanelFocus'
import { registerMacosDismissableEscapeSurface } from '../utils/macosDismissableEscapeSurface'

interface SettingsPanelProps {
  open: boolean
  settings: Settings
  initialSectionId?: string | null
  locale?: AppLocale
  systemLocale?: AppLocale
  onSave: (settings: Settings) => void
  vaults?: VaultOption[]
  defaultWorkspacePath?: string | null
  onRemoveVault?: (path: string) => void
  onReorderVaults?: (orderedPaths: string[]) => void
  onSetDefaultWorkspace?: (path: string) => void
  onUpdateWorkspaceIdentity?: (path: string, patch: Partial<VaultOption>) => void
  isGitVault?: boolean
  vaultPath?: string
  onClose: () => void
}

interface SettingsDraft {
  pullInterval: number
  gitFeaturesEnabled: boolean
  gitProvider: GitProviderId
  gitWslDistro: string | null
  autoGitEnabled: boolean
  autoGitIdleThresholdSeconds: number
  autoGitInactiveThresholdSeconds: number
  releaseChannel: ReleaseChannel
  automaticUpdateChecksEnabled: boolean
  themeMode: ThemeMode
  uiLanguage: UiLanguagePreference
  dateDisplayFormat: DateDisplayFormat
  defaultNoteWidth: NoteWidthMode
  initialH1AutoRename: boolean
  hideGitignoredFiles: boolean
  allNotesFileVisibility: AllNotesFileVisibility
  multiWorkspaceEnabled: boolean
  crashReporting: boolean
  analytics: boolean
}

interface SettingsBodyProps {
  t: Translate
  pullInterval: number
  setPullInterval: (value: number) => void
  gitFeaturesEnabled: boolean
  setGitFeaturesEnabled: (value: boolean) => void
  gitProvider: GitProviderId
  setGitProvider: (value: GitProviderId) => void
  gitWslDistro: string | null
  setGitWslDistro: (value: string | null) => void
  isGitVault: boolean
  vaultPath: string
  autoGitEnabled: boolean
  setAutoGitEnabled: (value: boolean) => void
  autoGitIdleThresholdSeconds: number
  setAutoGitIdleThresholdSeconds: (value: number) => void
  autoGitInactiveThresholdSeconds: number
  setAutoGitInactiveThresholdSeconds: (value: number) => void
  releaseChannel: ReleaseChannel
  setReleaseChannel: (value: ReleaseChannel) => void
  automaticUpdateChecksEnabled: boolean
  setAutomaticUpdateChecksEnabled: (value: boolean) => void
  themeMode: ThemeMode
  setThemeMode: (value: ThemeMode) => void
  uiLanguage: UiLanguagePreference
  setUiLanguage: (value: UiLanguagePreference) => void
  dateDisplayFormat: DateDisplayFormat
  setDateDisplayFormat: (value: DateDisplayFormat) => void
  defaultNoteWidth: NoteWidthMode
  setDefaultNoteWidth: (value: NoteWidthMode) => void
  locale: AppLocale
  systemLocale: AppLocale
  initialH1AutoRename: boolean
  setInitialH1AutoRename: (value: boolean) => void
  hideGitignoredFiles: boolean
  setHideGitignoredFiles: (value: boolean) => void
  allNotesFileVisibility: AllNotesFileVisibility
  setAllNotesFileVisibility: (value: AllNotesFileVisibility) => void
  multiWorkspaceEnabled: boolean
  setMultiWorkspaceEnabled: (value: boolean) => void
  vaults: VaultOption[]
  defaultWorkspacePath?: string | null
  onRemoveVault?: (path: string) => void
  onReorderVaults?: (orderedPaths: string[]) => void
  onSetDefaultWorkspace?: (path: string) => void
  onUpdateWorkspaceIdentity?: (path: string, patch: Partial<VaultOption>) => void
  crashReporting: boolean
  setCrashReporting: (value: boolean) => void
  analytics: boolean
  setAnalytics: (value: boolean) => void
}

const PULL_INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30] as const
const DEFAULT_AUTOGIT_IDLE_THRESHOLD_SECONDS = 90
const DEFAULT_AUTOGIT_INACTIVE_THRESHOLD_SECONDS = 30
type Translate = ReturnType<typeof createTranslator>

function isSaveShortcut(event: { ctrlKey: boolean; key: string; metaKey: boolean }): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey)
}

function createSettingsDraft(settings: Settings): SettingsDraft {
  return {
    pullInterval: settings.auto_pull_interval_minutes ?? 5,
    gitFeaturesEnabled: areGitFeaturesEnabled(settings),
    gitProvider: normalizeSettingsGitProvider(settings.git_provider),
    gitWslDistro: settings.git_wsl_distro?.trim() || null,
    autoGitEnabled: settings.autogit_enabled ?? false,
    autoGitIdleThresholdSeconds: sanitizePositiveInteger(
      settings.autogit_idle_threshold_seconds,
      DEFAULT_AUTOGIT_IDLE_THRESHOLD_SECONDS,
    ),
    autoGitInactiveThresholdSeconds: sanitizePositiveInteger(
      settings.autogit_inactive_threshold_seconds,
      DEFAULT_AUTOGIT_INACTIVE_THRESHOLD_SECONDS,
    ),
    releaseChannel: normalizeReleaseChannel(settings.release_channel),
    automaticUpdateChecksEnabled: areAutomaticUpdateChecksEnabled(settings),
    themeMode: resolveSettingsDraftThemeMode(settings.theme_mode),
    uiLanguage: settings.ui_language ?? SYSTEM_UI_LANGUAGE,
    dateDisplayFormat: normalizeDateDisplayFormat(settings.date_display_format) ?? DEFAULT_DATE_DISPLAY_FORMAT,
    defaultNoteWidth: normalizeNoteWidthMode(settings.note_width_mode) ?? DEFAULT_NOTE_WIDTH_MODE,
    initialH1AutoRename: settings.initial_h1_auto_rename_enabled ?? true,
    hideGitignoredFiles: shouldHideGitignoredFiles(settings),
    allNotesFileVisibility: resolveAllNotesFileVisibility(settings),
    multiWorkspaceEnabled: settings.multi_workspace_enabled === true,
    crashReporting: settings.crash_reporting_enabled ?? false,
    analytics: settings.analytics_enabled ?? false,
  }
}

function resolveSettingsDraftThemeMode(themeMode: Settings['theme_mode']): ThemeMode {
  if (themeMode) return themeMode
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE
  return readStoredThemeMode(window.localStorage) ?? DEFAULT_THEME_MODE
}

function resolveTelemetryConsent(settings: Settings, draft: SettingsDraft): boolean | null {
  if (draft.crashReporting || draft.analytics) return true
  return settings.telemetry_consent === null ? null : false
}

function resolveAnonymousId(settings: Settings, draft: SettingsDraft): string | null {
  if (draft.crashReporting || draft.analytics) {
    return settings.anonymous_id ?? crypto.randomUUID()
  }

  return settings.anonymous_id
}

function buildSettingsFromDraft(settings: Settings, draft: SettingsDraft): Settings {
  const nextSettings = {
    auto_pull_interval_minutes: draft.pullInterval,
    git_enabled: draft.gitFeaturesEnabled,
    git_provider: draft.gitProvider === 'native' ? null : draft.gitProvider,
    git_wsl_distro: draft.gitProvider === 'wsl' ? draft.gitWslDistro : null,
    autogit_enabled: draft.autoGitEnabled,
    autogit_idle_threshold_seconds: draft.autoGitIdleThresholdSeconds,
    autogit_inactive_threshold_seconds: draft.autoGitInactiveThresholdSeconds,
    telemetry_consent: resolveTelemetryConsent(settings, draft),
    crash_reporting_enabled: draft.crashReporting,
    analytics_enabled: draft.analytics,
    anonymous_id: resolveAnonymousId(settings, draft),
    release_channel: serializeReleaseChannel(draft.releaseChannel),
    automatic_update_checks_enabled: draft.automaticUpdateChecksEnabled ? null : false,
    theme_mode: draft.themeMode,
    ui_language: serializeUiLanguagePreference(draft.uiLanguage),
    date_display_format: draft.dateDisplayFormat,
    note_width_mode: draft.defaultNoteWidth,
    initial_h1_auto_rename_enabled: draft.initialH1AutoRename,
    hide_gitignored_files: draft.hideGitignoredFiles,
    multi_workspace_enabled: draft.multiWorkspaceEnabled,
  }
  return settingsWithAllNotesFileVisibility(nextSettings, draft.allNotesFileVisibility)
}

function normalizeSettingsGitProvider(value: Settings['git_provider']): GitProviderId {
  return value === 'wsl' ? 'wsl' : 'native'
}

function sanitizePositiveInteger(value: number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 1) return fallback
  return Math.round(value)
}

function applyThemeModeSelection(value: ThemeMode): void {
  const matchMedia = typeof window !== 'undefined' ? window.matchMedia?.bind(window) : undefined
  if (typeof document !== 'undefined') applyThemeSelectionToDocument(document, value, matchMedia)
  if (typeof window !== 'undefined') writeStoredThemeMode(window.localStorage, value)
}

export function SettingsPanel(options: SettingsPanelProps) {
  const { open, settings, initialSectionId = null, locale = 'en', systemLocale = locale, onSave, vaults = [], defaultWorkspacePath = null, onRemoveVault, onReorderVaults, onSetDefaultWorkspace, onUpdateWorkspaceIdentity, isGitVault = true, vaultPath = '', onClose } = options
  if (!open) return null
  const initialDraft = createSettingsDraft(settings)

  return (
    <SettingsPanelInner
      key={JSON.stringify(initialDraft)}
      settings={settings}
      initialDraft={initialDraft}
      initialSectionId={initialSectionId}
      locale={locale}
      systemLocale={systemLocale}
      onSave={onSave}
      vaults={vaults}
      defaultWorkspacePath={defaultWorkspacePath}
      {...{
        onRemoveVault,
        onReorderVaults,
        onSetDefaultWorkspace,
        onUpdateWorkspaceIdentity,
      }}
      isGitVault={isGitVault}
      vaultPath={vaultPath}
      onClose={onClose}
    />
  )
}

type SettingsPanelInnerProps = Omit<
  SettingsPanelProps,
  'open' | 'isGitVault' | 'vaultPath'
> & {
  initialDraft: SettingsDraft
  initialSectionId: string | null
  locale: AppLocale
  systemLocale: AppLocale
  isGitVault: boolean
  vaultPath: string
}

function useSettingsDraftActions(options: Pick<SettingsPanelInnerProps, 'initialDraft' | 'onClose' | 'onSave' | 'settings'>) {
  const { initialDraft, onClose, onSave, settings } = options
  const [draft, setDraft] = useState(initialDraft)
  const updateDraft = useCallback(<Key extends keyof SettingsDraft>(key: Key, value: SettingsDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }, [])
  const handleGitignoredVisibilityChange = useCallback((value: boolean) => {
    updateDraft('hideGitignoredFiles', value)
    onSave({ ...settings, hide_gitignored_files: value })
  }, [onSave, settings, updateDraft])
  const handleAllNotesFileVisibilityChange = useCallback((value: AllNotesFileVisibility) => {
    trackAllNotesVisibilityChanged(draft.allNotesFileVisibility, value)
    updateDraft('allNotesFileVisibility', value)
    onSave(settingsWithAllNotesFileVisibility(settings, value))
  }, [draft.allNotesFileVisibility, onSave, settings, updateDraft])
  const handleThemeModeChange = useCallback((value: ThemeMode) => {
    updateDraft('themeMode', value)
    applyThemeModeSelection(value)
    onSave({ ...settings, theme_mode: value })
  }, [onSave, settings, updateDraft])
  const handleSave = useCallback(() => {
    trackTelemetryConsentChange(settings.analytics_enabled === true, draft.analytics)
    trackSettingsPreferenceChanges(settings, draft)
    onSave(buildSettingsFromDraft(settings, draft))
    onClose()
  }, [draft, onClose, onSave, settings])
  return { draft, updateDraft, handleGitignoredVisibilityChange, handleAllNotesFileVisibilityChange, handleThemeModeChange, handleSave }
}

function useSettingsPanelInteractions(options: {
  backdropRef: React.RefObject<HTMLDivElement | null>
  handleSave: () => void
  initialSectionId?: string | null
  onClose: () => void
  panelRef: React.RefObject<HTMLDivElement | null>
}): void {
  const { backdropRef, handleSave, initialSectionId, onClose, panelRef } = options
  useEffect(registerMacosDismissableEscapeSurface, [])
  useSettingsPanelAutofocus(panelRef)
  useSettingsPanelFocusTrap(panelRef)
  useEffect(() => {
    if (!initialSectionId) return
    const timer = window.setTimeout(() => document.getElementById(initialSectionId)?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(timer)
  }, [initialSectionId])
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else if (isSaveShortcut(event)) {
        event.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, onClose])
  useEffect(() => {
    const backdrop = backdropRef.current
    if (!backdrop) return
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target === backdrop) onClose()
    }
    backdrop.addEventListener('click', handleBackdropClick)
    return () => backdrop.removeEventListener('click', handleBackdropClick)
  }, [backdropRef, onClose])
}

function SettingsPanelInner(options: SettingsPanelInnerProps) {
  const { settings, initialDraft, initialSectionId, systemLocale, onSave, vaults, defaultWorkspacePath, onRemoveVault, onReorderVaults, onSetDefaultWorkspace, onUpdateWorkspaceIdentity, isGitVault, vaultPath, onClose } = options
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const { draft, updateDraft, handleGitignoredVisibilityChange, handleAllNotesFileVisibilityChange, handleThemeModeChange, handleSave } = useSettingsDraftActions({ initialDraft, onClose, onSave, settings })
  const draftLocale = resolveEffectiveLocale(draft.uiLanguage, [systemLocale])
  const t = createTranslator(draftLocale)
  useSettingsPanelInteractions({ backdropRef, handleSave, initialSectionId, onClose, panelRef })

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[1300] flex items-center justify-center"
      style={{ background: 'var(--shadow-overlay)' }}
      data-testid="settings-panel"
    >
      <SettingsBackdropCloseButton onClose={onClose} t={t} />
      <div
        ref={panelRef}
        className="relative rounded-lg border border-border bg-background shadow-[0_18px_55px_var(--shadow-dialog)]"
        style={{
          width: 'min(960px, calc(100vw - 48px))',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SettingsHeader onClose={onClose} t={t} />
        <SettingsBodyFromDraft
          t={t}
          draft={draft}
          locale={draftLocale}
          systemLocale={systemLocale}
          updateDraft={updateDraft}
          isGitVault={isGitVault}
          vaultPath={vaultPath}
          vaults={vaults ?? []}
          defaultWorkspacePath={defaultWorkspacePath}
          {...{
            onRemoveVault,
            onReorderVaults,
            onSetDefaultWorkspace,
            onUpdateWorkspaceIdentity,
          }}
          setThemeMode={handleThemeModeChange}
          setHideGitignoredFiles={handleGitignoredVisibilityChange}
          setAllNotesFileVisibility={handleAllNotesFileVisibilityChange}
        />
        <SettingsFooter onClose={onClose} onSave={handleSave} t={t} />
      </div>
    </div>
  )
}

function SettingsBackdropCloseButton({ onClose, t }: { onClose: () => void; t: Translate }) {
  return (
    <button
      type="button"
      aria-label={t('settings.close')}
      className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
      onClick={onClose}
    />
  )
}

function SettingsHeader({ onClose, t }: { onClose: () => void; t: Translate }) {
  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{
        height: 56,
        padding: '0 24px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{t('settings.title')}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        title={t('settings.close')}
        aria-label={t('settings.close')}
      >
        <X size={16} />
      </Button>
    </div>
  )
}

interface SettingsBodyFromDraftProps {
  t: Translate
  draft: SettingsDraft
  locale: AppLocale
  systemLocale: AppLocale
  updateDraft: <Key extends keyof SettingsDraft>(key: Key, value: SettingsDraft[Key]) => void
  isGitVault: boolean
  vaultPath: string
  vaults: VaultOption[]
  defaultWorkspacePath?: string | null
  onRemoveVault?: (path: string) => void
  onReorderVaults?: (orderedPaths: string[]) => void
  onSetDefaultWorkspace?: (path: string) => void
  onUpdateWorkspaceIdentity?: (path: string, patch: Partial<VaultOption>) => void
  setThemeMode: (value: ThemeMode) => void
  setHideGitignoredFiles: (value: boolean) => void
  setAllNotesFileVisibility: (value: AllNotesFileVisibility) => void
}

function SettingsBodyFromDraft(options: SettingsBodyFromDraftProps) {
  const { t, draft, locale, systemLocale, updateDraft, isGitVault, vaultPath, vaults, defaultWorkspacePath, onRemoveVault, onReorderVaults, onSetDefaultWorkspace, onUpdateWorkspaceIdentity, setThemeMode, setHideGitignoredFiles, setAllNotesFileVisibility } = options
  return (
    <SettingsBody
      t={t}
      locale={locale}
      systemLocale={systemLocale}
      pullInterval={draft.pullInterval}
      setPullInterval={(value) => updateDraft('pullInterval', value)}
      gitFeaturesEnabled={draft.gitFeaturesEnabled}
      setGitFeaturesEnabled={(value) => updateDraft('gitFeaturesEnabled', value)}
      gitProvider={draft.gitProvider}
      setGitProvider={(value) => updateDraft('gitProvider', value)}
      gitWslDistro={draft.gitWslDistro}
      setGitWslDistro={(value) => updateDraft('gitWslDistro', value)}
      isGitVault={isGitVault}
      vaultPath={vaultPath}
      autoGitEnabled={draft.autoGitEnabled}
      setAutoGitEnabled={(value) => updateDraft('autoGitEnabled', value)}
      autoGitIdleThresholdSeconds={draft.autoGitIdleThresholdSeconds}
      setAutoGitIdleThresholdSeconds={(value) => updateDraft('autoGitIdleThresholdSeconds', value)}
      autoGitInactiveThresholdSeconds={draft.autoGitInactiveThresholdSeconds}
      setAutoGitInactiveThresholdSeconds={(value) => updateDraft('autoGitInactiveThresholdSeconds', value)}
      releaseChannel={draft.releaseChannel}
      setReleaseChannel={(value) => updateDraft('releaseChannel', value)}
      automaticUpdateChecksEnabled={draft.automaticUpdateChecksEnabled}
      setAutomaticUpdateChecksEnabled={(value) => updateDraft('automaticUpdateChecksEnabled', value)}
      themeMode={draft.themeMode}
      setThemeMode={setThemeMode}
      uiLanguage={draft.uiLanguage}
      setUiLanguage={(value) => updateDraft('uiLanguage', value)}
      dateDisplayFormat={draft.dateDisplayFormat}
      setDateDisplayFormat={(value) => updateDraft('dateDisplayFormat', value)}
      defaultNoteWidth={draft.defaultNoteWidth}
      setDefaultNoteWidth={(value) => updateDraft('defaultNoteWidth', value)}
      initialH1AutoRename={draft.initialH1AutoRename}
      setInitialH1AutoRename={(value) => updateDraft('initialH1AutoRename', value)}
      hideGitignoredFiles={draft.hideGitignoredFiles}
      setHideGitignoredFiles={setHideGitignoredFiles}
      allNotesFileVisibility={draft.allNotesFileVisibility}
      setAllNotesFileVisibility={setAllNotesFileVisibility}
      multiWorkspaceEnabled={draft.multiWorkspaceEnabled}
      setMultiWorkspaceEnabled={(value) => updateDraft('multiWorkspaceEnabled', value)}
      vaults={vaults}
      defaultWorkspacePath={defaultWorkspacePath}
      {...{
        onRemoveVault,
        onReorderVaults,
        onSetDefaultWorkspace,
        onUpdateWorkspaceIdentity,
      }}
      crashReporting={draft.crashReporting}
      setCrashReporting={(value) => updateDraft('crashReporting', value)}
      analytics={draft.analytics}
      setAnalytics={(value) => updateDraft('analytics', value)}
    />
  )
}

function SettingsBody(props: SettingsBodyProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <SettingsBodyNav t={props.t} />
      <div className="min-w-0 flex-1 overflow-auto px-6 py-4">
        <SettingsSyncAndAppearanceSections {...props} />
        <SettingsContentSections {...props} />
        <SettingsPrivacySections {...props} />
      </div>
    </div>
  )
}

function SettingsSyncAndAppearanceSections(options: SettingsBodyProps) {
  const { t, locale, systemLocale, pullInterval, setPullInterval, gitFeaturesEnabled, setGitFeaturesEnabled, gitProvider, setGitProvider, gitWslDistro, setGitWslDistro, isGitVault, vaultPath, autoGitEnabled, setAutoGitEnabled, autoGitIdleThresholdSeconds, setAutoGitIdleThresholdSeconds, autoGitInactiveThresholdSeconds, setAutoGitInactiveThresholdSeconds, releaseChannel, setReleaseChannel, automaticUpdateChecksEnabled, setAutomaticUpdateChecksEnabled, multiWorkspaceEnabled, setMultiWorkspaceEnabled, vaults, defaultWorkspacePath, onRemoveVault, onReorderVaults, onSetDefaultWorkspace, onUpdateWorkspaceIdentity, themeMode, setThemeMode, uiLanguage, setUiLanguage } = options
  return (
    <>
      <SettingsSection id={SETTINGS_SECTION_IDS.sync} showDivider={false}>
        <SyncAndUpdatesSection
          t={t}
          pullInterval={pullInterval}
          setPullInterval={setPullInterval}
          releaseChannel={releaseChannel}
          setReleaseChannel={setReleaseChannel}
          automaticUpdateChecksEnabled={automaticUpdateChecksEnabled}
          setAutomaticUpdateChecksEnabled={setAutomaticUpdateChecksEnabled}
        />
      </SettingsSection>
      <SettingsSection id={SETTINGS_SECTION_IDS.workspaces}>
        <SectionHeading icon={<Cube size={16} aria-hidden="true" />} title={t('settings.workspaces.title')} />
        <WorkspaceSettingsSection
          defaultWorkspacePath={defaultWorkspacePath}
          enabled={multiWorkspaceEnabled}
          locale={locale}
          onEnabledChange={setMultiWorkspaceEnabled}
          {...{
            onRemoveVault,
            onReorderVaults,
            onSetDefaultWorkspace,
            onUpdateWorkspaceIdentity,
          }}
          vaults={vaults}
        />
      </SettingsSection>
      <SettingsSection id={SETTINGS_SECTION_IDS.autogit}>
        <GitSettingsSection
          t={t}
          gitFeaturesEnabled={gitFeaturesEnabled}
          setGitFeaturesEnabled={setGitFeaturesEnabled}
          gitProvider={gitProvider}
          setGitProvider={setGitProvider}
          gitWslDistro={gitWslDistro}
          setGitWslDistro={setGitWslDistro}
          isGitVault={isGitVault}
          vaultPath={vaultPath}
          autoGitEnabled={autoGitEnabled}
          setAutoGitEnabled={setAutoGitEnabled}
          autoGitIdleThresholdSeconds={autoGitIdleThresholdSeconds}
          setAutoGitIdleThresholdSeconds={setAutoGitIdleThresholdSeconds}
          autoGitInactiveThresholdSeconds={autoGitInactiveThresholdSeconds}
          setAutoGitInactiveThresholdSeconds={setAutoGitInactiveThresholdSeconds}
        />
      </SettingsSection>

      <SettingsSection id={SETTINGS_SECTION_IDS.appearance}>
        <SectionHeading title={t('settings.appearance.title')} />
        <SettingsGroup>
          <AppearanceSettingsSection t={t} themeMode={themeMode} setThemeMode={setThemeMode} />
          <LanguageSettingsSection
            t={t}
            locale={locale}
            systemLocale={systemLocale}
            uiLanguage={uiLanguage}
            setUiLanguage={setUiLanguage}
          />
        </SettingsGroup>
      </SettingsSection>
    </>
  )
}

function SettingsContentSections(options: SettingsBodyProps) {
  const { t, dateDisplayFormat, setDateDisplayFormat, defaultNoteWidth, setDefaultNoteWidth, initialH1AutoRename, setInitialH1AutoRename, hideGitignoredFiles, setHideGitignoredFiles, allNotesFileVisibility, setAllNotesFileVisibility } = options
  return (
    <SettingsSection id={SETTINGS_SECTION_IDS.content}>
      <VaultContentSettingsSection
        t={t}
        dateDisplayFormat={dateDisplayFormat}
        setDateDisplayFormat={setDateDisplayFormat}
        defaultNoteWidth={defaultNoteWidth}
        setDefaultNoteWidth={setDefaultNoteWidth}
        initialH1AutoRename={initialH1AutoRename}
        setInitialH1AutoRename={setInitialH1AutoRename}
        hideGitignoredFiles={hideGitignoredFiles}
        setHideGitignoredFiles={setHideGitignoredFiles}
        allNotesFileVisibility={allNotesFileVisibility}
        setAllNotesFileVisibility={setAllNotesFileVisibility}
      />
    </SettingsSection>
  )
}

function SettingsPrivacySections(options: SettingsBodyProps) {
  const { t, crashReporting, setCrashReporting, analytics, setAnalytics } = options
  return (
    <>
      <SettingsSection id={SETTINGS_SECTION_IDS.privacy}>
        <PrivacySettingsSection
          t={t}
          crashReporting={crashReporting}
          setCrashReporting={setCrashReporting}
          analytics={analytics}
          setAnalytics={setAnalytics}
        />
      </SettingsSection>
    </>
  )
}

function SyncAndUpdatesSection({
  t,
  pullInterval,
  setPullInterval,
  releaseChannel,
  setReleaseChannel,
  automaticUpdateChecksEnabled,
  setAutomaticUpdateChecksEnabled,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'pullInterval'
  | 'setPullInterval'
  | 'releaseChannel'
  | 'setReleaseChannel'
  | 'automaticUpdateChecksEnabled'
  | 'setAutomaticUpdateChecksEnabled'
>) {
  return (
    <>
      <SectionHeading title={t('settings.sync.title')} />

      <SettingsGroup>
        <SettingsRow label={t('settings.pullInterval')} description={t('settings.pullIntervalDescription')}>
          <SelectControl
            ariaLabel={t('settings.pullInterval')}
            value={`${pullInterval}`}
            onValueChange={(value) => setPullInterval(Number(value))}
            options={PULL_INTERVAL_OPTIONS.map((value) => ({
              value: `${value}`,
              label: `${value}`,
            }))}
            testId="settings-pull-interval"
            autoFocus={true}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.releaseChannel')} description={t('settings.releaseChannelDescription')}>
          <SelectControl
            ariaLabel={t('settings.releaseChannel')}
            value={releaseChannel}
            onValueChange={(value) => setReleaseChannel(value as ReleaseChannel)}
            options={[
              { value: 'stable', label: t('settings.releaseStable') },
              { value: 'alpha', label: t('settings.releaseAlpha') },
            ]}
            testId="settings-release-channel"
          />
        </SettingsRow>

        <SettingsSwitchRow
          label={t('settings.automaticUpdateChecks')}
          description={t('settings.automaticUpdateChecksDescription')}
          checked={automaticUpdateChecksEnabled}
          onChange={setAutomaticUpdateChecksEnabled}
          testId="settings-automatic-update-checks"
        />
      </SettingsGroup>
    </>
  )
}

function AppearanceSettingsSection({
  t,
  themeMode,
  setThemeMode,
}: Pick<SettingsBodyProps, 't' | 'themeMode' | 'setThemeMode'>) {
  return (
    <SettingsRow label={t('settings.theme.label')} description={t('settings.appearance.description')}>
      <ThemeModeControl value={themeMode} onChange={setThemeMode} t={t} />
    </SettingsRow>
  )
}

function ThemeModeControl({
  value,
  onChange,
  t,
}: {
  value: ThemeMode
  onChange: (value: ThemeMode) => void
  t: Translate
}) {
  return (
    <div
      className="inline-flex w-full rounded-md border border-border bg-muted p-1"
      role="radiogroup"
      aria-label={t('settings.theme.label')}
      data-testid="settings-theme-mode"
    >
      <ThemeModeButton label={t('settings.theme.light')} selected={value === 'light'} value="light" onSelect={onChange}>
        <Sun size={14} />
      </ThemeModeButton>
      <ThemeModeButton label={t('settings.theme.dark')} selected={value === 'dark'} value="dark" onSelect={onChange}>
        <Moon size={14} />
      </ThemeModeButton>
      <ThemeModeButton
        label={t('settings.theme.system')}
        selected={value === 'system'}
        value="system"
        onSelect={onChange}
      >
        <Monitor size={14} />
      </ThemeModeButton>
    </div>
  )
}

function ThemeModeButton({
  children,
  label,
  selected,
  value,
  onSelect,
}: {
  children: ReactNode
  label: string
  selected: boolean
  value: ThemeMode
  onSelect: (value: ThemeMode) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-testid={`settings-theme-${value}`}
      className={
        selected
          ? 'h-7 flex-1 border border-border bg-background text-foreground shadow-xs hover:bg-background'
          : 'h-7 flex-1 text-muted-foreground hover:text-foreground'
      }
      onClick={() => onSelect(value)}
    >
      {children}
      {label}
    </Button>
  )
}

function buildLanguageOptions(t: Translate, locale: AppLocale, systemLocale: AppLocale) {
  return [
    {
      value: SYSTEM_UI_LANGUAGE,
      label: t('settings.language.system', {
        language: localeDisplayName(systemLocale, locale),
      }),
    },
    ...APP_LOCALES.map((appLocale) => ({
      value: appLocale,
      label: localeDisplayName(appLocale, locale),
    })),
  ]
}

function LanguageSettingsSection({
  t,
  locale,
  systemLocale,
  uiLanguage,
  setUiLanguage,
}: Pick<SettingsBodyProps, 't' | 'locale' | 'systemLocale' | 'uiLanguage' | 'setUiLanguage'>) {
  return (
    <SettingsRow
      label={t('settings.language.title')}
      description={`${t('settings.language.description')} ${t('settings.language.summary')}`}
    >
      <SelectControl
        ariaLabel={t('settings.language.label')}
        value={uiLanguage}
        onValueChange={(value) => setUiLanguage(value as UiLanguagePreference)}
        options={buildLanguageOptions(t, locale, systemLocale)}
        testId="settings-ui-language"
      />
    </SettingsRow>
  )
}
