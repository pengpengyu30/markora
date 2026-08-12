/**
 * Mock command handlers for Tauri invoke calls.
 * Each handler simulates a Tauri backend command.
 */

import type {
  VaultEntry,
  ModifiedFile,
  Settings,
} from '../types'
import { MOCK_CONTENT } from './mock-content'
import { MOCK_ENTRIES } from './mock-entries'

function syncWindowContent(): void {
  if (typeof window !== 'undefined') {
    window.__mockContent = MOCK_CONTENT
  }
}

function stripMockFrontmatter(content: string): string {
  const lineEnding = content.startsWith('---\r\n')
    ? '\r\n'
    : content.startsWith('---\n') ? '\n' : null
  if (!lineEnding) return content

  const afterOpen = content.slice(3 + lineEnding.length)
  const closeIndex = afterOpen.indexOf(`${lineEnding}---`)
  if (closeIndex === -1) return content

  return afterOpen.slice(closeIndex + lineEnding.length + 3).trimStart()
}

function mockSearchContent(content: string, excludeFrontmatter?: boolean): string {
  return excludeFrontmatter ? stripMockFrontmatter(content) : content
}

function mockModifiedFiles(): ModifiedFile[] {
  return [
    { path: '/Users/luca/Laputa/26q1-laputa-app.md', relativePath: '26q1-laputa-app.md', status: 'modified' },
    { path: '/Users/luca/Laputa/facebook-ads-strategy.md', relativePath: 'facebook-ads-strategy.md', status: 'modified' },
    { path: '/Users/luca/Laputa/ai-agents-primer.md', relativePath: 'ai-agents-primer.md', status: 'added' },
    { path: '/Users/luca/Laputa/old-draft.md', relativePath: 'old-draft.md', status: 'deleted' },
  ]
}

let mockHasChanges = true
const mockSavedSinceCommit = new Set<string>()

let mockSettings: Settings = {
  auto_pull_interval_minutes: 5,
  git_enabled: null,
  git_path: null,
  git_provider: null,
  git_wsl_distro: null,
  autogit_enabled: false,
  autogit_idle_threshold_seconds: 90,
  autogit_inactive_threshold_seconds: 30,
  release_channel: null,
  automatic_update_checks_enabled: null,
  theme_mode: null,
  ui_language: null,
  date_display_format: null,
  note_width_mode: null,
  initial_h1_auto_rename_enabled: null,
  hide_gitignored_files: null,
  all_notes_show_pdfs: null,
  all_notes_show_images: null,
  all_notes_show_unsupported: null,
  note_list_show_filename: null,
  folder_view_show_non_markdown: null,
}

const DEFAULT_MOCK_VAULT_PATH = '/Users/mock/demo-vault-v2'
const DEFAULT_MOCK_VAULT = {
  label: 'demo-vault-v2',
  path: DEFAULT_MOCK_VAULT_PATH,
}

let mockLastVaultPath: string | null = DEFAULT_MOCK_VAULT_PATH

let mockVaultList: {
  vaults: Array<{
    label: string
    path: string
    alias?: string | null
    shortLabel?: string | null
    color?: string | null
    icon?: string | null
    mounted?: boolean | null
  }>
  active_vault: string | null
  default_workspace_path?: string | null
  hidden_defaults?: string[]
} = {
  vaults: [DEFAULT_MOCK_VAULT],
  active_vault: DEFAULT_MOCK_VAULT_PATH,
  default_workspace_path: DEFAULT_MOCK_VAULT_PATH,
  hidden_defaults: [],
}

type MockContentPath = { path: string }
type MockContentWrite = MockContentPath & { content: string }

function readMockContent({ path }: MockContentPath): string {
  const content = Reflect.get(MOCK_CONTENT, path)
  return typeof content === 'string' ? content : ''
}

function writeMockContent({ path, content }: MockContentWrite): void {
  Reflect.set(MOCK_CONTENT, path, content)
}

function deleteMockContent({ path }: MockContentPath): void {
  Reflect.deleteProperty(MOCK_CONTENT, path)
}

