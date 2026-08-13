import type { SidebarSelection } from '../types'
import {
  normalizeNotePathSeparators,
  normalizeVaultRelativePath,
  notePathFilename,
} from './notePathIdentity'

export interface ActiveProject {
  projectPath: string
  folderPath: string
}

function normalizeAbsolutePath(path: string): string {
  const normalized = normalizeNotePathSeparators(path.trim())
  if (normalized === '/') return normalized
  return normalized.replace(/\/+$/u, '')
}

function isPathInsideRoot(path: string, root: string): boolean {
  const normalizedPath = normalizeAbsolutePath(path)
  const normalizedRoot = normalizeAbsolutePath(root)
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`)
}

function folderPathForNote(notePath: string, projectPath: string): string {
  const normalizedNotePath = normalizeAbsolutePath(notePath)
  const normalizedProjectPath = normalizeAbsolutePath(projectPath)
  if (!isPathInsideRoot(normalizedNotePath, normalizedProjectPath)) return ''

  const relativeNotePath = normalizedNotePath.slice(normalizedProjectPath.length).replace(/^\/+/, '')
  const filename = notePathFilename(relativeNotePath)
  const relativeFolder = relativeNotePath.slice(0, Math.max(0, relativeNotePath.length - filename.length))
  return normalizeVaultRelativePath(relativeFolder)
}

export function resolveActiveProject(
  selection: SidebarSelection,
  fallbackProjectPath: string,
): ActiveProject {
  if (selection.kind === 'folder' && selection.rootPath?.trim()) {
    return {
      projectPath: selection.rootPath,
      folderPath: normalizeVaultRelativePath(selection.path),
    }
  }

  return {
    projectPath: fallbackProjectPath,
    folderPath: selection.kind === 'folder' ? normalizeVaultRelativePath(selection.path) : '',
  }
}

export function resolveProjectLocation(
  notePath: string,
  projectPaths: readonly string[],
  fallbackProjectPath: string,
): ActiveProject {
  const matchingProjectPath = projectPaths
    .filter((projectPath) => projectPath.trim() && isPathInsideRoot(notePath, projectPath))
    .sort((left, right) => normalizeAbsolutePath(right).length - normalizeAbsolutePath(left).length)[0]

  const projectPath = matchingProjectPath ?? fallbackProjectPath
  return {
    projectPath,
    folderPath: folderPathForNote(notePath, projectPath),
  }
}

export function selectionForProjectLocation(location: ActiveProject): SidebarSelection {
  return {
    kind: 'folder',
    path: normalizeVaultRelativePath(location.folderPath),
    rootPath: location.projectPath,
  }
}

export function sidebarSelectionsEqual(
  left: SidebarSelection,
  right: SidebarSelection,
): boolean {
  if (left.kind !== right.kind) return false
  if (left.kind === 'filter' && right.kind === 'filter') {
    return left.filter === right.filter
  }
  if (left.kind !== 'folder' || right.kind !== 'folder') return false
  return left.path === right.path && left.rootPath === right.rootPath
}
