import { describe, expect, it } from 'vitest'
import {
  filterEntries,
  SORT_OPTIONS,
} from './noteListHelpers'
import { allSelection, makeEntry } from '../test-utils/noteListTestUtils'

describe('filterEntries', () => {
  it('includes legacy archived notes in All Notes', () => {
    const entries = [
      makeEntry({ path: '/active.md', title: 'Active' }),
      makeEntry({ path: '/archived.md', title: 'Archived', archived: true }),
    ]

    expect(filterEntries(entries, allSelection).map((entry) => entry.title)).toEqual(['Active', 'Archived'])
  })

  it('excludes attachments-folder markdown from the All Notes view', () => {
    const entries = [
      makeEntry({ path: '/vault/note/real-note.md', title: 'Real Note', isA: 'Note' }),
      makeEntry({ path: '/vault/attachments/reference.md', title: 'Attachment Markdown', isA: 'Note' }),
      makeEntry({ path: '/vault/attachments/nested/diagram.md', title: 'Nested Attachment Markdown', isA: 'Note' }),
      makeEntry({ path: 'C:\\Users\\luca\\Vault\\attachments\\windows.md', title: 'Windows Attachment Markdown', isA: 'Note' }),
    ]

    const result = filterEntries(entries, allSelection, { subFilter: 'open' })
    expect(result.map((entry) => entry.title)).toEqual(['Real Note'])
  })

  it('hides PDFs, images, and unsupported files from All Notes by default', () => {
    const entries = [
      makeEntry({ path: '/vault/note.md', filename: 'note.md', title: 'Note', fileKind: 'markdown' }),
      makeEntry({ path: '/vault/Guide.PDF', filename: 'Guide.PDF', title: 'PDF', fileKind: 'binary' }),
      makeEntry({ path: '/vault/Cover.JpG', filename: 'Cover.JpG', title: 'Image', fileKind: 'binary' }),
      makeEntry({ path: '/vault/config.yml', filename: 'config.yml', title: 'Text', fileKind: 'text' }),
      makeEntry({ path: '/vault/archive.zip', filename: 'archive.zip', title: 'Archive', fileKind: 'binary' }),
    ]

    const result = filterEntries(entries, allSelection, { subFilter: 'open' })

    expect(result.map((entry) => entry.title)).toEqual(['Note'])
  })

  it('shows selected non-Markdown categories in All Notes without swallowing PDFs or images into unsupported files', () => {
    const entries = [
      makeEntry({ path: '/vault/note.md', filename: 'note.md', title: 'Note', fileKind: 'markdown' }),
      makeEntry({ path: '/vault/Guide.PDF', filename: 'Guide.PDF', title: 'PDF', fileKind: 'binary' }),
      makeEntry({ path: '/vault/Cover.JpG', filename: 'Cover.JpG', title: 'Image', fileKind: 'binary' }),
      makeEntry({ path: '/vault/config.yml', filename: 'config.yml', title: 'Text', fileKind: 'text' }),
      makeEntry({ path: '/vault/archive.zip', filename: 'archive.zip', title: 'Archive', fileKind: 'binary' }),
    ]

    expect(
      filterEntries(entries, allSelection, {
        subFilter: 'open',
        allNotesFileVisibility: {
          pdfs: true,
          images: false,
          unsupported: false,
        },
      }).map((entry) => entry.title),
    ).toEqual(['Note', 'PDF'])
    expect(
      filterEntries(entries, allSelection, {
        subFilter: 'open',
        allNotesFileVisibility: {
          pdfs: false,
          images: true,
          unsupported: false,
        },
      }).map((entry) => entry.title),
    ).toEqual(['Note', 'Image'])
    expect(
      filterEntries(entries, allSelection, {
        subFilter: 'open',
        allNotesFileVisibility: {
          pdfs: false,
          images: false,
          unsupported: true,
        },
      }).map((entry) => entry.title),
    ).toEqual(['Note', 'Text', 'Archive'])
  })

  it('matches slash-based folder selections against Windows entry paths', () => {
    const entries = [
      makeEntry({ path: 'C:\\Users\\luca\\Vault\\Client Work\\Alpha.md', title: 'Alpha' }),
      makeEntry({ path: 'C:\\Users\\luca\\Vault\\Client Work\\Nested\\Beta.md', title: 'Beta' }),
      makeEntry({ path: 'C:\\Users\\luca\\Vault\\Client Work Archive\\Old.md', title: 'Archive' }),
      makeEntry({ path: 'C:\\Users\\luca\\Vault\\客户\\计划.md', title: 'Unicode' }),
    ]

    expect(filterEntries(entries, { kind: 'folder', path: 'Client Work' }).map((entry) => entry.title)).toEqual(['Alpha', 'Beta'])
    expect(filterEntries(entries, { kind: 'folder', path: '客户' }).map((entry) => entry.title)).toEqual(['Unicode'])
  })

  it('shows only direct root-level files when selecting the vault root folder', () => {
    const entries = [
      makeEntry({ path: '/Users/luca/Laputa/root-note.md', title: 'Root Note', fileKind: 'markdown' }),
      makeEntry({ path: '/Users/luca/Laputa/config.json', title: 'config.json', fileKind: 'text' }),
      makeEntry({ path: '/Users/luca/Laputa/projects/nested.md', title: 'Nested Note', fileKind: 'markdown' }),
      makeEntry({ path: '/Users/luca/Laputa/assets/logo.png', title: 'Logo', fileKind: 'binary' }),
    ]

    const result = filterEntries(entries, { kind: 'folder', path: '', rootPath: '/Users/luca/Laputa' })

    expect(result.map((entry) => entry.title)).toEqual(['Root Note', 'config.json'])
  })

  it('keeps same-named folders isolated by their vault root', () => {
    const entries = [
      makeEntry({ path: '/Users/luca/Personal/projects/personal.md', title: 'Personal Project' }),
      makeEntry({ path: '/Users/luca/Team/projects/team.md', title: 'Team Project' }),
      makeEntry({ path: '/Users/luca/Team/archive/team.md', title: 'Team Archive' }),
    ]

    const result = filterEntries(entries, {
      kind: 'folder',
      path: 'projects',
      rootPath: '/Users/luca/Team',
    })

    expect(result.map((entry) => entry.title)).toEqual(['Team Project'])
  })

  it('keeps folder browsing independent from All Notes file visibility', () => {
    const entries = [
      makeEntry({ path: '/vault/assets/spec.PDF', filename: 'spec.PDF', title: 'Spec', fileKind: 'binary' }),
      makeEntry({ path: '/vault/assets/logo.PNG', filename: 'logo.PNG', title: 'Logo', fileKind: 'binary' }),
      makeEntry({ path: '/vault/assets/data.sqlite', filename: 'data.sqlite', title: 'Data', fileKind: 'binary' }),
    ]

    const result = filterEntries(entries, { kind: 'folder', path: 'assets' })

    expect(result.map((entry) => entry.title)).toEqual(['Spec', 'Logo', 'Data'])
  })
})

describe('simplified note list options', () => {
  it('does not expose status sorting', () => {
    expect(SORT_OPTIONS.map((option) => option.value)).toEqual(['modified', 'created', 'title'])
  })
})
