import { Monitor, Moon, Sun, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Settings } from '../types'
import type { VaultOption } from './status-bar/types'
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
import { areAutomaticUpdateChecksEnabled } from '../lib/automaticUpdateChecks'
import { ProjectSettingsSection } from './ProjectSettingsSection'
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
import {
  resolveAllNotesFileVisibility,
  settingsWithAllNotesFileVisibility,
  type AllNotesFileVisibility,
} from '../utils/allNotesFileVisibility'
import { DEFAULT_NOTE_WIDTH_MODE, normalizeNoteWidthMode } from '../utils/noteWidth'
import { DEFAULT_DATE_DISPLAY_FORMAT, normalizeDateDisplayFormat, type DateDisplayFormat } from '../utils/dateDisplay'
import { Button } from './ui/button'
import type { NoteWidthMode } from '../types'
import { SETTINGS_SECTION_IDS } from './settingsSectionIds'
import { useSettingsPanelAutofocus, useSettingsPanelFocusTrap } from './useSettingsPanelFocus'
import { registerMacosDismissableEscapeSurface } from '../utils/macosDismissableEscapeSurface'

interface SettingsPanelProps {
  open: boolean
  settings: Settings
  initialSectionId?: string | null
  locale?: AppLocale
  systemLocale?: AppLocale
  onSave: (settings: Settings) => void
  onClose: () => void
  projects?: VaultOption[]
  defaultProjectPath?: string | null
  onSetDefaultProject?: (path: string) => void
  onRemoveProject?: (path: string) => void
  onReorderProjects?: (orderedPaths: string[]) => void
  onUpdateProjectIdentity?: (path: string, patch: Partial<VaultOption>) => void
}

interface SettingsDraft {
  releaseChannel: ReleaseChannel
  automaticUpdateChecksEnabled: boolean
  themeMode: ThemeMode
  uiLanguage: UiLanguagePreference
  dateDisplayFormat: DateDisplayFormat
  defaultNoteWidth: NoteWidthMode
  initialH1AutoRename: boolean
  hideGitignoredFiles: boolean
  allNotesFileVisibility: AllNotesFileVisibility
  multiProjectEnabled: boolean
}

interface SettingsBodyProps {
  t: Translate
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
  multiProjectEnabled: boolean
  setMultiProjectEnabled: (value: boolean) => void
  projects: VaultOption[]
  defaultProjectPath?: string | null
  onSetDefaultProject?: (path: string) => void
  onRemoveProject?: (path: string) => void
  onReorderProjects?: (orderedPaths: string[]) => void
  onUpdateProjectIdentity?: (path: string, patch: Partial<VaultOption>) => void
}

type Translate = ReturnType<typeof createTranslator>

function isSaveShortcut(event: { ctrlKey: boolean; key: string; metaKey: boolean }): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey)
}

function createSettingsDraft(settings: Settings): SettingsDraft {
  return {
    releaseChannel: normalizeReleaseChannel(settings.release_channel),
    automaticUpdateChecksEnabled: areAutomaticUpdateChecksEnabled(settings),
    themeMode: resolveSettingsDraftThemeMode(settings.theme_mode),
    uiLanguage: settings.ui_language ?? SYSTEM_UI_LANGUAGE,
    dateDisplayFormat: normalizeDateDisplayFormat(settings.date_display_format) ?? DEFAULT_DATE_DISPLAY_FORMAT,
    defaultNoteWidth: normalizeNoteWidthMode(settings.note_width_mode) ?? DEFAULT_NOTE_WIDTH_MODE,
    initialH1AutoRename: settings.initial_h1_auto_rename_enabled ?? true,
    hideGitignoredFiles: shouldHideGitignoredFiles(settings),
    allNotesFileVisibility: resolveAllNotesFileVisibility(settings),
    multiProjectEnabled: settings.multi_workspace_enabled !== false,
  }
}

