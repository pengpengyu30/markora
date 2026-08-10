import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultConfig } from '../types'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import {
  bindVaultConfigStore,
  getVaultConfig,
  loadPersistedVaultConfig,
  resetVaultConfigStore,
  savePersistedVaultConfig,
  updateVaultConfigField,
} from './vaultConfigStore'

const DEFAULT_CONFIG: VaultConfig = {
  zoom: null,
  view_mode: null,
  editor_mode: null,
  note_layout: null,
  git_setup_preference: 'prompt',
}

describe('vaultConfigStore app persistence', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
    })
    resetVaultConfigStore()
  })

  afterEach(() => {
    resetVaultConfigStore()
    vi.unstubAllGlobals()
  })

  it('round-trips the UI preferences through app storage', () => {
    const config: VaultConfig = {
      ...DEFAULT_CONFIG,
      zoom: 1.2,
      view_mode: 'editor-only',
      editor_mode: 'raw',
      note_layout: 'left',
      git_setup_preference: 'never',
    }

    savePersistedVaultConfig(config)

    expect(loadPersistedVaultConfig()).toEqual(config)
  })

  it('persists updates when no native vault-config writer is bound', () => {
    updateVaultConfigField('view_mode', 'editor-list')
    updateVaultConfigField('zoom', 1.1)

    expect(getVaultConfig().view_mode).toBe('editor-list')
    expect(loadPersistedVaultConfig()).toMatchObject({
      view_mode: 'editor-list',
      zoom: 1.1,
    })
    expect(store[APP_STORAGE_KEYS.vaultConfig]).toBeTruthy()
  })

  it('falls back to defaults for malformed persisted data', () => {
    store[APP_STORAGE_KEYS.vaultConfig] = '{not-json'

    expect(loadPersistedVaultConfig()).toEqual(DEFAULT_CONFIG)
  })

  it('keeps the bound writer while also persisting the app-level copy', () => {
    const save = vi.fn()
    bindVaultConfigStore(DEFAULT_CONFIG, save)

    updateVaultConfigField('note_layout', 'left')

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ note_layout: 'left' }))
    expect(loadPersistedVaultConfig()).toMatchObject({ note_layout: 'left' })
  })
})