function relativePathStem({ path, vaultPath }: { path: string; vaultPath: string }) {
  const prefix = vaultPath.endsWith('/') ? vaultPath : `${vaultPath}/`
  if (path.startsWith(prefix)) return path.slice(prefix.length).replace(/\.md$/, '')
  return (path.split('/').pop() ?? path).replace(/\.md$/, '')
}

function canonicalRenameTargets({ oldTitle, oldPathStem }: { oldTitle: string; oldPathStem: string }) {
  const oldFilenameStem = oldPathStem.split('/').pop() ?? oldPathStem
  return [...new Set([oldTitle, oldPathStem, oldFilenameStem].filter(Boolean))]
}

function slugifyMockTitle({ title }: { title: string }) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function buildRenamedMockPath({ oldPath, newTitle }: { oldPath: string; newTitle: string }) {
  const parentDir = oldPath.replace(/\/[^/]+$/, '')
  return `${parentDir}/${slugifyMockTitle({ title: newTitle })}.md`
}

function replaceMockTitleFrontmatter({ content, newTitle }: { content: string; newTitle: string }) {
  return /^title:\s*/m.test(content)
    ? content.replace(/^title:\s*.*$/m, `title: ${newTitle}`)
    : content
}

function replaceRenamedWikilinks({ content, oldTargets, newPathStem }: {
  content: string
  oldTargets: string[]
  newPathStem: string
}) {
  if (oldTargets.length === 0) return content
  const targets = new Set(oldTargets)
  let rewritten = ''
  let cursor = 0

  while (cursor < content.length) {
    const start = content.indexOf('[[', cursor)
    if (start === -1) break

    const end = content.indexOf(']]', start + 2)
    if (end === -1) break

    rewritten += content.slice(cursor, start)
    rewritten += renamedWikilinkToken({
      newPathStem,
      targets,
      token: content.slice(start, end + 2),
    })
    cursor = end + 2
  }

  return rewritten + content.slice(cursor)
}

function renamedWikilinkToken({ newPathStem, targets, token }: {
  newPathStem: string
  targets: Set<string>
  token: string
}) {
  const body = token.slice(2, -2)
  const pipeIndex = body.indexOf('|')
  const target = pipeIndex === -1 ? body : body.slice(0, pipeIndex)
  if (!targets.has(target)) return token

  const pipe = pipeIndex === -1 ? '' : body.slice(pipeIndex)
  return `[[${newPathStem}${pipe}]]`
}

function updateMockRenameReferences({ newPath, newPathStem, oldTargets }: {
  newPath: string
  newPathStem: string
  oldTargets: string[]
}) {
  let updatedFiles = 0
  for (const [path, content] of Object.entries(MOCK_CONTENT)) {
    if (path === newPath) continue
    const replaced = replaceRenamedWikilinks({ content, oldTargets, newPathStem })
    if (replaced === content) continue
    writeMockContent({ path, content: replaced })
    updatedFiles += 1
  }
  return updatedFiles
}

function handleRenameNote(args: { vault_path: string; old_path: string; new_title: string; old_title?: string | null }) {
  const oldEntry = MOCK_ENTRIES.find(e => e.path === args.old_path)
  const oldTitle = args.old_title ?? oldEntry?.title ?? ''
  const oldContent = readMockContent({ path: args.old_path })
  const newPath = buildRenamedMockPath({ oldPath: args.old_path, newTitle: args.new_title })
  const oldPathStem = relativePathStem({ path: args.old_path, vaultPath: args.vault_path })
  const newPathStem = relativePathStem({ path: newPath, vaultPath: args.vault_path })

  if (oldTitle === args.new_title && newPath === args.old_path) {
    return { new_path: args.old_path, updated_files: 0, failed_updates: 0 }
  }

  const newContent = replaceMockTitleFrontmatter({ content: oldContent, newTitle: args.new_title })
  deleteMockContent({ path: args.old_path })
  writeMockContent({ path: newPath, content: newContent })
  const oldTargets = canonicalRenameTargets({ oldTitle, oldPathStem })
  const updatedFiles = updateMockRenameReferences({ newPath, newPathStem, oldTargets })

  syncWindowContent()
  return { new_path: newPath, updated_files: updatedFiles, failed_updates: 0 }
}

