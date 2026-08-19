import type { SidebarSelection } from '../types'

export function resolveStartupSelection(
  defaultWorkspacePath: string | null | undefined,
  resolvedPath: string,
): SidebarSelection {
  const projectPath = defaultWorkspacePath?.trim() || resolvedPath.trim()
  return projectPath
    ? { kind: 'folder', path: '', rootPath: projectPath, includeDescendants: true }
    : { kind: 'filter', filter: 'all' }
}
