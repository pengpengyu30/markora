import type { VaultEntry } from '../../types'
import { extractH1TitleFromContent } from '../../utils/noteTitle'
import { noteDisplaysAsSheet } from '../../utils/noteFormat'
import { countWords } from '../../utils/wikilinks'
import { isHtmlFileEntry } from '../../utils/filePreview'

export interface EditorContentTab {
  entry: VaultEntry
  content: string
}

interface EditorContentStateInput {
  activeTab: EditorContentTab | null
  entries: VaultEntry[]
  rawMode: boolean
}

interface VisibilityState {
  effectiveRawMode: boolean
  isDeletedPreview: boolean
  isHtmlFile: boolean
  isNonMarkdownText: boolean
  legacyUnsupportedKind: LegacyUnsupportedNoteKind | null
  showEditor: boolean
}

export type LegacyUnsupportedNoteKind = 'sheet'

const entryLookupCache = new WeakMap<VaultEntry[], Map<string, VaultEntry>>()

function getEntryLookup(entries: VaultEntry[]): Map<string, VaultEntry> {
  const cached = entryLookupCache.get(entries)
  if (cached) return cached

  const lookup = new Map<string, VaultEntry>()
  for (const entry of entries) {
    lookup.set(entry.path, entry)
  }

  entryLookupCache.set(entries, lookup)
  return lookup
}

export interface EditorContentState {
  freshEntry: VaultEntry | undefined
  hasH1: boolean
  isDeletedPreview: boolean
  isHtmlFile: boolean
  isNonMarkdownText: boolean
  legacyUnsupportedKind: LegacyUnsupportedNoteKind | null
  effectiveRawMode: boolean
  showEditor: boolean
  path: string
  wordCount: number
}

function findFreshEntry(activeTab: EditorContentTab | null, entries: VaultEntry[]): VaultEntry | undefined {
  if (!activeTab) return undefined
  return getEntryLookup(entries).get(activeTab.entry.path)
}

function contentHasTopLevelH1(activeTab: EditorContentTab | null): boolean {
  return activeTab ? extractH1TitleFromContent(activeTab.content) !== null : false
}

function resolveHasH1(activeTab: EditorContentTab | null, freshEntry: VaultEntry | undefined): boolean {
  return contentHasTopLevelH1(activeTab) || freshEntry?.hasH1 === true || activeTab?.entry.hasH1 === true
}

function resolveLegacyUnsupportedKind(
  activeTab: EditorContentTab | null,
  freshEntry: VaultEntry | undefined,
): LegacyUnsupportedNoteKind | null {
  if (!activeTab || activeTab.entry.fileKind === 'binary') return null
  if (noteDisplaysAsSheet({
    content: activeTab.content,
    display: freshEntry?.display ?? activeTab.entry.display,
    fileKind: activeTab.entry.fileKind,
  })) return 'sheet'
  return null
}

function deriveVisibilityState(input: {
  activeTab: EditorContentTab | null
  freshEntry: VaultEntry | undefined
  rawMode: boolean
}): VisibilityState {
  const {
    activeTab,
    freshEntry,
    rawMode,
  } = input
  const isDeletedPreview = !!activeTab && !freshEntry
  const legacyUnsupportedKind = resolveLegacyUnsupportedKind(activeTab, freshEntry)
  const isHtmlFile = !!activeTab && isHtmlFileEntry(activeTab.entry)
  const isNonMarkdownText = activeTab?.entry.fileKind === 'text' && !legacyUnsupportedKind && !isHtmlFile
  const effectiveRawMode = rawMode || isNonMarkdownText

  return {
    isDeletedPreview,
    isHtmlFile,
    isNonMarkdownText,
    legacyUnsupportedKind,
    effectiveRawMode,
    showEditor: !effectiveRawMode,
  }
}

export function deriveEditorContentState(input: EditorContentStateInput): EditorContentState {
  const { activeTab, entries, rawMode } = input
  const freshEntry = findFreshEntry(activeTab, entries)
  const hasH1 = resolveHasH1(activeTab, freshEntry)
  const visibilityState = deriveVisibilityState({
    activeTab,
    freshEntry,
    rawMode,
  })

  return {
    freshEntry,
    hasH1,
    ...visibilityState,
    path: activeTab?.entry.path ?? '',
    wordCount: activeTab ? countWords(activeTab.content) : 0,
  }
}
