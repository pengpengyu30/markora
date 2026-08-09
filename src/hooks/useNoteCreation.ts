import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, addMockEntry, mockInvoke } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { slugifyNoteStem as slugify } from '../utils/noteSlug'
import { resolveEntry } from '../utils/wikilink'
import { trackEvent } from '../lib/telemetry'
import { cacheNoteContent } from './useTabManagement'
import {
  findByCollidingNotePath,
  joinVaultPath,
  normalizeVaultRelativePath,
  notePathFilename,
} from '../utils/notePathIdentity'
import { labelFromWorkspacePath, workspaceIdentityFromVault } from '../utils/workspaces'
import {
  NOTE_FORMAT_FRONTMATTER_KEY,
  NOTE_FORMAT_SHEET,
  NOTE_FORMAT_TEXT,
  normalizeNoteFormat,
  type NoteFormat,
} from '../utils/noteFormat'
import type { VaultOption } from '../components/status-bar/types'
import { useCreateNoteInFolderRequests } from './noteCreationRequests'
import { requestEditorFocus } from './useEditorFocus'

export interface NewEntryParams {
  path: string
  slug: string
  title: string
}

export function buildNewEntry({ path, slug, title }: NewEntryParams): VaultEntry {
  const now = Math.floor(Date.now() / 1000)
  return {
    path,
    filename: `${slug}.md`,
    title,
    isA: null,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: now,
    createdAt: now,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    outgoingLinks: [],
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    properties: {},
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    hasH1: false,
  }
}

function workspaceForVaultPath(
  vaultPath: string,
  vaults: readonly VaultOption[] = [],
  defaultWorkspacePath?: string | null,
) {
  const configuredVault = vaults.find((vault) => vault.path === vaultPath)
  return workspaceIdentityFromVault(
    configuredVault ?? {
    label: labelFromWorkspacePath(vaultPath),
    path: vaultPath,
    available: true,
    mounted: true,
    },
    { defaultWorkspacePath },
  )
}

function resolveCreationVaultPath(
  vaultPath: string,
  defaultWorkspacePath?: string | null,
  vaults: readonly VaultOption[] = [],
): string {
  if (!defaultWorkspacePath) return vaultPath
  const defaultVault = vaults.find((vault) => vault.path === defaultWorkspacePath)
  if (!defaultVault) return defaultWorkspacePath
  return defaultVault.available === false || defaultVault.mounted === false ? vaultPath : defaultVault.path
}

export { slugify }

/** Convert a filename slug to a human-readable title (hyphens → spaces, title case). */
function slug_to_title(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export interface EntryMatchParams {
  entry: VaultEntry
  target: string
}

export function entryMatchesTarget({ entry, target }: EntryMatchParams): boolean {
  return resolveEntry([entry], target) === entry
}

export interface NoteContentParams {
  format?: NoteFormat
  initialEmptyHeading?: boolean
}

function buildNoteBody({
  format,
  initialEmptyHeading,
}: Pick<NoteContentParams, 'format' | 'initialEmptyHeading'>): string {
  if (format === NOTE_FORMAT_SHEET) return ''
  return initialEmptyHeading ? '\n# \n\n' : ''
}

export function buildNoteContent({
  format = NOTE_FORMAT_TEXT,
  initialEmptyHeading = false,
}: NoteContentParams): string {
  const body = buildNoteBody({ format, initialEmptyHeading })
  if (format === NOTE_FORMAT_SHEET) return `---\n${NOTE_FORMAT_FRONTMATTER_KEY}: sheet\n---\n`
  return body
}

export interface NewNoteParams {
  title: string
  format?: NoteFormat
  vaultPath: string
  defaultWorkspacePath?: string | null
  vaults?: readonly VaultOption[]
}

export function resolveNewNote(options: NewNoteParams): {
  entry: VaultEntry
  content: string
} {
  const { title, format, vaultPath, defaultWorkspacePath, vaults = [] } = options
  const creationVaultPath = resolveCreationVaultPath(vaultPath, defaultWorkspacePath, vaults)
  const slug = slugify(title)
  const entry = {
    ...buildNewEntry({
      path: joinVaultPath(creationVaultPath, `${slug}.md`),
      slug,
      title,
    }),
    workspace: workspaceForVaultPath(creationVaultPath, vaults, defaultWorkspacePath),
  }
  return { entry, content: buildNoteContent({ format }) }
}

type ResolvedEntry = { entry: VaultEntry; content: string }

interface BlockedCreationPlan {
  status: 'blocked'
  message: string
}

interface ReadyCreationPlan {
  status: 'create'
  resolved: ResolvedEntry
}

export type NoteCreationPlan = BlockedCreationPlan | ReadyCreationPlan

function findPathCollision(entries: VaultEntry[], path: string): VaultEntry | undefined {
  return findByCollidingNotePath(entries, path)
}

function buildCreationCollisionMessage({
  noun,
  title,
  path,
}: {
  noun: 'note'
  title: string
  path: string
}): string {
  const filename = notePathFilename(path)
  return `Cannot create ${noun} "${title}" because ${filename} already exists`
}

export function planNewNoteCreation(options: NewNoteParams & { entries: VaultEntry[] }): NoteCreationPlan {
  const { defaultWorkspacePath, entries, title, format, vaultPath, vaults } = options
  const resolved = resolveNewNote({
    title,
    format,
    vaultPath,
    defaultWorkspacePath,
    vaults,
  })
  const collision = findPathCollision(entries, resolved.entry.path)
  if (collision) {
    return {
      status: 'blocked',
      message: buildCreationCollisionMessage({
        noun: 'note',
        title,
        path: resolved.entry.path,
      }),
    }
  }
  return { status: 'create', resolved }
}

function isAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /already exists|file exists|eexist/i.test(message)
}

