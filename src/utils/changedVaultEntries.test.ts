import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { mergeChangedVaultEntries } from './changedVaultEntries'

function makeEntry(path: string, title: string): VaultEntry {
  return {
    path,
    title,
    filename: path.split('/').pop() ?? 'note.md',
    snippet: '',
    wordCount: 0,
    outgoingLinks: [],
  } as VaultEntry
}

describe('mergeChangedVaultEntries', () => {
  it('upserts edited notes, adds new notes, and drops removed notes', () => {
    const current = [
      makeEntry('/vault/keep.md', 'Keep'),
      makeEntry('/vault/edit.md', 'Old'),
      makeEntry('/vault/gone.md', 'Gone'),
    ]

    const merged = mergeChangedVaultEntries({
      current,
      upserts: [
        makeEntry('/vault/edit.md', 'Fresh'),
        makeEntry('/vault/new.md', 'New'),
      ],
      removed: ['/vault/gone.md', '/vault/rca'],
    })

    expect(merged.map((entry) => [entry.path, entry.title])).toEqual([
      ['/vault/edit.md', 'Fresh'],
      ['/vault/new.md', 'New'],
      ['/vault/keep.md', 'Keep'],
    ])
  })

  it('drops notes that lived under a removed folder prefix', () => {
    const current = [
      makeEntry('/vault/keep.md', 'Keep'),
      makeEntry('/vault/rca/one.md', 'One'),
      makeEntry('/vault/rca/two.md', 'Two'),
    ]

    const merged = mergeChangedVaultEntries({
      current,
      upserts: [],
      removed: ['/vault/rca'],
    })

    expect(merged.map((entry) => entry.path)).toEqual(['/vault/keep.md'])
  })
})
