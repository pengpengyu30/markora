import { trackEvent } from './telemetry'
import type { AllNotesFileVisibility } from '../utils/allNotesFileVisibility'
import type { DateDisplayFormat } from '../utils/dateDisplay'
import type { FilePreviewKind } from '../utils/filePreview'
import type { NoteWidthMode } from '../types'
import type { ThemeMode } from './themeMode'

type TrackedPreviewKind = FilePreviewKind | 'unsupported'
type FilePreviewAction = 'copy_deep_link' | 'copy_path' | 'open_external' | 'reveal'
type NotePdfExportFailureReason = 'export_unavailable' | 'export_error'
type NotePdfExportSource = 'breadcrumb' | 'app_command' | 'note_list_context_menu'
type NoteRetargetKind = 'folder' | 'type'
type NoteRetargetFolderDestination = 'folder' | 'root'
type AnalyticsBoolean = boolean
type StartupSource = 'scan' | 'snapshot'

const ALL_NOTES_VISIBILITY_CATEGORIES: ReadonlyArray<keyof AllNotesFileVisibility> = [
  'pdfs',
  'images',
  'unsupported',
]

function trackedPreviewKind(previewKind: FilePreviewKind | null): TrackedPreviewKind {
  return previewKind ?? 'unsupported'
}

function numericFlag(value: AnalyticsBoolean): number {
  return value ? 1 : 0
}

export function trackStartupActiveVaultUsable(properties: {
  activeVaultEntryCount: number
  activeVaultUsableMs: number
  nativeElapsedMs: number | null
  reactShellMs: number | null
  source: StartupSource
  targetMs: number
}): void {
  trackEvent('startup_active_vault_usable', {
    active_vault_entry_count: properties.activeVaultEntryCount,
    active_vault_usable_ms: properties.activeVaultUsableMs,
    native_elapsed_ms: properties.nativeElapsedMs ?? -1,
    react_shell_ms: properties.reactShellMs ?? -1,
    source: properties.source,
    target_met: numericFlag(properties.activeVaultUsableMs <= properties.targetMs),
    target_ms: properties.targetMs,
  })
}

export function trackStartupBackgroundReconciled(properties: {
  elapsedMs: number
  entryCount: number
}): void {
  trackEvent('startup_background_reconciled', {
    elapsed_ms: properties.elapsedMs,
    entry_count: properties.entryCount,
  })
}
export function trackFilePreviewOpened(previewKind: FilePreviewKind | null): void {
  trackEvent('file_preview_opened', {
    preview_kind: trackedPreviewKind(previewKind),
  })
}

export function trackFilePreviewAction(action: FilePreviewAction, previewKind: FilePreviewKind | null): void {
  trackEvent('file_preview_action', {
    action,
    preview_kind: trackedPreviewKind(previewKind),
  })
}

export function trackFilePreviewFailed(previewKind: FilePreviewKind): void {
  trackEvent('file_preview_failed', { preview_kind: previewKind })
}

export function trackNotePdfExportStarted(source: NotePdfExportSource): void {
  trackEvent('note_pdf_export_started', { source })
}

export function trackNotePdfExportFailed(
  source: NotePdfExportSource,
  reason: NotePdfExportFailureReason,
): void {
  trackEvent('note_pdf_export_failed', { reason, source })
}

export function trackNoteRetargeted(params: {
  targetKind: NoteRetargetKind
  folderDestination?: NoteRetargetFolderDestination
}): void {
  trackEvent('note_retargeted', {
    target_kind: params.targetKind,
    ...(params.folderDestination ? { folder_destination: params.folderDestination } : {}),
  })
}

export function trackAllNotesVisibilityChanged(
  previous: AllNotesFileVisibility,
  next: AllNotesFileVisibility,
): void {
  for (const category of ALL_NOTES_VISIBILITY_CATEGORIES) {
    const previousValue = Reflect.get(previous, category) as boolean
    const nextValue = Reflect.get(next, category) as boolean
    if (previousValue === nextValue) continue
    trackEvent('all_notes_visibility_changed', {
      category,
      enabled: numericFlag(nextValue),
    })
  }
}

export function trackDefaultNoteWidthChanged(mode: NoteWidthMode): void {
  trackEvent('note_width_default_changed', { mode })
}

export function trackDateDisplayFormatChanged(format: DateDisplayFormat): void {
  trackEvent('date_display_format_changed', { format })
}

export function trackSidebarTypePluralizationChanged(enabled: AnalyticsBoolean): void {
  trackEvent('sidebar_type_pluralization_changed', {
    enabled: numericFlag(enabled),
  })
}

export function trackThemeModeChanged(mode: ThemeMode): void {
  trackEvent('theme_mode_changed', { mode })
}

export function trackInlineImageLightboxOpened(): void {
  trackEvent('inline_image_lightbox_opened')
}

export function trackDatePropertyDirectEntrySaved(): void {
  trackEvent('date_property_direct_entry_saved', { source: 'properties_panel' })
}
