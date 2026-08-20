import { describe, expect, it } from 'vitest'
import type { SidebarSelection, VaultEntry } from '../types'
import { resolveActiveProject, resolveActiveProjectForNote, resolveProjectLocation, selectionForNoteLocation, sidebarSelectionsEqual } from './activeProject'

describe('resolveActiveProject', () => {
  it('uses a selected folder root as the active Project', () => {
    const selection: SidebarSelection = {
      kind: 'folder',
      path: 'docs',
      rootPath: '/projects/second',
    }

    expect(resolveActiveProject(selection, '/projects/default')).toEqual({
      projectPath: '/projects/second',
      folderPath: 'docs',
    })
  })

  it('uses the fallback Project for filters and unscoped folders', () => {
    expect(resolveActiveProject({ kind: 'filter', filter: 'all' }, '/projects/default')).toEqual({
      projectPath: '/projects/default',
      folderPath: '',
    })
    expect(resolveActiveProject({ kind: 'folder', path: 'docs' }, '/projects/default')).toEqual({
      projectPath: '/projects/default',
      folderPath: 'docs',
    })
  })
})

describe('resolveProjectLocation', () => {
  it('chooses the deepest mounted Project containing a note', () => {
    expect(resolveProjectLocation(
      '/projects/parent/nested/notes/topic.md',
      ['/projects/parent', '/projects/parent/nested', '/projects/other'],
      '/projects/default',
    )).toEqual({
      projectPath: '/projects/parent/nested',
      folderPath: 'notes',
    })
  })

  it('falls back to the current Project when no mounted root contains the path', () => {
    expect(resolveProjectLocation('/projects/default/topic.md', [], '/projects/default')).toEqual({
      projectPath: '/projects/default',
      folderPath: '',
    })
  })
})

describe('resolveActiveProjectForNote', () => {
  it('uses the note owning Project instead of the selected fallback Project', () => {
    expect(resolveActiveProjectForNote(
      {
        path: '/projects/edgeclaw/product/01-overview.md',
        workspace: { path: '/projects/edgeclaw' } as NonNullable<VaultEntry['workspace']>,
      },
      ['/projects/lbc-apisix'],
      { projectPath: '/projects/lbc-apisix', folderPath: '' },
    )).toEqual({
      projectPath: '/projects/edgeclaw',
      folderPath: 'product',
    })
  })

  it('does not let a stale nested candidate override the note workspace root', () => {
    expect(resolveActiveProjectForNote(
      {
        path: '/projects/edgeclaw/en/latest/plugins/prometheus.md',
        workspace: { path: '/projects/edgeclaw' } as NonNullable<VaultEntry['workspace']>,
      },
      ['/projects/edgeclaw/en/latest/plugins'],
      { projectPath: '/projects/other', folderPath: '' },
    )).toEqual({
      projectPath: '/projects/edgeclaw',
      folderPath: 'en/latest/plugins',
    })
  })

  it('keeps the fallback Project when there is no active note', () => {
    const fallbackProject = { projectPath: '/projects/lbc-apisix', folderPath: 'kb' }
    expect(resolveActiveProjectForNote(null, ['/projects/edgeclaw'], fallbackProject)).toEqual(fallbackProject)
  })
})

describe('selectionForNoteLocation', () => {
  it('uses the note workspace root when the visible Project list is stale', () => {
    expect(selectionForNoteLocation(
      {
        path: '/projects/edgeclaw/en/latest/plugins/prometheus.md',
        workspace: { path: '/projects/edgeclaw' } as NonNullable<VaultEntry['workspace']>,
      },
      ['/projects/other'],
      '/projects/other',
    )).toEqual({
      kind: 'folder',
      path: 'en/latest/plugins',
      rootPath: '/projects/edgeclaw',
    })
  })
})

describe('sidebarSelectionsEqual', () => {
  it('compares folder selections without assuming every selection has a path', () => {
    expect(sidebarSelectionsEqual(
      { kind: 'filter', filter: 'all' },
      { kind: 'filter', filter: 'all' },
    )).toBe(true)
    expect(sidebarSelectionsEqual(
      { kind: 'filter', filter: 'all' },
      { kind: 'folder', path: 'docs', rootPath: '/projects/one' },
    )).toBe(false)
    expect(sidebarSelectionsEqual(
      { kind: 'folder', path: 'docs', rootPath: '/projects/one' },
      { kind: 'folder', path: 'docs', rootPath: '/projects/two' },
    )).toBe(false)
  })
})
