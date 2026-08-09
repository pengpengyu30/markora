import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  buildNewEntry,
  buildNoteContent,
  entryMatchesTarget,
  planNewNoteCreation,
  resolveNewNote,
  slugify,
} from './useNoteCreation'

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/vault/test.md',
  filename: 'test.md',
  title: 'Test Note',
  isA: null,
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
  archived: false,
  modifiedAt: 1700000000,
  createdAt: 1700000000,
  fileSize: 100,
  snippet: '',
  wordCount: 0,
  relationships: {},
  icon: null,
  color: null,
  order: null,
  outgoingLinks: [],
  template: null,
  sort: null,
  sidebarLabel: null,
  view: null,
  visible: null,
  properties: {},
  organized: false,
  favorite: false,
  favoriteIndex: null,
  listPropertiesDisplay: [],
  hasH1: false,
  ...overrides,
})

describe('slugify', () => {
  it('converts text to lowercase kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('preserves unicode letters and falls back for empty slugs', () => {
    expect(slugify('停智慧')).toBe('停智慧')
    expect(slugify('')).toBe('untitled')
    expect(slugify('+++')).not.toBe('')
  })
})

describe('buildNewEntry', () => {
  it('creates a plain note entry without organization metadata', () => {
    const entry = buildNewEntry({
      path: '/vault/my-note.md',
      slug: 'my-note',
      title: 'My Note',
    })

    expect(entry).toMatchObject({
      path: '/vault/my-note.md',
      filename: 'my-note.md',
      title: 'My Note',
      isA: null,
      status: null,
      archived: false,
      favorite: false,
      organized: false,
    })
    expect(entry.createdAt).toBe(entry.modifiedAt)
  })
})

describe('entryMatchesTarget', () => {
  it('matches title, alias, filename stem, and wikilink pipe labels', () => {
    const entry = makeEntry({
      path: '/vault/project/alpha.md',
      filename: 'alpha.md',
      title: 'Alpha',
      aliases: ['A'],
    })

    expect(entryMatchesTarget({ entry, target: 'alpha' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'a' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'project/alpha' })).toBe(true)
    expect(entryMatchesTarget({ entry, target: 'project/alpha|Alpha Project' })).toBe(true)
  })

  it('returns false when nothing matches', () => {
    expect(entryMatchesTarget({ entry: makeEntry(), target: 'missing' })).toBe(false)
  })
})

describe('buildNoteContent', () => {
  it('creates an empty Markdown body without frontmatter', () => {
    expect(buildNoteContent({})).toBe('')
  })

  it('can provide the blank H1 used by immediate note creation', () => {
    expect(buildNoteContent({ initialEmptyHeading: true })).toBe('\n# \n\n')
  })

  it('retains the sheet compatibility format until the editor milestone', () => {
    expect(buildNoteContent({ format: 'sheet' })).toBe('---\n_display: sheet\n---\n')
  })
})

describe('resolveNewNote', () => {
  it('creates a root note with no frontmatter', () => {
    const { entry, content } = resolveNewNote({ title: 'My Project', vaultPath: '/vault' })

    expect(entry.path).toBe('/vault/my-project.md')
    expect(entry.isA).toBeNull()
    expect(entry.status).toBeNull()
    expect(content).toBe('')
  })

  it('uses the configured default workspace when it is available', () => {
    const { entry } = resolveNewNote({
      title: 'Team Brief',
      vaultPath: '/personal',
      defaultWorkspacePath: '/team',
      vaults: [
        { label: 'Personal', path: '/personal', alias: 'personal', available: true, mounted: true },
        { label: 'Team Notes', path: '/team', alias: 'team', color: 'green', available: true, mounted: true },
      ],
    })

    expect(entry.path).toBe('/team/team-brief.md')
    expect(entry.workspace).toMatchObject({ alias: 'team', defaultForNewNotes: true })
  })

  it('falls back to the active workspace when the configured default is unavailable', () => {
    const { entry } = resolveNewNote({
      title: 'Local Brief',
      vaultPath: '/personal',
      defaultWorkspacePath: '/team',
      vaults: [
        { label: 'Personal', path: '/personal', alias: 'personal', available: true, mounted: true },
        { label: 'Team Notes', path: '/team', alias: 'team', available: false, mounted: true },
      ],
    })

    expect(entry.path).toBe('/personal/local-brief.md')
    expect(entry.workspace?.alias).toBe('personal')
  })
})

describe('planNewNoteCreation', () => {
  it('blocks a note when its normalized path already exists', () => {
    const plan = planNewNoteCreation({
      entries: [makeEntry({ path: '/private/tmp/vault/briefing.md', filename: 'briefing.md' })],
      title: 'Briefing',
      vaultPath: '/tmp/vault',
    })

    expect(plan).toEqual({
      status: 'blocked',
      message: 'Cannot create note "Briefing" because briefing.md already exists',
    })
  })

  it('returns a ready plain Markdown note when the path is free', () => {
    const plan = planNewNoteCreation({ entries: [], title: 'Briefing', vaultPath: '/vault' })

    expect(plan).toMatchObject({
      status: 'create',
      resolved: {
        entry: { path: '/vault/briefing.md', isA: null, status: null },
        content: '',
      },
    })
  })
})