function createPersistFailureMessage(entry: VaultEntry, error: unknown): string {
  if (isAlreadyExistsError(error)) {
    return buildCreationCollisionMessage({
      noun: 'note',
      title: entry.title,
      path: entry.path,
    })
  }
  return 'Failed to create note — disk write error'
}

interface PersistNewNoteRequest {
  path: string
  content: string
  vaultPath?: string
}

function createNoteContentArgs({ path, content, vaultPath }: PersistNewNoteRequest): Record<string, unknown> {
  return vaultPath ? { path, content, vaultPath } : { path, content }
}

/** Persist a newly created note to disk. Returns a Promise for error handling. */
export function persistNewNote(request: PersistNewNoteRequest): Promise<void> {
  const args = createNoteContentArgs(request)
  if (!isTauri()) return mockInvoke<void>('save_note_content', args).then(() => {})
  return invoke<void>('create_note_content', args).then(() => {})
}

// Rapid Cmd+N bursts can outpace the note-list render path on desktop. Keep
// the first create immediate, then serialize the rest so each new note settles
// before the next one is opened.
export const RAPID_CREATE_NOTE_SETTLE_MS = 200

function addEntryWithMock(entry: VaultEntry, content: string, addEntry: (e: VaultEntry) => void) {
  if (!isTauri()) addMockEntry(entry, content)
  addEntry(entry)
}

/** Dispatch focus-editor event with perf timing marker. */
function signalFocusEditor(opts?: { selectTitle?: boolean; path?: string }): void {
  const detail = {
    t0: performance.now(),
    selectTitle: opts?.selectTitle ?? false,
    path: opts?.path ?? null,
  }
  requestEditorFocus(detail)
}

interface PersistCallbacks {
  onStart?: (p: string) => void
  onEnd?: (p: string) => void
  onPersisted?: (path: string) => void
}

/** Persist to disk; track pending state via onStart/onEnd. */
function persistOptimistic(request: PersistNewNoteRequest, cbs: PersistCallbacks): Promise<void> {
  cbs.onStart?.(request.path)
  return persistNewNote(request)
    .then(() => {
    cbs.onPersisted?.(request.path)
    })
    .finally(() => {
    cbs.onEnd?.(request.path)
  })
}

type PersistResolvedEntryFn = (resolved: ResolvedEntry) => Promise<void>

interface CreationDeps {
  defaultWorkspacePath?: string | null
  entries: VaultEntry[]
  vaultPath: string
  vaults?: readonly VaultOption[]
  setToastMessage: (msg: string | null) => void
  persistResolvedEntry: PersistResolvedEntryFn
}

interface NoteCreationRequest extends CreationDeps {
  title: string
  creationPath?: 'plus_button' | 'quick_open'
}

