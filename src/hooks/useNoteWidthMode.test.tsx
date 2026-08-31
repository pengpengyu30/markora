import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Settings, VaultEntry } from '../types'
import { useNoteWidthMode } from './useNoteWidthMode'

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

function makeEntry(noteWidth: VaultEntry['noteWidth'] = null): VaultEntry {
  return {
    path: '/vault/note.md',
    filename: 'note.md',
    title: 'Note',
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    noteWidth,
    display: null,
    visible: true,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: false,
    fileKind: 'markdown',
  }
}

function makeSettings(note_width_mode: Settings['note_width_mode'] = null): Settings {
  return {
    auto_pull_interval_minutes: null,
    release_channel: null,
    note_width_mode,
  }
}

function renderWidthHook(options: {
  content?: string
  settings?: Settings
  themeRecommendedWidth?: number | null
} = {}) {
  const updateFrontmatter = vi.fn().mockResolvedValue(undefined)
  const deleteFrontmatter = vi.fn().mockResolvedValue(undefined)
  const saveSettings = vi.fn().mockResolvedValue(true)
  const setToastMessage = vi.fn()
  const tabs = [{ entry: makeEntry(), content: options.content ?? '# Note' }]
  const hook = renderHook(() => useNoteWidthMode({
    tabs,
    activeTabPath: tabs[0].entry.path,
    settings: options.settings ?? makeSettings(),
    saveSettings,
    updateFrontmatter,
    deleteFrontmatter,
    themeRecommendedWidth: options.themeRecommendedWidth ?? 1040,
    setToastMessage,
  }))
  return { ...hook, deleteFrontmatter, saveSettings, setToastMessage, updateFrontmatter }
}

describe('useNoteWidthMode', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockInvoke.mockRejectedValue(new Error('content bridge unavailable'))
  })

  it('keeps a null global preference and exposes the selected theme width', () => {
    const { result } = renderWidthHook()

    expect(result.current.defaultNoteWidth).toBeNull()
    expect(result.current.noteWidth).toBe('normal')
    expect(result.current.noteWidthSource).toBe('theme')
    expect(result.current.noteWidthMaxWidth).toBe(1040)
  })

  it('saves Theme default as null without coercing it to normal', async () => {
    const { result, saveSettings } = renderWidthHook({ settings: makeSettings('wide') })

    await act(async () => {
      await result.current.setDefaultNoteWidth(null)
    })

    expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ note_width_mode: null }))
  })

  it('clears a transient width when Use default restores theme inheritance', async () => {
    const { result, deleteFrontmatter, updateFrontmatter } = renderWidthHook()

    await act(async () => {
      await result.current.setNoteWidth('wide')
    })
    expect(result.current.noteWidth).toBe('wide')
    expect(updateFrontmatter).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.setNoteWidth(null)
    })

    expect(result.current.noteWidth).toBe('normal')
    expect(result.current.noteWidthSource).toBe('theme')
    expect(result.current.noteWidthMaxWidth).toBe(1040)
    expect(deleteFrontmatter).not.toHaveBeenCalled()
  })

  it('deletes only _width when the note has safe frontmatter', async () => {
    mockInvoke.mockResolvedValue('---\ntitle: Note\ncustom: keep\n_width: wide\n---\n# Note')
    const { result, deleteFrontmatter } = renderWidthHook({
      content: '---\ntitle: Note\ncustom: keep\n_width: wide\n---\n# Note',
    })

    await act(async () => {
      await result.current.setNoteWidth(null)
    })

    expect(deleteFrontmatter).toHaveBeenCalledWith('/vault/note.md', '_width', { silent: true })
    expect(result.current.noteWidthSource).toBe('theme')
  })
})
