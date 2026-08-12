import { Article } from '@phosphor-icons/react'
import type { TranslationKey, TranslationValues } from '../lib/i18n'
import type { NoteWidthMode } from '../types'
import type { AllNotesFileVisibility } from '../utils/allNotesFileVisibility'
import { DATE_DISPLAY_FORMATS, type DateDisplayFormat } from '../utils/dateDisplay'
import { SectionHeading, SelectControl, SettingsGroup, SettingsRow, SettingsSwitchRow } from './SettingsControls'

type Translate = (key: TranslationKey, values?: TranslationValues) => string

interface VaultContentSettingsSectionProps {
  t: Translate
  dateDisplayFormat: DateDisplayFormat
  setDateDisplayFormat: (value: DateDisplayFormat) => void
  defaultNoteWidth: NoteWidthMode
  setDefaultNoteWidth: (value: NoteWidthMode) => void
  initialH1AutoRename: boolean
  setInitialH1AutoRename: (value: boolean) => void
  hideGitignoredFiles: boolean
  setHideGitignoredFiles: (value: boolean) => void
  allNotesFileVisibility: AllNotesFileVisibility
  setAllNotesFileVisibility: (value: AllNotesFileVisibility) => void
  noteListShowFilename: boolean
  setNoteListShowFilename: (value: boolean) => void
  folderViewShowNonMarkdown: boolean
  setFolderViewShowNonMarkdown: (value: boolean) => void
}

const NOTE_WIDTH_OPTIONS: readonly NoteWidthMode[] = ['normal', 'wide']
const NOTE_WIDTH_LABEL_KEYS: Record<NoteWidthMode, TranslationKey> = {
  normal: 'settings.noteWidth.normal',
  wide: 'settings.noteWidth.wide',
}
const DATE_DISPLAY_LABEL_KEYS: Record<DateDisplayFormat, TranslationKey> = {
  us: 'settings.dateDisplay.us',
  european: 'settings.dateDisplay.european',
  friendly: 'settings.dateDisplay.friendly',
  iso: 'settings.dateDisplay.iso',
}

function buildNoteWidthOptions(t: Translate): Array<{ value: NoteWidthMode; label: string }> {
  return NOTE_WIDTH_OPTIONS.map((value) => ({
    value,
    label: t(Reflect.get(NOTE_WIDTH_LABEL_KEYS, value) as Parameters<Translate>[0]),
  }))
}

function buildDateDisplayOptions(t: Translate): Array<{ value: DateDisplayFormat; label: string }> {
  return DATE_DISPLAY_FORMATS.map((value) => ({
    value,
    label: t(Reflect.get(DATE_DISPLAY_LABEL_KEYS, value) as Parameters<Translate>[0]),
  }))
}

export function VaultContentSettingsSection(functionOptions: VaultContentSettingsSectionProps) {
  const {
    t,
    dateDisplayFormat,
    setDateDisplayFormat,
    defaultNoteWidth,
    setDefaultNoteWidth,
    initialH1AutoRename,
    setInitialH1AutoRename,
    hideGitignoredFiles,
    setHideGitignoredFiles,
    allNotesFileVisibility,
    setAllNotesFileVisibility,
    noteListShowFilename,
    setNoteListShowFilename,
    folderViewShowNonMarkdown,
    setFolderViewShowNonMarkdown,
  } = functionOptions
  const updateAllNotesFileVisibility = (patch: Partial<AllNotesFileVisibility>) => {
    setAllNotesFileVisibility({ ...allNotesFileVisibility, ...patch })
  }

  return (
    <>
      <SectionHeading icon={<Article size={16} aria-hidden="true" />} title={t('settings.vaultContent.title')} />

      <SettingsGroup>
        <SettingsRow
          label={t('settings.dateDisplay.default')}
          description={t('settings.dateDisplay.defaultDescription')}
        >
          <SelectControl
            ariaLabel={t('settings.dateDisplay.default')}
            value={dateDisplayFormat}
            onValueChange={(value) => setDateDisplayFormat(value as DateDisplayFormat)}
            options={buildDateDisplayOptions(t)}
            testId="settings-date-display-format"
          />
        </SettingsRow>

        <SettingsRow label={t('settings.noteWidth.default')} description={t('settings.noteWidth.defaultDescription')}>
          <SelectControl
            ariaLabel={t('settings.noteWidth.default')}
            value={defaultNoteWidth}
            onValueChange={(value) => setDefaultNoteWidth(value as NoteWidthMode)}
            options={buildNoteWidthOptions(t)}
            testId="settings-default-note-width"
          />
        </SettingsRow>

        <SettingsSwitchRow
          label={t('settings.titles.autoRename')}
          description={t('settings.titles.autoRenameDescription')}
          checked={initialH1AutoRename}
          onChange={setInitialH1AutoRename}
          testId="settings-initial-h1-auto-rename"
        />

        <SettingsSwitchRow
          label={t('settings.vaultContent.hideGitignored')}
          description={t('settings.vaultContent.hideGitignoredDescription')}
          checked={hideGitignoredFiles}
          onChange={setHideGitignoredFiles}
          testId="settings-hide-gitignored-files"
        />

        <SettingsSwitchRow
          label={t('settings.vaultContent.showFilename')}
          description={t('settings.vaultContent.showFilenameDescription')}
          checked={noteListShowFilename}
          onChange={setNoteListShowFilename}
          testId="settings-note-list-show-filename"
        />

        <SettingsSwitchRow
          label={t('settings.vaultContent.showNonMarkdownInFolders')}
          description={t('settings.vaultContent.showNonMarkdownInFoldersDescription')}
          checked={folderViewShowNonMarkdown}
          onChange={setFolderViewShowNonMarkdown}
          testId="settings-folder-view-show-non-markdown"
        />

        <SettingsSwitchRow
          label={t('settings.allNotesVisibility.pdfs')}
          description={t('settings.allNotesVisibility.pdfsDescription')}
          checked={allNotesFileVisibility.pdfs}
          onChange={(checked) => updateAllNotesFileVisibility({ pdfs: checked })}
          testId="settings-all-notes-show-pdfs"
        />

        <SettingsSwitchRow
          label={t('settings.allNotesVisibility.images')}
          description={t('settings.allNotesVisibility.imagesDescription')}
          checked={allNotesFileVisibility.images}
          onChange={(checked) => updateAllNotesFileVisibility({ images: checked })}
          testId="settings-all-notes-show-images"
        />

        <SettingsSwitchRow
          label={t('settings.allNotesVisibility.unsupported')}
          description={t('settings.allNotesVisibility.unsupportedDescription')}
          checked={allNotesFileVisibility.unsupported}
          onChange={(checked) => updateAllNotesFileVisibility({ unsupported: checked })}
          testId="settings-all-notes-show-unsupported"
        />
      </SettingsGroup>
    </>
  )
}
