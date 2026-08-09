import { useEffect, useCallback, useSyncExternalStore } from 'react'
import type { VaultConfig } from '../types'
import {
  getVaultConfig,
  bindVaultConfigStore,
  resetVaultConfigStore,
  updateVaultConfigField,
  subscribeVaultConfig,
} from '../utils/vaultConfigStore'
import { migrateLocalStorageToVaultConfig } from '../utils/configMigration'

const STORAGE_PREFIX = 'laputa:vault-config:'

function storageKey(vaultPath: string): string {
  return `${STORAGE_PREFIX}${vaultPath}`
}

function loadFromStorage(vaultPath: string): VaultConfig {
  const DEFAULT: VaultConfig = {
    zoom: null, view_mode: null, editor_mode: null, note_layout: null,
    git_setup_preference: 'prompt',
  }
  try {
    const raw = localStorage.getItem(storageKey(vaultPath))
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT
  }
}

function saveToStorage(vaultPath: string, config: VaultConfig): void {
  try {
    localStorage.setItem(storageKey(vaultPath), JSON.stringify(config))
  } catch (err) {
    console.warn('Failed to save vault config:', err)
  }
}

export function useVaultConfig(vaultPath: string) {
  const config = useSyncExternalStore(subscribeVaultConfig, getVaultConfig, getVaultConfig)

  useEffect(() => {
    resetVaultConfigStore()

    const loaded = loadFromStorage(vaultPath)
    const migrated = migrateLocalStorageToVaultConfig(loaded)
    const needsSave = migrated !== loaded
    bindVaultConfigStore(migrated, (c) => saveToStorage(vaultPath, c))
    if (needsSave) saveToStorage(vaultPath, migrated)

    return () => resetVaultConfigStore()
  }, [vaultPath])

  const update = useCallback(<K extends keyof VaultConfig>(key: K, value: VaultConfig[K]) => {
    updateVaultConfigField(key, value)
  }, [])

  return { config, updateConfig: update }
}
