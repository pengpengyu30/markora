import type { VaultEntry } from '../types'
import { normalizeNotePathForIdentity, notePathsMatch } from './notePathIdentity'
import { isPathInsideVaultRoot } from './vaultPathContainment'

interface MergeChangedVaultEntriesOptions {
  current: VaultEntry[]
  removed: string[]
  upserts: VaultEntry[]
}

function isRemovedPath(path: string, removed: readonly string[]): boolean {
  return removed.some((prefix) => {
    const normalizedPrefix = normalizeNotePathForIdentity(prefix)
    return notePathsMatch(path, normalizedPrefix) || isPathInsideVaultRoot(path, normalizedPrefix)
  })
}

export function preserveWorkspaceOnUpserts(
  upserts: VaultEntry[],
  current: VaultEntry[],
): VaultEntry[] {
  return upserts.map((upsert) => {
    if (upsert.workspace) return upsert
    const existing = current.find((entry) => notePathsMatch(entry.path, upsert.path))
    return existing?.workspace ? { ...upsert, workspace: existing.workspace } : upsert
  })
}

export function mergeChangedVaultEntries({
  current,
  removed,
  upserts,
}: MergeChangedVaultEntriesOptions): VaultEntry[] {
  const nextUpserts = preserveWorkspaceOnUpserts(upserts, current)
  const upsertKeys = new Set(nextUpserts.map((entry) => normalizeNotePathForIdentity(entry.path)))
  const kept = current.filter((entry) => {
    if (isRemovedPath(entry.path, removed)) return false
    return !upsertKeys.has(normalizeNotePathForIdentity(entry.path))
  })
  return [...nextUpserts, ...kept]
}
