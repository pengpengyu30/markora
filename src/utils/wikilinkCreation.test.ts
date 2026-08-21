import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { resolveWikilinkCreationRequest } from './wikilinkCreation'

const sourceEntry = {
  path: '/personal/projects/source.md',
  workspace: { path: '/personal' },
} as VaultEntry

const vaults = [
  { label: 'Personal', alias: 'personal', path: '/personal' },
  { label: 'Team', alias: 'team', path: '/team' },
]

describe('resolveWikilinkCreationRequest', () => {
  it('creates simple targets beside the source note', () => {
    expect(resolveWikilinkCreationRequest({
      fallbackVaultPath: '/personal',
      sourceEntry,
      target: 'new-note-topic',
      vaults,
    })).toEqual({
      destination: {
        relativePath: 'projects/new-note-topic.md',
        vaultPath: '/personal',
      },
      title: 'New Note Topic',
    })
  })

  it('uses an explicit Project alias and folder without using the display label as the title', () => {
    expect(resolveWikilinkCreationRequest({
      fallbackVaultPath: '/personal',
      sourceEntry,
      target: 'team/roadmap/new-topic|Visible Label',
      vaults,
    })).toEqual({
      destination: {
        relativePath: 'roadmap/new-topic.md',
        vaultPath: '/team',
      },
      title: 'New Topic',
    })
  })

  it('normalizes traversal without escaping the selected Project', () => {
    expect(resolveWikilinkCreationRequest({
      fallbackVaultPath: '/personal',
      sourceEntry,
      target: '../../outside',
      vaults,
    })?.destination).toEqual({
      relativePath: 'outside.md',
      vaultPath: '/personal',
    })
  })

  it('accepts an explicit markdown extension and rejects empty targets', () => {
    expect(resolveWikilinkCreationRequest({
      fallbackVaultPath: '/personal',
      sourceEntry,
      target: 'new-topic.md',
      vaults,
    })?.title).toBe('New Topic')
    expect(resolveWikilinkCreationRequest({
      fallbackVaultPath: '/personal',
      sourceEntry,
      target: ' | Display only',
      vaults,
    })).toBeNull()
  })
})
