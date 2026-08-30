import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from '../types'
import { EDITOR_THEME_STORAGE_KEY } from '../lib/editorThemeStorage'
import { useEditorThemePreference } from './useEditorThemePreference'

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

describe('useEditorThemePreference', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-editor-theme')
  })

  it('lets loaded native settings override a stale startup mirror', async () => {
    const storage = makeStorage({ [EDITOR_THEME_STORAGE_KEY]: 'code' })
    document.documentElement.setAttribute('data-editor-theme', 'code')
    const settings = makeSettings('editorial')

    const { result } = renderHook(() => useEditorThemePreference({
      document,
      saveSettings: vi.fn(async () => true),
      settings,
      settingsLoaded: true,
      storage,
    }))

    await waitFor(() => {
      expect(result.current.editorThemeId).toBe('editorial')
    })
    expect(document.documentElement).toHaveAttribute('data-editor-theme', 'editorial')
    expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe('editorial')
  })

  it('normalizes an invalid native value before it reaches the document', async () => {
    const storage = makeStorage()
    const settings = makeSettings('removed-theme' as Settings['editor_theme'])

    const { result } = renderHook(() => useEditorThemePreference({
      document,
      saveSettings: vi.fn(async () => true),
      settings,
      settingsLoaded: true,
      storage,
    }))

    await waitFor(() => {
      expect(result.current.editorThemeId).toBe('default')
    })
    expect(document.documentElement).toHaveAttribute('data-editor-theme', 'default')
    expect(document.documentElement.getAttribute('data-editor-theme')).not.toBe('removed-theme')
  })

  it('returns a failure result and restores the previous theme when saving fails', async () => {
    const storage = makeStorage({ [EDITOR_THEME_STORAGE_KEY]: 'code' })
    document.documentElement.setAttribute('data-editor-theme', 'code')
    const saveSettings = vi.fn(async () => false)
    const { result } = renderHook(() => useEditorThemePreference({
      document,
      saveSettings,
      settings: makeSettings('code'),
      settingsLoaded: true,
      storage,
    }))

    await waitFor(() => {
      expect(result.current.editorThemeId).toBe('code')
    })

    let changeResult: Awaited<ReturnType<typeof result.current.setEditorTheme>>
    await act(async () => {
      changeResult = await result.current.setEditorTheme('canvas')
    })

    expect(changeResult).toMatchObject({ ok: false, editorThemeId: 'code' })
    expect(changeResult?.error).toBeInstanceOf(Error)
    expect(document.documentElement).toHaveAttribute('data-editor-theme', 'code')
    expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe('code')
    expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ editor_theme: 'canvas' }))
  })
})
