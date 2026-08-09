import { describe, it, expect, vi } from 'vitest'
import { attachClickHandlers, enrichSuggestionItems, hasMultipleSuggestionWorkspaces } from './suggestionEnrichment'
import type { VaultEntry } from '../types'

vi.mock('@blocknote/core/extensions', () => ({
  filterSuggestionItems: <T extends { title: string; aliases: string[] }>(items: T[], query: string) =>
    items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()) || i.aliases.some(a => a.toLowerCase().includes(query.toLowerCase()))),
}))

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/test.md', filename: 'test.md', title: 'Test', isA: null,
    aliases: [], belongsTo: [], relatedTo: [], status: null,
    archived: false, modifiedAt: null, createdAt: null,
    fileSize: 0, snippet: '', wordCount: 0, relationships: {}, icon: null, color: null,
    order: null, template: null, sort: null, outgoingLinks: [],
    ...overrides,
  }
}

describe('attachClickHandlers', () => {
  const vaultPath = '/vault'

  it('inserts relative path stem as wikilink target', () => {
    const insertWikilink = vi.fn()
    const candidates = [
      { title: 'Note A', aliases: [], entryTitle: 'Note A', path: '/vault/a.md' },
      { title: 'Note B', aliases: [], entryTitle: 'Note B', path: '/vault/b.md' },
    ]

    const result = attachClickHandlers(candidates, insertWikilink, vaultPath)

    expect(result).toHaveLength(2)
    result[0].onItemClick()
    expect(insertWikilink).toHaveBeenCalledWith('a')
    result[1].onItemClick()
    expect(insertWikilink).toHaveBeenCalledWith('b')
  })

  it('preserves all original properties', () => {
    const result = attachClickHandlers(
      [{ title: 'X', aliases: ['y'], entryTitle: 'X', path: '/vault/x.md' }],
      vi.fn(),
      vaultPath,
    )
    expect(result[0]).toMatchObject({ title: 'X', aliases: ['y'], path: '/vault/x.md' })
  })

  it('includes subfolder path in wikilink target', () => {
    const insertWikilink = vi.fn()
    const candidates = [
      { title: 'ADR 001', aliases: [], entryTitle: 'ADR 001', path: '/vault/docs/adr/0001-tauri-stack.md' },
    ]

    const result = attachClickHandlers(candidates, insertWikilink, vaultPath)

    result[0].onItemClick()
    expect(insertWikilink).toHaveBeenCalledWith('docs/adr/0001-tauri-stack')
  })

  it('omits any default alias even when the title differs from the path stem', () => {
    const insertWikilink = vi.fn()
    const candidates = [
      { title: 'Roadmap', aliases: [], entryTitle: 'Roadmap', path: '/vault/roadmap.md' },
    ]

    const result = attachClickHandlers(candidates, insertWikilink, vaultPath)

    result[0].onItemClick()
    expect(insertWikilink).toHaveBeenCalledWith('roadmap')
  })

  it('prefixes targets from another workspace with that workspace alias', () => {
    const insertWikilink = vi.fn()
    const source = makeEntry({
      path: '/personal/source.md',
      filename: 'source.md',
      title: 'Source',
      workspace: { id: 'personal', label: 'Personal', alias: 'personal', path: '/personal', shortLabel: 'PE', color: null, icon: null, mounted: true, available: true, defaultForNewNotes: true },
    })
    const target = makeEntry({
      path: '/team/projects/alpha.md',
      filename: 'alpha.md',
      title: 'Alpha',
      workspace: { id: 'team', label: 'Team', alias: 'team', path: '/team', shortLabel: 'TE', color: null, icon: null, mounted: true, available: true, defaultForNewNotes: false },
    })
    const candidates = [
      { title: 'Alpha', aliases: [], entryTitle: 'Alpha', path: target.path, entry: target },
    ]

    const result = attachClickHandlers(candidates, insertWikilink, '/personal', source)

    result[0].onItemClick()
    expect(insertWikilink).toHaveBeenCalledWith('team/projects/alpha')
  })
})

describe('enrichSuggestionItems', () => {
  function makeItem(title: string, path: string) {
    return { title, aliases: [] as string[], entryTitle: title, path, onItemClick: vi.fn() }
  }

  const personalWorkspace = {
    id: 'personal',
    label: 'Personal',
    alias: 'personal',
    path: '/personal',
    shortLabel: 'PE',
    color: 'blue',
    icon: null,
    mounted: true,
    available: true,
    defaultForNewNotes: true,
  }

  const teamWorkspace = {
    id: 'team',
    label: 'Team',
    alias: 'team',
    path: '/team',
    shortLabel: 'TE',
    color: 'green',
    icon: null,
    mounted: true,
    available: true,
    defaultForNewNotes: false,
  }

  it('filters items by query', () => {
    const items = [makeItem('Alpha', '/a.md'), makeItem('Beta', '/b.md')]
    const result = enrichSuggestionItems(items, 'alp', {})
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Alpha')
  })

  it('deduplicates items with the same path', () => {
    const items = [
      makeItem('Note', '/n.md'),
      makeItem('Note Alias', '/n.md'),
    ]
    const result = enrichSuggestionItems(items, '', {})
    expect(result).toHaveLength(1)
  })

  it('limits results to 20', () => {
    const items = Array.from({ length: 30 }, (_, i) => makeItem(`Note ${i}`, `/n${i}.md`))
    const result = enrichSuggestionItems(items, '', {})
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('ranks exact title match first among prefix competitors', () => {
    const items = [
      makeItem('Refactoring Ideas', '/ri.md'),
      makeItem('Refactoring Key Ideas', '/rk.md'),
      makeItem('Refactoring', '/r.md'),
    ]
    const result = enrichSuggestionItems(items, 'Refactoring', {})
    expect(result[0].title).toBe('Refactoring')
  })

  it('keeps workspace metadata visible when the filtered results contain one workspace', () => {
    const items = [
      { ...makeItem('Alpha', '/team/alpha.md'), entry: makeEntry({ path: '/team/alpha.md', workspace: teamWorkspace }) },
      { ...makeItem('Beta', '/personal/beta.md'), entry: makeEntry({ path: '/personal/beta.md', workspace: personalWorkspace }) },
    ]

    const result = enrichSuggestionItems(items, 'Alpha', {
      showWorkspace: hasMultipleSuggestionWorkspaces(items),
    })

    expect(result).toHaveLength(1)
    expect(result[0].workspace).toBe(teamWorkspace)
  })
})