function resolveSettingsDraftThemeMode(themeMode: Settings['theme_mode']): ThemeMode {
  if (themeMode) return themeMode
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE
  return readStoredThemeMode(window.localStorage) ?? DEFAULT_THEME_MODE
}

function buildSettingsFromDraft(settings: Settings, draft: SettingsDraft): Settings {
  const nextSettings = {
    ...settings,
    release_channel: serializeReleaseChannel(draft.releaseChannel),
    automatic_update_checks_enabled: draft.automaticUpdateChecksEnabled ? null : false,
    theme_mode: draft.themeMode,
    ui_language: serializeUiLanguagePreference(draft.uiLanguage),
    date_display_format: draft.dateDisplayFormat,
    note_width_mode: draft.defaultNoteWidth,
    initial_h1_auto_rename_enabled: draft.initialH1AutoRename,
    hide_gitignored_files: draft.hideGitignoredFiles,
    multi_workspace_enabled: draft.multiProjectEnabled,
  }
  return settingsWithAllNotesFileVisibility(nextSettings, draft.allNotesFileVisibility)
}

function applyThemeModeSelection(value: ThemeMode): void {
  const matchMedia = typeof window !== 'undefined' ? window.matchMedia?.bind(window) : undefined
  if (typeof document !== 'undefined') applyThemeSelectionToDocument(document, value, matchMedia)
  if (typeof window !== 'undefined') writeStoredThemeMode(window.localStorage, value)
}

export function SettingsPanel(options: SettingsPanelProps) {
  const {
    open,
    settings,
    initialSectionId = null,
    locale = 'en',
    systemLocale = locale,
    onSave,
    onClose,
    projects = [],
    defaultProjectPath = null,
    onSetDefaultProject,
    onRemoveProject,
    onReorderProjects,
    onUpdateProjectIdentity,
  } = options
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
      onClose={onClose}
      projects={projects}
      defaultProjectPath={defaultProjectPath}
      onSetDefaultProject={onSetDefaultProject}
      onRemoveProject={onRemoveProject}
      onReorderProjects={onReorderProjects}
      onUpdateProjectIdentity={onUpdateProjectIdentity}
    />
  )
}

type SettingsPanelInnerProps = Omit<
  SettingsPanelProps,
  'open'
> & {
  initialDraft: SettingsDraft
  initialSectionId: string | null
  locale: AppLocale
  systemLocale: AppLocale
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
    updateDraft('allNotesFileVisibility', value)
    onSave(settingsWithAllNotesFileVisibility(settings, value))
  }, [onSave, settings, updateDraft])
  const handleThemeModeChange = useCallback((value: ThemeMode) => {
    updateDraft('themeMode', value)
    applyThemeModeSelection(value)
    onSave({ ...settings, theme_mode: value })
  }, [onSave, settings, updateDraft])
  const handleSave = useCallback(() => {
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
  const {
    settings,
    initialDraft,
    initialSectionId,
    systemLocale,
    onSave,
    onClose,
    projects,
    defaultProjectPath,
    onSetDefaultProject,
    onRemoveProject,
    onReorderProjects,
    onUpdateProjectIdentity,
  } = options
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
        setThemeMode={handleThemeModeChange}
        setHideGitignoredFiles={handleGitignoredVisibilityChange}
        setAllNotesFileVisibility={handleAllNotesFileVisibilityChange}
        projects={projects ?? []}
        defaultProjectPath={defaultProjectPath}
        onSetDefaultProject={onSetDefaultProject}
        onRemoveProject={onRemoveProject}
        onReorderProjects={onReorderProjects}
        onUpdateProjectIdentity={onUpdateProjectIdentity}
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
  setThemeMode: (value: ThemeMode) => void
  setHideGitignoredFiles: (value: boolean) => void
  setAllNotesFileVisibility: (value: AllNotesFileVisibility) => void
  projects: VaultOption[]
  defaultProjectPath?: string | null
  onSetDefaultProject?: (path: string) => void
  onRemoveProject?: (path: string) => void
  onReorderProjects?: (orderedPaths: string[]) => void
  onUpdateProjectIdentity?: (path: string, patch: Partial<VaultOption>) => void
}

function SettingsBodyFromDraft(options: SettingsBodyFromDraftProps) {
  const {
    t,
    draft,
    locale,
    systemLocale,
    updateDraft,
    setThemeMode,
    setHideGitignoredFiles,
    setAllNotesFileVisibility,
    projects,
    defaultProjectPath,
    onSetDefaultProject,
    onRemoveProject,
    onReorderProjects,
    onUpdateProjectIdentity,
  } = options
  return (
    <SettingsBody
      t={t}
      locale={locale}
      systemLocale={systemLocale}
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
      multiProjectEnabled={draft.multiProjectEnabled}
      setMultiProjectEnabled={(value) => updateDraft('multiProjectEnabled', value)}
      projects={projects}
      defaultProjectPath={defaultProjectPath}
      onSetDefaultProject={onSetDefaultProject}
      onRemoveProject={onRemoveProject}
      onReorderProjects={onReorderProjects}
      onUpdateProjectIdentity={onUpdateProjectIdentity}
    />
  )
}

function SettingsBody(props: SettingsBodyProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <SettingsBodyNav t={props.t} />
      <div className="min-w-0 flex-1 overflow-auto px-6 py-4">
        <SettingsProjectSections {...props} />
        <SettingsSyncAndAppearanceSections {...props} />
        <SettingsContentSections {...props} />
      </div>
    </div>
  )
}

