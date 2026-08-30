import { describe, expect, it, vi } from 'vitest'
import type { Settings } from '../types'
import { EDITOR_THEME_STORAGE_KEY } from './editorThemeStorage'
import { createEditorThemePersistenceCoordinator } from './editorThemePersistence'

function makeStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial))
  return {
    get length() { return values.size },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => { values.delete(key) }),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
}

function makeSettings(editor_theme: Settings['editor_theme'] = 'default'): Settings {
  return {
    auto_pull_interval_minutes: null,
    release_channel: null,
    editor_theme,
  }
}

describe('editorThemePersistence', () => {
  it('persists each valid editor theme and updates the mirror after native success', async () => {
    const storage = makeStorage()
    let settings = makeSettings()
    const saveSettings = vi.fn(async (nextSettings: Settings) => {
      settings = nextSettings
      return true
    })
    const coordinator = createEditorThemePersistenceCoordinator({
      document,
      getSettings: () => settings,
      saveSettings,
      storage,
    })

    for (const editorThemeId of ['default', 'code', 'editorial', 'canvas'] as const) {
      const result = await coordinator.setEditorTheme(editorThemeId)

      expect(result).toEqual({ ok: true, editorThemeId, error: null })
      expect(document.documentElement).toHaveAttribute('data-editor-theme', editorThemeId)
      expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe(editorThemeId)
    }
  })

  it('rolls back the effective theme and cache when native persistence fails', async () => {
    const storage = makeStorage({ [EDITOR_THEME_STORAGE_KEY]: 'code' })
    document.documentElement.setAttribute('data-editor-theme', 'code')
    const settings = makeSettings('code')
    const saveSettings = vi.fn(async () => false)
    const coordinator = createEditorThemePersistenceCoordinator({
      document,
      getSettings: () => settings,
      saveSettings,
      storage,
    })

    const result = await coordinator.setEditorTheme('canvas')

    expect(result.ok).toBe(false)
    expect(result.editorThemeId).toBe('code')
    expect(result.error).toBeInstanceOf(Error)
    expect(document.documentElement).toHaveAttribute('data-editor-theme', 'code')
    expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe('code')
    expect(settings.editor_theme).toBe('code')
    expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ editor_theme: 'canvas' }))
  })
})
