import { useMemo } from 'react'
import type { VaultEntry } from '../types'

interface EntryTargetMatcher {
  exactTargets: Set<string>
  pathSuffixes: Set<string>
}

function getEntryPathSuffixes(entryPath: string): string[] {
  const pathWithoutExtension = entryPath.replace(/\.md$/, '').replace(/^\/+/, '')
  const segments = pathWithoutExtension.split('/')
  const suffixes: string[] = []

  for (let index = 0; index < segments.length; index += 1) {
    suffixes.push(segments.slice(index).join('/').toLowerCase())
  }

  return suffixes
}

function buildEntryTargetMatcher(entry: VaultEntry): EntryTargetMatcher {
  return {
    exactTargets: new Set([
      entry.filename.replace(/\.md$/, ''),
      entry.title,
      ...entry.aliases,
    ]),
    pathSuffixes: new Set(getEntryPathSuffixes(entry.path)),
  }
}

function targetMatchesEntry(rawTarget: string, matcher: EntryTargetMatcher): boolean {
  const target = rawTarget
  const lastSegment = target.split('/').pop() ?? ''
  return matcher.exactTargets.has(target)
    || matcher.exactTargets.has(lastSegment)
    || (target.includes('/') && matcher.pathSuffixes.has(target.toLowerCase()))
}

function collectBacklinks(entry: VaultEntry, entries: VaultEntry[]): BacklinkItem[] {
  const matcher = buildEntryTargetMatcher(entry)
  const backlinks: BacklinkItem[] = []

  for (const sourceEntry of entries) {
    if (sourceEntry.path === entry.path) continue
    if (sourceEntry.outgoingLinks.some((target) => targetMatchesEntry(target, matcher))) {
      backlinks.push({ entry: sourceEntry, context: null })
    }
  }

  return backlinks
}

export interface BacklinkItem {
  entry: VaultEntry
  context: string | null
}

export function useBacklinks(entry: VaultEntry | null, entries: VaultEntry[]): BacklinkItem[] {
  return useMemo(() => (entry ? collectBacklinks(entry, entries) : []), [entry, entries])
}

export function collectBacklinksForEntry(entry: VaultEntry, entries: VaultEntry[]): BacklinkItem[] {
  return collectBacklinks(entry, entries)
}
