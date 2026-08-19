import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import {
  filterEntriesToVisibleWorkspaces,
  visibleWorkspacePaths,
  workspaceIdentityFromVault,
  workspaceLocationLabel,
} from './workspaces'

function entry(path: string, workspacePath: string): VaultEntry {
  return { path, workspace: workspaceIdentityFromVault({ label: workspacePath, path: workspacePath }), } as VaultEntry
}

describe('project workspace graph helpers', () => {
  it('keeps the configured project identity metadata for graph entries', () => {
    expect(workspaceIdentityFromVault({
      alias: 'edge-console',
      color: 'blue',
      label: 'Edge Console',
      path: '/projects/edge-console',
      shortLabel: 'EC',
    }, { defaultWorkspacePath: '/projects/edge-console' })).toMatchObject({
      alias: 'edge-console',
      color: 'blue',
      defaultForNewNotes: true,
      label: 'Edge Console',
      path: '/projects/edge-console',
      shortLabel: 'EC',
    })
  })

  it('returns all mounted project roots in stable order', () => {
    expect(visibleWorkspacePaths({
      defaultVaultPath: '/projects/edge',
      enabled: true,
      vaults: [
        { label: 'Edge', path: '/projects/edge', mounted: true },
        { label: 'Tolaria', path: '/projects/tolaria', mounted: true },
        { label: 'Hidden', path: '/projects/hidden', mounted: false },
      ],
    })).toEqual(['/projects/edge', '/projects/tolaria'])
  })

  it('filters aggregate note entries to the visible project roots', () => {
    expect(filterEntriesToVisibleWorkspaces([
      entry('/projects/edge/a.md', '/projects/edge'),
      entry('/projects/tolaria/b.md', '/projects/tolaria'),
    ], ['/projects/tolaria']).map((item) => item.path)).toEqual(['/projects/tolaria/b.md'])
  })

  it('formats a Project and nested folder for search result context', () => {
    const note = entry('/projects/edge/docs/design/overview.md', '/projects/edge')
    note.workspace = workspaceIdentityFromVault({ label: 'Edgeclaw', path: '/projects/edge' })

    expect(workspaceLocationLabel(note)).toBe('Edgeclaw / docs / design')
  })

  it('formats a Project root note without a trailing folder', () => {
    const note = entry('/projects/edge/README.md', '/projects/edge')
    note.workspace = workspaceIdentityFromVault({ label: 'Edgeclaw', path: '/projects/edge' })

    expect(workspaceLocationLabel(note)).toBe('Edgeclaw')
  })
})
