import { APP_STORAGE_KEYS, copyLegacyAppStorageKeys, getAppStorageItem } from '../constants/appStorage'
import type { VaultConfig } from '../types'

const MIGRATION_FLAG = APP_STORAGE_KEYS.configMigrationFlag

function createDefaultVaultConfig(): VaultConfig {
  return {
    zoom: null,
    view_mode: null,
    editor_mode: null,
    git_setup_preference: 'prompt',
  }
}

function migrationAlreadyCompleted(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG) === '1'
  } catch {
    return true
  }
}

function markMigrationCompleted() {
  try {
    localStorage.setItem(MIGRATION_FLAG, '1')
  } catch {
    // Ignore localStorage failures; the loaded config remains usable.
  }
}

function applyZoomMigration(result: VaultConfig) {
  if (result.zoom !== null) return
  try {
    const raw = getAppStorageItem('zoom')
    const value = raw === null ? null : Number(raw)
    if (value !== null && value >= 80 && value <= 150) result.zoom = value / 100
  } catch {
    // Ignore malformed legacy values.
  }
}

function applyViewModeMigration(result: VaultConfig) {
  if (result.view_mode !== null) return
  try {
    const raw = getAppStorageItem('viewMode')
    if (raw === 'editor-only' || raw === 'editor-list' || raw === 'all') result.view_mode = raw
  } catch {
    // Ignore malformed legacy values.
  }
}

/**
 * One-time migration: read localStorage values and merge into vault config.
 * Returns the merged config. If already migrated (flag set), returns the loaded config unchanged.
 * Passing null for `loaded` means the vault file didn't exist yet.
 */
export function migrateLocalStorageToVaultConfig(loaded: VaultConfig | null): VaultConfig {
  const base = loaded ?? createDefaultVaultConfig()

  copyLegacyAppStorageKeys()

  if (migrationAlreadyCompleted()) return base

  const result = { ...base }

  applyZoomMigration(result)
  applyViewModeMigration(result)
  markMigrationCompleted()

  return result
}