function handleRenameNoteFilename(args: {
  vault_path: string
  old_path: string
  new_filename_stem: string
}) {
  const oldEntry = MOCK_ENTRIES.find(e => e.path === args.old_path)
  const oldContent = readMockContent({ path: args.old_path })
  const oldTitle = oldEntry?.title ?? ''
  const normalizedStem = args.new_filename_stem.trim().replace(/\.md$/, '')
  const oldFilename = args.old_path.split('/').pop() ?? ''
  const newFilename = `${normalizedStem}.md`

  if (!normalizedStem) {
    throw new Error('Invalid filename')
  }
  if (oldFilename === newFilename) {
    return { new_path: args.old_path, updated_files: 0, failed_updates: 0 }
  }

  const parentDir = args.old_path.replace(/\/[^/]+$/, '')
  const newPath = `${parentDir}/${newFilename}`
  if (newPath !== args.old_path && Object.hasOwn(MOCK_CONTENT, newPath)) {
    throw new Error('A note with that name already exists')
  }

  deleteMockContent({ path: args.old_path })
  writeMockContent({ path: newPath, content: oldContent })

  const oldPathStem = relativePathStem({ path: args.old_path, vaultPath: args.vault_path })
  const newPathStem = relativePathStem({ path: newPath, vaultPath: args.vault_path })
  const oldTargets = canonicalRenameTargets({ oldTitle, oldPathStem })
  const updatedFiles = updateMockRenameReferences({ newPath, newPathStem, oldTargets })

  syncWindowContent()
  return { new_path: newPath, updated_files: updatedFiles, failed_updates: 0 }
}

function handleMoveNoteToFolder(args: {
  vault_path: string
  old_path: string
  folder_path: string
}) {
  const oldEntry = MOCK_ENTRIES.find(e => e.path === args.old_path)
  const oldContent = readMockContent({ path: args.old_path })
  const oldTitle = oldEntry?.title ?? ''
  const oldFilename = args.old_path.split('/').pop() ?? ''
  const normalizedFolderPath = args.folder_path.trim().replace(/^\/+|\/+$/g, '')

  if (!normalizedFolderPath) {
    throw new Error('Folder path cannot be empty')
  }

  const vaultRoot = args.vault_path.replace(/\/+$/, '')
  const newPath = `${vaultRoot}/${normalizedFolderPath}/${oldFilename}`
  if (newPath === args.old_path) {
    return { new_path: args.old_path, updated_files: 0, failed_updates: 0 }
  }
  if (Object.hasOwn(MOCK_CONTENT, newPath)) {
    throw new Error('A note with that name already exists')
  }

  deleteMockContent({ path: args.old_path })
  writeMockContent({ path: newPath, content: oldContent })

  const oldPathStem = relativePathStem({ path: args.old_path, vaultPath: args.vault_path })
  const newPathStem = relativePathStem({ path: newPath, vaultPath: args.vault_path })
  const oldTargets = canonicalRenameTargets({ oldTitle, oldPathStem })
  const updatedFiles = updateMockRenameReferences({ newPath, newPathStem, oldTargets })

  syncWindowContent()
  return { new_path: newPath, updated_files: updatedFiles, failed_updates: 0 }
}

