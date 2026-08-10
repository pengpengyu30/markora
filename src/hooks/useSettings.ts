import { useCallback, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import { shouldHideGitignoredFiles } from '../lib/gitignoredVisibility'
import {
  notifyGitignoredVisibilityChanged,
  TOGGLE_GITIGNORED_VISIBILITY_EVENT,
} from '../lib/gitignoredVisibilityEvents'
import { serializeUiLanguagePreference } from '../lib/i18n'
import { trackThemeModeChanged } from '../lib/productAnalytics'
import { normalizeReleaseChannel, serializeReleaseChannel } from '../lib/releaseChannel'
import { normalizeDateDisplayFormat } from '../utils/dateDisplay'
import { DEFAULT_THEME_MODE, normalizeThemeMode, type ThemeMode } from '../lib/themeMode'
import type { Settings } from '../types'
import { normalizeNoteWidthMode } from '../utils/noteWidth'

async function invokeNativeIfAvailable<T>(command: string, tauriArgs: Record<string, unknown>): Promise<T | undefined> {
  try {
    return await invoke<T>(command, tauriArgs)
  } catch (err) {
    if (isTauri()) throw err
    return undefined
  }
}

async function tauriCall<T>(command: string, tauriArgs: Record<string, unknown>, mockArgs?: Record<string, unknown>): Promise<T> {
  if (isTauri()) return invoke<T>(command, tauriArgs)

  const nativeResult = await invokeNativeIfAvailable<T>(command, tauriArgs)
  if (nativeResult !== undefined) return nativeResult

  return mockInvoke<T>(command, mockArgs ?? tauriArgs)
}

const EMPTY_SETTINGS: Settings = {
  auto_pull_interval_minutes: null,
  git_enabled: null,
  git_path: null,
  git_provider: null,
  git_wsl_distro: null,
  autogit_enabled: null,
  autogit_idle_threshold_seconds: null,
  autogit_inactive_threshold_seconds: null,
  telemetry_consent: null,
  crash_reporting_enabled: null,
  analytics_enabled: null,
  anonymous_id: null,
  release_channel: null,
  automatic_update_checks_enabled: null,
  theme_mode: null,
  ui_language: null,
  date_display_format: null,
  note_width_mode: null,
  hide_gitignored_files: null,
  all_notes_show_pdfs: null,
  all_notes_show_images: null,
  all_notes_show_unsupported: null,
}

function nullableBoolean(value: boolean | null | undefined): boolean | null {
  return value ?? null
}

function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    git_enabled: nullableBoolean(settings.git_enabled),
    git_path: nullableTrimmedString(settings.git_path),
    git_provider: normalizeGitProvider(settings.git_provider),
    git_wsl_distro: nullableTrimmedString(settings.git_wsl_distro),
    release_channel: serializeReleaseChannel(
      normalizeReleaseChannel(settings.release_channel),
    ),
    automatic_update_checks_enabled: nullableBoolean(settings.automatic_update_checks_enabled),
    theme_mode: normalizeThemeMode(settings.theme_mode),
    ui_language: serializeUiLanguagePreference(settings.ui_language),
    date_display_format: normalizeDateDisplayFormat(settings.date_display_format),
    note_width_mode: normalizeNoteWidthMode(settings.note_width_mode),
    hide_gitignored_files: nullableBoolean(settings.hide_gitignored_files),
    all_notes_show_pdfs: nullableBoolean(settings.all_notes_show_pdfs),
    all_notes_show_images: nullableBoolean(settings.all_notes_show_images),
    all_notes_show_unsupported: nullableBoolean(settings.all_notes_show_unsupported),
  }
}

function normalizeGitProvider(value: unknown): Settings['git_provider'] {
  const provider = trimmedString(value).toLowerCase()
  return provider === 'native' || provider === 'wsl' ? provider : null
}

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nullableTrimmedString(value: unknown): string | null {
  const trimmed = trimmedString(value)
  return trimmed || null
}

function effectiveThemeMode(settings: Settings): ThemeMode {
  return normalizeThemeMode(settings.theme_mode) ?? DEFAULT_THEME_MODE
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    void tauriCall<Settings>('get_settings', {})
      .then((value) => {
        if (active) setSettings(normalizeSettings(value))
      })
      .catch((error: unknown) => {
        console.warn('Failed to load settings:', error)
      })
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  const saveSettings = useCallback(async (newSettings: Settings) => {
    const previousHideGitignored = shouldHideGitignoredFiles(settings)
    const previousThemeMode = effectiveThemeMode(settings)
    const normalizedSettings = normalizeSettings(newSettings)
    try {
      await tauriCall<null>('save_settings', { settings: normalizedSettings })
      setSettings(normalizedSettings)
      const nextThemeMode = effectiveThemeMode(normalizedSettings)
      if (previousThemeMode !== nextThemeMode) {
        trackThemeModeChanged(nextThemeMode)
      }
      const nextHideGitignored = shouldHideGitignoredFiles(normalizedSettings)
      if (previousHideGitignored !== nextHideGitignored) {
        notifyGitignoredVisibilityChanged(nextHideGitignored)
      }
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }, [settings])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleToggleGitignoredVisibility = () => {
      void saveSettings({
        ...settings,
        hide_gitignored_files: !shouldHideGitignoredFiles(settings),
      })
    }

    window.addEventListener(TOGGLE_GITIGNORED_VISIBILITY_EVENT, handleToggleGitignoredVisibility)
    return () => {
      window.removeEventListener(TOGGLE_GITIGNORED_VISIBILITY_EVENT, handleToggleGitignoredVisibility)
    }
  }, [saveSettings, settings])

  return { settings, loaded, saveSettings }
}
