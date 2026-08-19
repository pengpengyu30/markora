import { describe, expect, it } from 'vitest'
import { resolveStartupSelection } from './startupSelection'

describe('resolveStartupSelection', () => {
  it('selects the configured default Project root', () => {
    expect(resolveStartupSelection('/projects/default', '/projects/active')).toEqual({
      kind: 'folder',
      path: '',
      rootPath: '/projects/default',
      includeDescendants: true,
    })
  })

  it('falls back to the active Project when no default is configured', () => {
    expect(resolveStartupSelection(null, '/projects/active')).toEqual({
      kind: 'folder',
      path: '',
      rootPath: '/projects/active',
      includeDescendants: true,
    })
  })

  it('keeps the global selection when no Project path is available', () => {
    expect(resolveStartupSelection(null, '')).toEqual({ kind: 'filter', filter: 'all' })
  })
})
