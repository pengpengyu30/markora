import { describe, expect, it, vi } from 'vitest'
import type { ModifiedFile } from '../types'
import {
  activeVaultModifiedFiles,
  mergeModifiedFiles,
  runEditorHistoryCommand,
  shouldPreferOnboardingVaultPath,
} from './appOrchestration'

function modifiedFile(overrides: Partial<ModifiedFile>): ModifiedFile {
  return {
    path: `/vault/${overrides.relativePath ?? 'note.md'}`,
    relativePath: 'note.md',
    status: 'modified',
    ...overrides,
  }
}

describe('app orchestration helpers', () => {
  it('fills missing vault paths on active-vault modified files', () => {
    expect(activeVaultModifiedFiles([
      modifiedFile({ relativePath: 'a.md' }),
      modifiedFile({ relativePath: 'b.md', vaultPath: '/other' }),
    ], '/vault')).toEqual([
      modifiedFile({ relativePath: 'a.md', vaultPath: '/vault' }),
      modifiedFile({ relativePath: 'b.md', vaultPath: '/other' }),
    ])
  })

  it('deduplicates modified files by vault, path, and status with later groups winning', () => {
    expect(mergeModifiedFiles(
      [modifiedFile({ relativePath: 'a.md', status: 'modified', vaultPath: '/vault', addedLines: 1 })],
      [modifiedFile({ relativePath: 'a.md', status: 'modified', vaultPath: '/vault', addedLines: 2 })],
      [modifiedFile({ relativePath: 'a.md', status: 'deleted', vaultPath: '/vault' })],
    )).toEqual([
      modifiedFile({ relativePath: 'a.md', status: 'modified', vaultPath: '/vault', addedLines: 2 }),
      modifiedFile({ relativePath: 'a.md', status: 'deleted', vaultPath: '/vault' }),
    ])
  })

  it('prefers onboarding vault paths only before the switcher has registered them', () => {
    expect(shouldPreferOnboardingVaultPath({ status: 'ready', vaultPath: '/new' }, [{ path: '/old' }])).toBe(true)
    expect(shouldPreferOnboardingVaultPath({ status: 'ready', vaultPath: '/new' }, [{ path: '/new' }])).toBe(false)
    expect(shouldPreferOnboardingVaultPath({ status: 'loading', vaultPath: '/new' }, [])).toBe(false)
  })

  it('runs history only for the currently selected document', () => {
    const undo = vi.fn(() => true)
    const redo = vi.fn(() => true)
    const history = { path: '/vault/note.md', undo, redo }

    expect(runEditorHistoryCommand(history, '/vault/note.md', 'undo')).toBe(true)
    expect(runEditorHistoryCommand(history, '/vault/note.md', 'redo')).toBe(true)
    expect(undo).toHaveBeenCalledOnce()
    expect(redo).toHaveBeenCalledOnce()
  })

  it('does not run stale or global history when no document is selected', () => {
    const undo = vi.fn(() => true)
    const history = { path: '/vault/note.md', undo, redo: vi.fn(() => true) }

    expect(runEditorHistoryCommand(history, null, 'undo')).toBe(false)
    expect(runEditorHistoryCommand(history, '/vault/other.md', 'undo')).toBe(false)
    expect(undo).not.toHaveBeenCalled()
  })
})