export const mockHandlers = {
  read_vault_snapshot: () => MOCK_ENTRIES,
  record_startup_milestone: ({ name, detail }: { name: string; detail?: number | null }) => ({
    name,
    detail: detail ?? null,
    elapsed_ms: 0,
  }),
  get_startup_trace: () => [],
  list_vault: () => MOCK_ENTRIES,
  list_vault_folders: () => [],
  reload_vault: () => MOCK_ENTRIES,
  reload_vault_entry: (args: { path: string }) => MOCK_ENTRIES.find(e => e.path === args.path) ?? { path: args.path, title: 'Unknown', filename: 'unknown.md', aliases: [], belongsTo: [], relatedTo: [], archived: false, snippet: '', wordCount: 0, fileSize: 0, relationships: {}, outgoingLinks: [], properties: {} },
  sync_note_title: () => false,
  get_note_content: (args: { path: string }) => MOCK_CONTENT[args.path] ?? '',
  validate_note_content: (args: { path: string; content: string }) => (MOCK_CONTENT[args.path] ?? '') === args.content,
  get_all_content: () => MOCK_CONTENT,
  get_modified_files: () => {
    const base = mockHasChanges ? mockModifiedFiles() : []
    const basePaths = new Set(base.map(f => f.path))
    const extra: ModifiedFile[] = [...mockSavedSinceCommit]
      .filter(p => !basePaths.has(p))
      .map(p => ({ path: p, relativePath: p.replace(/^.*?\/Laputa\//, ''), status: 'modified' as const }))
    return [...base, ...extra]
  },
  git_snapshot: () => {
    const count = (mockHasChanges ? mockModifiedFiles().length : 0) + mockSavedSinceCommit.size
    mockHasChanges = false
    mockSavedSinceCommit.clear()
    return `[main abc1234] tolaria: snapshot\n ${count} files changed`
  },
  get_build_number: () => 'bDEV',
  git_workspace_info: ({ vaultPath }: { vaultPath?: string } = {}) => ({
    vaultRoot: vaultPath ?? '/mock-vault',
    gitRoot: vaultPath ?? '/mock-vault',
    vaultPathspec: '',
    gitRootRelation: 'vault',
    mode: 'managed',
    resolutionFailure: null,
  }),
  ensure_git_repository: ({ vaultPath }: { vaultPath?: string } = {}) => ({
    vaultRoot: vaultPath ?? '/mock-vault',
    gitRoot: vaultPath ?? '/mock-vault',
    vaultPathspec: '',
    gitRootRelation: 'vault',
    mode: 'managed',
    resolutionFailure: null,
  }),
  list_deleted_notes: () => [],
  get_deleted_note_preview: () => ({ relativePath: '', content: '' }),
  restore_deleted_note: ({ relativePath }: { relativePath?: string } = {}) => ({
    relativePath: relativePath ?? '',
    snapshotCreated: true,
    snapshotError: null,
  }),
  save_note_content: (args: { path: string; content: string }) => {
    MOCK_CONTENT[args.path] = args.content
    mockSavedSinceCommit.add(args.path)
    syncWindowContent()
    return null
  },
  save_image: (args: { vault_path?: string; filename: string; data: string }) => {
    const vault = args.vault_path ?? '/Users/luca/Laputa'
    return `${vault}/attachments/${Date.now()}-${args.filename}`
  },
  copy_image_to_vault: (args: { vault_path?: string; source_path: string }) => {
    const vault = args.vault_path ?? '/Users/luca/Laputa'
    const filename = args.source_path.split('/').pop() ?? 'image.png'
    return `${vault}/attachments/${Date.now()}-${filename}`
  },
  download_remote_image_to_vault: (args: { vault_path?: string; url: string }) => {
    const vault = args.vault_path ?? '/Users/luca/Laputa'
    const filename = new URL(args.url).pathname.split('/').pop() || 'remote-image.png'
    return `${vault}/attachments/${Date.now()}-${filename}`
  },
  get_settings: () => ({ ...mockSettings }),
  save_settings: (args: { settings: Settings }) => {
    const s = args.settings
    mockSettings = {
      auto_pull_interval_minutes: s.auto_pull_interval_minutes ?? 5,
      git_enabled: s.git_enabled ?? null,
      git_path: s.git_path ?? null,
      git_provider: s.git_provider ?? null,
      git_wsl_distro: s.git_wsl_distro ?? null,
      autogit_enabled: s.autogit_enabled ?? false,
      autogit_idle_threshold_seconds: s.autogit_idle_threshold_seconds ?? 90,
      autogit_inactive_threshold_seconds: s.autogit_inactive_threshold_seconds ?? 30,
      release_channel: s.release_channel,
      automatic_update_checks_enabled: s.automatic_update_checks_enabled ?? null,
      theme_mode: s.theme_mode ?? null,
      ui_language: s.ui_language ?? null,
      date_display_format: s.date_display_format ?? null,
      note_width_mode: s.note_width_mode ?? null,
      initial_h1_auto_rename_enabled: s.initial_h1_auto_rename_enabled ?? null,
      hide_gitignored_files: s.hide_gitignored_files ?? null,
      all_notes_show_pdfs: s.all_notes_show_pdfs ?? null,
      all_notes_show_images: s.all_notes_show_images ?? null,
      all_notes_show_unsupported: s.all_notes_show_unsupported ?? null,
      note_list_show_filename: s.note_list_show_filename ?? null,
      folder_view_show_non_markdown: s.folder_view_show_non_markdown ?? null,
      ...(s.multi_workspace_enabled !== undefined
        ? { multi_workspace_enabled: s.multi_workspace_enabled ?? null }
        : {}),
    }
    return null
  },
  load_vault_list: () => ({ ...mockVaultList, vaults: [...mockVaultList.vaults] }),
  save_vault_list: (args: { list: typeof mockVaultList }) => { mockVaultList = { ...args.list }; return null },
  rename_note: handleRenameNote,
  rename_note_filename: handleRenameNoteFilename,
  move_note_to_folder: handleMoveNoteToFolder,
  clone_repo: (args: { url: string; localPath?: string; local_path?: string }) => {
    const localPath = args.localPath ?? args.local_path ?? ''
    return `Cloned to ${localPath}`
  },
  purge_trash: () => [],
  delete_note: (args: { path: string }) => args.path,
  batch_delete_notes: (args: { paths: string[] }) => args.paths,
  empty_trash: () => [],
  migrate_is_a_to_type: () => 0,
  batch_trash_notes: (args: { paths: string[] }) => args.paths.length,
  search_vault: (args: { query: string; mode: string; excludeFrontmatter?: boolean }) => {
    const q = (args.query ?? '').toLowerCase()
    if (!q) return { results: [], elapsed_ms: 0, query: q, mode: args.mode }
    const matches = MOCK_ENTRIES
      .filter(e => {
        const content = mockSearchContent(MOCK_CONTENT[e.path] ?? '', args.excludeFrontmatter)
        return e.title.toLowerCase().includes(q) || content.toLowerCase().includes(q)
      })
      .slice(0, 20)
      .map((e, i) => ({
        title: e.title,
        path: e.path,
        snippet: e.snippet || '',
        score: 1.0 - i * 0.05,
        note_type: e.isA,
      }))
    return { results: matches, elapsed_ms: 42, query: q, mode: args.mode }
  },
  get_last_vault_path: () => mockLastVaultPath,
  set_last_vault_path: (args: { path: string }) => { mockLastVaultPath = args.path; return null },
  get_default_vault_path: () => '/Users/mock/Documents/Getting Started',
  check_vault_exists: (args: { path: string }) => {
    // In mock mode, the demo-vault-v2 path always "exists"
    return args.path.includes('demo-vault-v2')
  },
  create_empty_vault: (args: { targetPath?: string; target_path?: string }) => {
    const targetPath = args.targetPath || args.target_path || '/Users/mock/Documents/My Vault'
    return targetPath
  },
  create_getting_started_vault: (args: { targetPath?: string | null }) => {
    const targetPath = args.targetPath || '/Users/mock/Documents/Getting Started'
    return targetPath
  },
  copy_text_to_clipboard: () => null,
  read_text_from_clipboard: () => '',
  repair_vault: (): string => {
    return 'Vault repaired'
  },
} satisfies Record<string, (...args: never[]) => unknown>

export function addMockEntry(_entry: VaultEntry, content: string): void {
  writeMockContent({ path: _entry.path, content })
  syncWindowContent()
}

export function updateMockContent(path: string, content: string): void {
  writeMockContent({ path, content })
  syncWindowContent()
}

export function trackMockChange(path: string): void {
  mockSavedSinceCommit.add(path)
}
