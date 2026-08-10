import { APP_STORAGE_KEYS } from '../constants/appStorage'
import type { VaultConfig } from '../types'

type SaveFn = (config: VaultConfig) => void
type Listener = () => void

const DEFAULT_CONFIG: VaultConfig = {
  zoom: null, view_mode: null, editor_mode: null, note_layout: null,
  git_setup_preference: 'prompt',
}

let config: VaultConfig = loadPersistedVaultConfig()
let saveFn: SaveFn | null = null
const listeners: Set<Listener> = new Set()

export function getVaultConfig(): VaultConfig {
  return config
}

export function bindVaultConfigStore(initial: VaultConfig, save: SaveFn): void {
  config = normalizeVaultConfig(initial)
  saveFn = save
  notify()
}

export function resetVaultConfigStore(): void {
  config = { ...DEFAULT_CONFIG }
  saveFn = null
  notify()
}

export function updateVaultConfigField<K extends keyof VaultConfig>(key: K, value: VaultConfig[K]): void {
  config = normalizeVaultConfig({ ...config, [key]: value })
  saveFn?.(config)
  savePersistedVaultConfig(config)
  notify()
}

export function loadPersistedVaultConfig(): VaultConfig {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.vaultConfig)
    if (!raw) return { ...DEFAULT_CONFIG }
    return normalizeVaultConfig(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function savePersistedVaultConfig(next: VaultConfig): void {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.vaultConfig, JSON.stringify(normalizeVaultConfig(next)))
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

export function subscribeVaultConfig(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function notify(): void {
  for (const fn of listeners) fn()
}

function normalizeVaultConfig(next: unknown): VaultConfig {
  const source = isVaultConfigRecord(next) ? next : {}
  return {
    ...DEFAULT_CONFIG,
    ...source,
    git_setup_preference: source.git_setup_preference === 'never' ? 'never' : 'prompt',
  }
}

function isVaultConfigRecord(value: unknown): value is Partial<VaultConfig> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