async function createNamedNote(options: NoteCreationRequest): Promise<boolean> {
  const { entries, defaultWorkspacePath, title, vaultPath, vaults, setToastMessage, persistResolvedEntry, creationPath } = options
  const plan = planNewNoteCreation({
    entries,
    title,
    vaultPath,
    defaultWorkspacePath,
    vaults,
  })
  if (plan.status === 'blocked') {
    setToastMessage(plan.message)
    return false
  }

  try {
    await persistResolvedEntry(plan.resolved)
    if (creationPath) {
      trackEvent('note_created', {
        creation_path: creationPath,
      })
    }
    return true
  } catch (error) {
    setToastMessage(createPersistFailureMessage(plan.resolved.entry, error))
    return false
  }
}

interface ImmediateCreateDeps {
  addPendingSave?: (path: string) => void
  defaultWorkspacePath?: string | null
  entries: VaultEntry[]
  vaultPath: string
  vaults?: readonly VaultOption[]
  pendingSlugs: Set<string>
  openTabWithContent: (entry: VaultEntry, content: string) => void
  addEntry: (entry: VaultEntry) => void
  onNewNotePersisted?: (path: string) => void
  removePendingSave?: (path: string) => void
  setToastMessage: (msg: string | null) => void
}

type ImmediateCreationPath =
  | 'cmd_n'
  | 'cmd_sheet'
  | 'folder_command_palette'
  | 'folder_context_menu'
  | 'folder_header'

export interface ImmediateCreateOptions {
  creationPath?: ImmediateCreationPath
  format?: NoteFormat
  folderPath?: string
  vaultPath?: string
}

type ImmediateCreateRequest = ImmediateCreateOptions

interface ImmediateCreateQueueConfig {
  addPendingSave?: (path: string) => void
  defaultWorkspacePath?: string | null
  entries: VaultEntry[]
  vaultPath: string
  vaults?: readonly VaultOption[]
  addEntry: (entry: VaultEntry) => void
  openTabWithContent: (entry: VaultEntry, content: string) => void
  onNewNotePersisted?: (path: string) => void
  removePendingSave?: (path: string) => void
  setToastMessage: (msg: string | null) => void
}

