import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { collectBacklinksForEntry } from './useBacklinks'

describe('collectBacklinksForEntry', () => {
  it('matches wikilinks by title, alias, and vault-relative path without including the note itself', () => {
    const target = makeEntry({
      path: '/vault/topic/target.md',
      filename: 'target.md',
      title: 'Target Note',
      aliases: ['The Target'],
    })
    const titleSource = makeEntry({
      path: '/vault/title-source.md',
      title: 'Title Source',
      outgoingLinks: ['Target Note'],
    })
    const aliasSource = makeEntry({
      path: '/vault/alias-source.md',
      title: 'Alias Source',
      outgoingLinks: ['The Target'],
    })
    const pathSource = makeEntry({
      path: '/vault/path-source.md',
      title: 'Path Source',
      outgoingLinks: ['topic/target'],
    })
    const unrelated = makeEntry({
      path: '/vault/unrelated.md',
      title: 'Unrelated',
      outgoingLinks: ['Other Note'],
    })

    const backlinks = collectBacklinksForEntry(target, [target, titleSource, aliasSource, pathSource, unrelated])

    expect(backlinks.map(({ entry }) => entry.path)).toEqual([
      titleSource.path,
      aliasSource.path,
      pathSource.path,
    ])
  })

  it('does not require the active note to be present in the entry list', () => {
    const target = makeEntry({ path: '/vault/target.md', title: 'Target Note' })
    const source = makeEntry({ title: 'Source Note', outgoingLinks: ['Target Note'] })

    expect(collectBacklinksForEntry(target, [source])).toEqual([{ entry: source, context: null }])
  })
})
