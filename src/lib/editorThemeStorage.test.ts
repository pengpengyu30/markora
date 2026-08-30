import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EDITOR_THEME_STORAGE_KEY,
  applyStoredEditorTheme,
  captureEditorThemeStorage,
  readStoredEditorThemeId,
  restoreEditorThemeStorage,
  writeStoredEditorThemeId,
} from './editorThemeStorage'

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

describe('editorThemeStorage', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-editor-theme')
    document.documentElement.setAttribute('data-theme', 'dark')
  })

  it('uses a dedicated key and normalizes every valid and invalid cached value', () => {
    const storage = makeStorage()

    for (const id of ['default', 'code', 'editorial', 'canvas'] as const) {
      writeStoredEditorThemeId(storage, id)
      expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe(id)
      expect(readStoredEditorThemeId(storage)).toBe(id)
    }

    storage.setItem(EDITOR_THEME_STORAGE_KEY, 'removed-theme')
    expect(readStoredEditorThemeId(storage)).toBe('default')
    storage.removeItem(EDITOR_THEME_STORAGE_KEY)
    expect(readStoredEditorThemeId(storage)).toBe('default')
  })

  it('applies only the validated editor identity and never changes application appearance', () => {
    const storage = makeStorage({ [EDITOR_THEME_STORAGE_KEY]: 'editorial' })

    expect(applyStoredEditorTheme(document, storage)).toBe('editorial')
    expect(document.documentElement.getAttribute('data-editor-theme')).toBe('editorial')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    storage.setItem(EDITOR_THEME_STORAGE_KEY, 'invalid')
    expect(applyStoredEditorTheme(document, storage)).toBe('default')
    expect(document.documentElement.getAttribute('data-editor-theme')).toBe('default')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('does not block startup when cache access is restricted and can restore the previous raw value', () => {
    const restrictedStorage = {
      getItem: vi.fn(() => { throw new Error('SecurityError') }),
      setItem: vi.fn(() => { throw new Error('SecurityError') }),
      removeItem: vi.fn(() => { throw new Error('SecurityError') }),
    } as unknown as Storage

    expect(() => applyStoredEditorTheme(document, restrictedStorage)).not.toThrow()
    expect(document.documentElement.getAttribute('data-editor-theme')).toBe('default')

    const storage = makeStorage({ [EDITOR_THEME_STORAGE_KEY]: 'code' })
    const snapshot = captureEditorThemeStorage(storage)
    writeStoredEditorThemeId(storage, 'canvas')
    restoreEditorThemeStorage(storage, snapshot)
    expect(storage.getItem(EDITOR_THEME_STORAGE_KEY)).toBe('code')
  })
})
