import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNoteActions, type NoteActionsConfig } from './useNoteActions'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('../mock-tauri', () => ({
  isTauri: vi.fn(() => false),
  addMockEntry: vi.fn(),
  updateMockContent: vi.fn(),
  trackMockChange: vi.fn(),
  mockInvoke: vi.fn().mockResolvedValue(''),
}))
vi.mock('./mockFrontmatterHelpers', () => ({
  updateMockFrontmatter: vi.fn().mockReturnValue('---\nupdated: true\n---\n'),
  deleteMockFrontmatterProperty: vi.fn().mockReturnValue('---\n---\n'),
}))

function makeConfig(onFrontmatterPersisted: () => void): NoteActionsConfig {
  return {
    addEntry: vi.fn(),
    removeEntry: vi.fn(),
    entries: [],
    setToastMessage: vi.fn(),
    updateEntry: vi.fn(),
    vaultPath: '/test/vault',
    onFrontmatterPersisted,
  }
}

describe('useNoteActions frontmatter persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('notifies after a writable frontmatter update completes', async () => {
    const onFrontmatterPersisted = vi.fn()
    const { result } = renderHook(() => useNoteActions(makeConfig(onFrontmatterPersisted)))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
    })

    expect(onFrontmatterPersisted).toHaveBeenCalledTimes(1)
  })

  it('flushes pending raw content before a writable frontmatter update', async () => {
    const flushBeforeNoteMutation = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useNoteActions({
      ...makeConfig(vi.fn()),
      flushBeforeNoteMutation,
    }))

    await act(async () => {
      await result.current.handleUpdateFrontmatter('/vault/note.md', '_width', 'wide')
    })

    expect(flushBeforeNoteMutation).toHaveBeenCalledWith('/vault/note.md')
  })
})