function SettingsProjectSections(options: SettingsBodyProps) {
  const {
    t,
    locale,
    multiProjectEnabled,
    setMultiProjectEnabled,
    projects,
    defaultProjectPath,
    onSetDefaultProject,
    onRemoveProject,
    onReorderProjects,
    onUpdateProjectIdentity,
  } = options

  return (
    <SettingsSection id={SETTINGS_SECTION_IDS.projects} showDivider={false}>
      <SectionHeading title={t('settings.projects.title')} />
      <ProjectSettingsSection
        defaultProjectPath={defaultProjectPath}
        enabled={multiProjectEnabled}
        locale={locale}
        onEnabledChange={setMultiProjectEnabled}
        onRemoveProject={onRemoveProject}
        onReorderProjects={onReorderProjects}
        onSetDefaultProject={onSetDefaultProject}
        onUpdateProjectIdentity={onUpdateProjectIdentity}
        projects={projects}
      />
    </SettingsSection>
  )
}

function SettingsSyncAndAppearanceSections(options: SettingsBodyProps) {
  const { t, locale, systemLocale, releaseChannel, setReleaseChannel, automaticUpdateChecksEnabled, setAutomaticUpdateChecksEnabled, themeMode, setThemeMode, uiLanguage, setUiLanguage } = options
  return (
    <>
      <SettingsSection id={SETTINGS_SECTION_IDS.sync} showDivider={false}>
        <SyncAndUpdatesSection
          t={t}
          releaseChannel={releaseChannel}
          setReleaseChannel={setReleaseChannel}
          automaticUpdateChecksEnabled={automaticUpdateChecksEnabled}
          setAutomaticUpdateChecksEnabled={setAutomaticUpdateChecksEnabled}
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

function SyncAndUpdatesSection({
  t,
  releaseChannel,
  setReleaseChannel,
  automaticUpdateChecksEnabled,
  setAutomaticUpdateChecksEnabled,
}: Pick<
  SettingsBodyProps,
  | 't'
  | 'releaseChannel'
  | 'setReleaseChannel'
  | 'automaticUpdateChecksEnabled'
  | 'setAutomaticUpdateChecksEnabled'
>) {
  return (
    <>
      <SectionHeading title={t('settings.sync.title')} />

      <SettingsGroup>
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
