import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildTagCounts,
  filterEntriesByTags,
  getTagInputError,
  getEntryTags,
  normalizeNoteTags,
  normalizeTagInput,
} from './noteTags'

function makeEntry(path: string, properties: VaultEntry['properties']): VaultEntry {
  return { path, properties } as VaultEntry
}

describe('noteTags', () => {
  it('normalizes frontmatter values that collapse to a scalar or remain arrays', () => {
    expect(normalizeNoteTags(' ALPHA ')).toEqual(['alpha'])
    expect(normalizeNoteTags([' Alpha ', '', 'BETA', 'alpha'])).toEqual(['alpha', 'beta'])
    expect(normalizeNoteTags(null)).toEqual([])
  })

  it('reads tags from the generic entry properties without parsing note body text', () => {
    const entry = makeEntry('/vault/one.md', { tags: ['alpha'], body: '#not-a-tag' })

    expect(getEntryTags(entry)).toEqual(['alpha'])
  })

  it('normalizes valid typed tag creation input to lowercase', () => {
    expect(normalizeTagInput('  Release-2026  ')).toBe('release-2026')
    expect(normalizeTagInput('   ')).toBeNull()
  })

  it('rejects unsupported tag characters and values longer than 15 characters', () => {
    expect(normalizeTagInput('release_notes')).toBeNull()
    expect(normalizeTagInput('release+notes')).toBeNull()
    expect(normalizeTagInput('release--notes')).toBeNull()
    expect(normalizeTagInput('abcdefghijklmnop')).toBeNull()
    expect(getTagInputError('release_notes')).toBe('invalid')
    expect(getTagInputError('abcdefghijklmnop')).toBe('tooLong')
    expect(getTagInputError('release-1')).toBeNull()
  })

  it('counts each tag once per note and sorts by usage then name', () => {
    const entries = [
      makeEntry('/vault/a.md', { tags: ['shared', 'alpha', 'shared'] }),
      makeEntry('/vault/b.md', { tags: ['shared', 'beta'] }),
      makeEntry('/vault/c.md', { tags: 'beta' }),
    ]

    expect(buildTagCounts(entries)).toEqual([
      { name: 'beta', count: 2 },
      { name: 'shared', count: 2 },
      { name: 'alpha', count: 1 },
    ])
  })

  it('applies multiple selected tags with AND semantics and clears to all entries', () => {
    const entries = [
      makeEntry('/vault/a.md', { tags: ['shared', 'alpha'] }),
      makeEntry('/vault/b.md', { tags: ['shared', 'beta'] }),
      makeEntry('/vault/c.md', { tags: ['alpha'] }),
    ]

    expect(filterEntriesByTags(entries, ['shared', 'alpha']).map((entry) => entry.path)).toEqual(['/vault/a.md'])
    expect(filterEntriesByTags(entries, ['missing'])).toEqual([])
    expect(filterEntriesByTags(entries, [])).toEqual(entries)
  })
})