/** Generate a unique untitled filename using a timestamp. */
function generateUntitledFilename(entries: VaultEntry[], label: string, pendingSlugs?: Set<string>): string {
  const ts = Math.floor(Date.now() / 1000)
  const typeSlug = label === 'Note' ? 'note' : slugify(label)
  const base = `untitled-${typeSlug}-${ts}`
  const existingSlugs = new Set(entries.map((entry) => entry.filename.replace(/\.md$/, '')))

  let candidate = base
  let suffix = 2
  while (existingSlugs.has(candidate) || pendingSlugs?.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  pendingSlugs?.add(candidate)
  return candidate
}

async function persistImmediateEntry(deps: ImmediateCreateDeps, entry: VaultEntry, content: string): Promise<boolean> {
  try {
    await persistOptimistic(
      {
      path: entry.path,
      content,
      vaultPath: entry.workspace?.path,
      },
      {
      onStart: deps.addPendingSave,
      onEnd: deps.removePendingSave,
      onPersisted: deps.onNewNotePersisted,
      },
    )
    return true
  } catch (error) {
    deps.setToastMessage(createPersistFailureMessage(entry, error))
    return false
  }
}

/** Create an untitled note and write its backing file before opening it. */
function resolveImmediateCreationVaultPath(deps: ImmediateCreateDeps, request: ImmediateCreateRequest): string {
  return request.vaultPath ?? resolveCreationVaultPath(deps.vaultPath, deps.defaultWorkspacePath, deps.vaults)
}

function immediateNoteRelativePath(slug: string, folderPath?: string): string {
  const folder = normalizeVaultRelativePath(folderPath ?? '')
  return folder ? `${folder}/${slug}.md` : `${slug}.md`
}

async function createNoteImmediate(deps: ImmediateCreateDeps, request: ImmediateCreateRequest): Promise<boolean> {
  const noteFormat = normalizeNoteFormat(request.format)
  const untitledLabel = noteFormat === NOTE_FORMAT_SHEET ? 'Sheet' : 'Note'
  const slug = generateUntitledFilename(deps.entries, untitledLabel, deps.pendingSlugs)
  const title = slug_to_title(slug)
  const creationVaultPath = resolveImmediateCreationVaultPath(deps, request)
  const relativePath = immediateNoteRelativePath(slug, request.folderPath)
  const entry = {
    ...buildNewEntry({
      path: joinVaultPath(creationVaultPath, relativePath),
      slug,
      title,
    }),
    workspace: workspaceForVaultPath(creationVaultPath, deps.vaults, deps.defaultWorkspacePath),
  }
  const resolved: ResolvedEntry = {
    entry,
    content: buildNoteContent({
      format: noteFormat,
      initialEmptyHeading: noteFormat !== NOTE_FORMAT_SHEET,
    }),
  }
  const didPersist = await persistImmediateEntry(deps, resolved.entry, resolved.content)
  if (!didPersist) return false

  cacheNoteContent(resolved.entry.path, resolved.content, resolved.entry)
  deps.openTabWithContent(resolved.entry, resolved.content)
  addEntryWithMock(resolved.entry, resolved.content, deps.addEntry)
  signalFocusEditor({ path: resolved.entry.path, selectTitle: true })
  return true
}

function trackImmediateCreate(request: ImmediateCreateRequest, didCreate: boolean): void {
  if (!didCreate) return
  trackEvent('note_created', {
    creation_path: request.creationPath ?? 'cmd_n',
    format: normalizeNoteFormat(request.format),
  })
}

function useLatestImmediateCreateDeps(
  config: ImmediateCreateQueueConfig,
  pendingSlugsRef: MutableRefObject<Set<string>>,
) {
  const {
    defaultWorkspacePath,
    entries,
    vaultPath,
    vaults,
    openTabWithContent,
    addEntry,
    addPendingSave,
    onNewNotePersisted,
    removePendingSave,
    setToastMessage,
  } = config
  const latestDepsRef = useRef<ImmediateCreateDeps | null>(null)
  const syncDeps = useCallback(() => {
    latestDepsRef.current = {
      entries,
      defaultWorkspacePath,
      vaultPath,
      vaults,
      pendingSlugs: pendingSlugsRef.current,
      openTabWithContent,
      addEntry,
      addPendingSave,
      onNewNotePersisted,
      removePendingSave,
      setToastMessage,
    }
  }, [
    entries,
    defaultWorkspacePath,
    vaultPath,
    vaults,
    openTabWithContent,
    addEntry,
    addPendingSave,
    onNewNotePersisted,
    removePendingSave,
    setToastMessage,
    pendingSlugsRef,
  ])

  useEffect(() => {
    syncDeps()
  }, [syncDeps])

  return { latestDepsRef, syncDeps }
}

function useImmediateCreateQueue(
  config: ImmediateCreateQueueConfig,
): (options?: ImmediateCreateOptions) => void {
  const pendingSlugsRef = useRef<Set<string>>(new Set())
  const queuedImmediateCreatesRef = useRef<ImmediateCreateRequest[]>([])
  const immediateCreateLockedRef = useRef(false)
  const immediateCreateTimerRef = useRef<number | null>(null)
  const queueMountedRef = useRef(true)
  const { latestDepsRef, syncDeps } = useLatestImmediateCreateDeps(config, pendingSlugsRef)

  const executeRequest = useCallback(
    async (request: ImmediateCreateRequest): Promise<void> => {
    const deps = latestDepsRef.current
    if (!deps) return

    try {
      const didCreate = await createNoteImmediate(deps, request)
      trackImmediateCreate(request, didCreate)
    } catch (error) {
      console.warn('Failed to create immediate note:', error)
    }
    },
    [latestDepsRef],
  )

  const scheduleQueuedBurst = useCallback(
    function scheduleQueuedBurst() {
    if (!queueMountedRef.current) return
    if (immediateCreateTimerRef.current !== null) return

    immediateCreateTimerRef.current = window.setTimeout(async () => {
      immediateCreateTimerRef.current = null
      const next = queuedImmediateCreatesRef.current.shift()
      if (!next) {
        immediateCreateLockedRef.current = false
        return
      }

      await executeRequest(next)
      scheduleQueuedBurst()
    }, RAPID_CREATE_NOTE_SETTLE_MS)
    },
    [executeRequest],
  )

  useEffect(() => {
    queueMountedRef.current = true
    return () => {
      queueMountedRef.current = false
      if (immediateCreateTimerRef.current !== null) {
        window.clearTimeout(immediateCreateTimerRef.current)
      }
    }
  }, [])

  return useCallback(
    (options: ImmediateCreateOptions = {}) => {
    syncDeps()
    const request = { ...options }
    if (immediateCreateLockedRef.current) {
      queuedImmediateCreatesRef.current.push(request)
      return
    }

    immediateCreateLockedRef.current = true
    void executeRequest(request).then(scheduleQueuedBurst)
    },
    [syncDeps, executeRequest, scheduleQueuedBurst],
  )
}

export interface NoteCreationConfig {
  addEntry: (entry: VaultEntry) => void
  removeEntry: (path: string) => void
  entries: VaultEntry[]
  setToastMessage: (msg: string | null) => void
  vaultPath: string
  defaultWorkspacePath?: string | null
  vaults?: readonly VaultOption[]
  addPendingSave?: (path: string) => void
  removePendingSave?: (path: string) => void
  trackUnsaved?: (path: string) => void
  clearUnsaved?: (path: string) => void
  unsavedPaths?: Set<string>
  markContentPending?: (path: string, content: string) => void
  onNewNotePersisted?: (path: string) => void
}

interface CreationTabDeps {
  openTabWithContent: (entry: VaultEntry, content: string) => void
}

function usePersistResolvedEntry(config: NoteCreationConfig, openTabWithContent: CreationTabDeps['openTabWithContent']) {
  const { addEntry, removeEntry, addPendingSave, removePendingSave, onNewNotePersisted } = config
  const persistResolvedEntry = useCallback(
    async (resolved: ResolvedEntry): Promise<void> => {
      openTabWithContent(resolved.entry, resolved.content)
      addEntryWithMock(resolved.entry, resolved.content, addEntry)
      try {
        await persistOptimistic(
          {
            path: resolved.entry.path,
            content: resolved.content,
            vaultPath: resolved.entry.workspace?.path,
          },
          {
            onStart: addPendingSave,
            onEnd: removePendingSave,
            onPersisted: onNewNotePersisted,
          },
        )
      } catch (error) {
        removeEntry(resolved.entry.path)
        throw error
      }
    },
    [
      openTabWithContent,
      addEntry,
      addPendingSave,
      removePendingSave,
      onNewNotePersisted,
      removeEntry,
    ],
  )
  return persistResolvedEntry
}

function useNamedCreationActions(options: Pick<NoteCreationConfig, 'defaultWorkspacePath' | 'entries' | 'setToastMessage' | 'vaultPath' | 'vaults'> & {
  persistResolvedEntry: PersistResolvedEntryFn
}) {
  const { defaultWorkspacePath, entries, persistResolvedEntry, setToastMessage, vaultPath, vaults } = options
  const handleCreateNote = useCallback(
    (title: string, creationPath: 'plus_button' | 'quick_open' = 'plus_button'): Promise<boolean> =>
      createNamedNote({
        entries,
        vaultPath,
        defaultWorkspacePath,
        vaults,
        setToastMessage,
        persistResolvedEntry,
        title,
        creationPath,
      }),
    [entries, vaultPath, defaultWorkspacePath, vaults, setToastMessage, persistResolvedEntry],
  )

  return { handleCreateNote }
}

export function useNoteCreation(config: NoteCreationConfig, tabDeps: CreationTabDeps) {
  const { addEntry, defaultWorkspacePath, entries, setToastMessage, addPendingSave, removePendingSave, vaultPath, vaults, onNewNotePersisted } = config
  const { openTabWithContent } = tabDeps
  const persistResolvedEntry = usePersistResolvedEntry(config, openTabWithContent)
  const { handleCreateNote } = useNamedCreationActions({
    defaultWorkspacePath,
    entries,
    persistResolvedEntry,
    setToastMessage,
    vaultPath,
    vaults,
  })

  const handleCreateNoteImmediate = useImmediateCreateQueue({
    entries,
    vaultPath,
    defaultWorkspacePath,
    vaults,
    addEntry,
    addPendingSave,
    openTabWithContent,
    onNewNotePersisted,
    removePendingSave,
    setToastMessage,
  })
  useCreateNoteInFolderRequests(handleCreateNoteImmediate)

  return {
    handleCreateNote,
    handleCreateNoteImmediate,
  }
}
