import { act, render as testingLibraryRender, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_VAULTS } from './hooks/useVaultSwitcher'
import { formatShortcutDisplay } from './hooks/appCommandCatalog'
import { invoke } from '@tauri-apps/api/core'
import type { Settings } from './types'

// Provide a localStorage mock that supports all methods (jsdom's may be incomplete)
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock @tauri-apps/api/core before importing App
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/window', async () => {
  const actual = await vi.importActual<typeof import('@tauri-apps/api/window')>('@tauri-apps/api/window')

  return {
    ...actual,
    getCurrentWindow: () => ({
      innerSize: vi.fn(async () => ({ toLogical: () => ({ width: 1400, height: 900 }) })),
      scaleFactor: vi.fn(async () => 1),
      setMinSize: vi.fn(async () => {}),
      setSize: vi.fn(async () => {}),
    }),
  }
})

// Mock mock-tauri module
const mockEntries = [
  {
    path: '/vault/project/test.md',
    filename: 'test.md',
    title: 'Test Project',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    archived: false,
    owner: 'Luca',
    cadence: null,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 1024,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    view: null,
    visible: true,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
  },
  {
    path: '/vault/topic/dev.md',
    filename: 'dev.md',
    title: 'Software Development',
    isA: 'Topic',
    aliases: ['Dev'],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    owner: null,
    cadence: null,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 256,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    view: null,
    visible: true,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
  },
]

const mockAllContent: Record<string, string> = {
  '/vault/project/test.md': '---\ntitle: Test Project\nis_a: Project\n---\n\n# Test Project\n\nSome content.',
  '/vault/topic/dev.md': '---\ntitle: Software Development\nis_a: Topic\n---\n\n# Software Development\n',
}

const mockVaultList = {
  vaults: [{ label: 'Test Vault', path: '/vault' }],
  active_vault: '/vault',
  hidden_defaults: [],
}

const mockDefaultVaultPath = '/Users/mock/Documents/Getting Started'
const expectedDefaultVaultPath = DEFAULT_VAULTS[0].path || mockDefaultVaultPath

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    auto_pull_interval_minutes: null,
    telemetry_consent: true,
    crash_reporting_enabled: null,
    analytics_enabled: null,
    anonymous_id: null,
    release_channel: null,
    ...overrides,
  }
}

const mockCommandResults: Record<string, unknown> = {
  load_vault_list: mockVaultList,
  list_vault: mockEntries,
  list_vault_folders: [],
  get_all_content: mockAllContent,
  get_modified_files: [],
  get_note_content: mockAllContent['/vault/project/test.md'] || '',
  save_note_content: null,
  reload_vault_entry: ({ path }: { path: string }) => mockEntries.find((entry) => entry.path === path) ?? null,
  get_settings: createSettings(),
  git_workspace_info: {
    vaultRoot: '/vault',
    gitRoot: '/vault',
    vaultPathspec: '',
    gitRootRelation: 'vault',
    mode: 'managed',
    resolutionFailure: null,
  },
  ensure_git_repository: {
    vaultRoot: '/vault',
    gitRoot: '/vault',
    vaultPathspec: '',
    gitRootRelation: 'vault',
    mode: 'managed',
    resolutionFailure: null,
  },
  save_settings: null,
  check_vault_exists: true,
  get_default_vault_path: expectedDefaultVaultPath,
  list_themes: [],
  get_vault_settings: { theme: null },
}

function resetMockCommandResults() {
  Object.assign(mockCommandResults, {
    load_vault_list: mockVaultList,
    list_vault: mockEntries,
    list_vault_folders: [],
    get_all_content: mockAllContent,
    get_modified_files: [],
    get_note_content: mockAllContent['/vault/project/test.md'] || '',
    get_settings: createSettings(),
    save_note_content: null,
    reload_vault_entry: ({ path }: { path: string }) => mockEntries.find((entry) => entry.path === path) ?? null,
    git_workspace_info: {
      vaultRoot: '/vault',
      gitRoot: '/vault',
      vaultPathspec: '',
      gitRootRelation: 'vault',
      mode: 'managed',
      resolutionFailure: null,
    },
    ensure_git_repository: {
      vaultRoot: '/vault',
      gitRoot: '/vault',
      vaultPathspec: '',
      gitRootRelation: 'vault',
      mode: 'managed',
      resolutionFailure: null,
    },
    save_settings: null,
    check_vault_exists: true,
    get_default_vault_path: expectedDefaultVaultPath,
    list_themes: [],
    get_vault_settings: { theme: null },
  })
}

function resolveMockCommandResult(cmd: string, args?: unknown) {
  const result = Reflect.get(mockCommandResults, cmd) as unknown
  return typeof result === 'function'
    ? (result as (input?: unknown) => unknown)(args)
    : result ?? null
}

vi.mock('./mock-tauri', () => ({
  isTauri: vi.fn(() => false),
  mockInvoke: vi.fn(async (cmd: string, args?: unknown) => resolveMockCommandResult(cmd, args)),
  addMockEntry: vi.fn(),
  updateMockContent: vi.fn(),
  trackMockChange: vi.fn(),
}))

vi.mock('./hooks/useUpdater', async () => {
  const actual = await vi.importActual<typeof import('./hooks/useUpdater')>('./hooks/useUpdater')

  return {
    ...actual,
    useUpdater: vi.fn(() => ({
      status: { state: 'idle' },
      actions: {
        checkForUpdates: vi.fn(async () => ({ kind: 'up-to-date' })),
        startDownload: vi.fn(),
        openReleaseNotes: vi.fn(),
        dismiss: vi.fn(),
      },
    })),
    restartApp: vi.fn(),
  }
})

// Mock BlockNote components (they need DOM APIs not available in jsdom)
vi.mock('@blocknote/core', () => ({
  audioParse: vi.fn(() => undefined), createAudioBlockConfig: vi.fn(() => ({})),
  BlockNoteSchema: { create: () => ({ extend: () => ({}) }) },
  createCodeBlockSpec: vi.fn(() => ({})),
  createExtension: (factory: unknown) => () => factory,
  createStyleSpec: vi.fn(() => ({})),
  createVideoBlockConfig: vi.fn(() => ({})), defaultInlineContentSpecs: {},
  filterSuggestionItems: vi.fn(() => []), videoParse: vi.fn(() => undefined),
}))

vi.mock('@blocknote/code-block', () => ({ codeBlockOptions: {} }))

vi.mock('@blocknote/core/extensions', () => ({ filterSuggestionItems: vi.fn(() => []) }))

vi.mock('@blocknote/react', () => {
  const blockNoteEditor = {
    tryParseMarkdownToBlocks: async () => [],
    replaceBlocks: () => {},
    document: [],
    insertInlineContent: () => {},
    setTextCursorPosition: () => {},
    focus: () => {},
    domElement: null,
    onChange: () => () => {},
    onMount: (cb: () => void) => { cb(); return () => {} },
  }

  return {
    AudioBlock: () => null, AudioToExternalHTML: () => null,
    createReactBlockSpec: () => () => ({}),
    createReactInlineContentSpec: () => ({ render: () => null }),
    VideoBlock: () => null, VideoToExternalHTML: () => null,
    BlockNoteViewRaw: ({ children, editable }: { children?: ReactNode; editable?: boolean }) => (
      <div data-testid="blocknote-view" data-editable={editable !== false ? 'true' : 'false'}>
        <div contentEditable={editable !== false} suppressContentEditableWarning data-testid="mock-editor">
          mock editor
        </div>
        {children}
      </div>
    ),
    LinkToolbar: ({ children }: { children?: ReactNode }) => <>{children}</>,
    ComponentsContext: {
      Provider: ({ children }: { children?: ReactNode }) => <>{children}</>,
    },
    useCreateBlockNote: () => blockNoteEditor,
    useBlockNoteEditor: () => blockNoteEditor,
    LinkToolbarController: () => null,
    EditLinkButton: () => null,
    DeleteLinkButton: () => null,
    SideMenuController: () => null,
    SuggestionMenuController: () => null,
    GridSuggestionMenuController: () => null,
    useComponentsContext: () => ({
      LinkToolbar: {
        Button: ({
          children,
          label,
          onClick,
        }: { children?: ReactNode; label?: string; onClick?: () => void }) => (
          <button onClick={onClick} type="button">
            {label}
            {children}
          </button>
        ),
      },
    }),
    useDictionary: () => ({
      link_toolbar: {
        open: { tooltip: 'Open in a new tab' },
      },
    }),
  }
})

vi.mock('@blocknote/mantine', () => ({
  components: {},
  BlockNoteView: ({ children }: { children?: React.ReactNode }) => <div data-testid="blocknote-view">{children}</div>,
}))

vi.mock('@blocknote/mantine/style.css', () => ({}))

vi.mock('./components/tolariaEditorFormatting', () => ({
  TolariaFormattingToolbar: () => null,
  TolariaFormattingToolbarController: () => null,
}))

import App from './App'
import { TooltipProvider } from './components/ui/tooltip'
import { useUpdater } from './hooks/useUpdater'
import { isTauri } from './mock-tauri'
import { resetVaultConfigStore } from './utils/vaultConfigStore'

const SLOW_APP_READY_TIMEOUT_MS = 10_000

function render(ui: ReactElement, options?: Parameters<typeof testingLibraryRender>[1]) {
  return testingLibraryRender(ui, {
    wrapper: ({ children }) => <TooltipProvider>{children}</TooltipProvider>,
    ...options,
  })
}

function createMockUpdaterResult(
  checkForUpdates: () => Promise<{ kind: 'up-to-date' } | { kind: 'available'; version: string; displayVersion: string } | { kind: 'error'; message: string }> = async () => ({ kind: 'up-to-date' }),
) {
  return {
    status: { state: 'idle' as const },
    actions: {
      checkForUpdates,
      startDownload: vi.fn(),
      openReleaseNotes: vi.fn(),
      dismiss: vi.fn(),
    },
  }
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetMockCommandResults()
    vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => resolveMockCommandResult(cmd, args))
    vi.mocked(isTauri).mockReturnValue(false)
    vi.mocked(useUpdater).mockReturnValue(createMockUpdaterResult())
    localStorage.clear()
    resetVaultConfigStore()
    window.history.replaceState({}, '', '/')
  })

  it('renders the four-panel layout', async () => {
    render(<App />)
    expect(await screen.findByTestId('status-bar', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('loads and displays vault entries in sidebar', async () => {
    render(<App />)
    await waitFor(() => {
      // Entries appear in both Sidebar and NoteList
      expect(screen.getAllByText('Test Project').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Software Development').length).toBeGreaterThan(0)
    }, { timeout: SLOW_APP_READY_TIMEOUT_MS })
  })

  it('keeps one startup shell visible while the initial vault note scan is pending', async () => {
    let resolveListVault: ((value: typeof mockEntries) => void) | null = null
    const listVaultPromise = new Promise<typeof mockEntries>((resolve) => {
      resolveListVault = resolve
    })
    mockCommandResults.list_vault = () => listVaultPromise

    render(<App />)

    expect(await screen.findByTestId('startup-shell-fallback', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByTestId('note-list-loading-skeleton')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-vault-reloading')).not.toBeInTheDocument()

    await act(async () => {
      resolveListVault?.(mockEntries)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.queryByTestId('startup-shell-fallback')).not.toBeInTheDocument()
      expect(screen.queryByTestId('note-list-loading-skeleton')).not.toBeInTheDocument()
      expect(screen.getAllByText('Test Project').length).toBeGreaterThan(0)
    })
  })

  it('shows empty state in editor when no note is selected', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Select a note to start editing')).toBeInTheDocument()
    })
  })

  it('shows keyboard shortcut hints', async () => {
    const quickOpenHint = formatShortcutDisplay({ display: '⌘P / ⌘O' })
    const newNoteHint = formatShortcutDisplay({ display: '⌘N' })
    const { container } = render(<App />)
    await screen.findByText('Select a note to start editing')

    await waitFor(() => {
      const visibleText = container.textContent ?? ''
      expect(visibleText).toContain(`${quickOpenHint} to search`)
      expect(visibleText).toContain(`${newNoteHint} to create`)
    })
  })

  it('registers keyboard shortcuts without error', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })

    // Cmd+S with no pending changes shows "Nothing to save"
    fireEvent.keyDown(window, { key: 's', metaKey: true })
    await waitFor(() => {
      expect(screen.getByText('Nothing to save')).toBeInTheDocument()
    })
  })

  it('persists a Cmd+N note before opening it in the editor', async () => {
    const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    let resolveSave!: () => void
    const saveNoteContent = vi.fn(() => new Promise<void>((resolve) => { resolveSave = resolve }))
    mockCommandResults.save_note_content = saveNoteContent

    try {
      render(<App />)
      await screen.findByTestId('status-bar')

      fireEvent.keyDown(window, { key: 'n', code: 'KeyN', metaKey: true })

      await waitFor(() => {
        expect(saveNoteContent).toHaveBeenCalledWith({
          path: '/vault/untitled-note-1700000000.md',
          content: '\n# \n\n',
          vaultPath: '/vault',
        })
      })
      expect(window.__laputaTest?.activeTabPath).not.toBe('/vault/untitled-note-1700000000.md')

      await act(async () => {
        resolveSave()
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(window.__laputaTest?.activeTabPath).toBe('/vault/untitled-note-1700000000.md')
      })
      expect(screen.getAllByText('Untitled Note 1700000000').length).toBeGreaterThan(0)
    } finally {
      dateNow.mockRestore()
    }
  })

  it('shows visible feedback when a manual update check finds an update', async () => {
    vi.mocked(useUpdater).mockReturnValue(createMockUpdaterResult(async () => ({
      kind: 'available',
      version: '2026.4.25',
      displayVersion: '2026.4.25',
    })))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('status-build-number'))

    await waitFor(() => {
      expect(screen.getByText('Tolaria 2026.4.25 is available')).toBeInTheDocument()
    })
  })

  it('shows visible feedback when a menu-driven update check finds no eligible update', async () => {
    vi.mocked(useUpdater).mockReturnValue(createMockUpdaterResult(async () => ({ kind: 'up-to-date' })))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
      expect(typeof window.__laputaTest?.dispatchBrowserMenuCommand).toBe('function')
    })

    act(() => {
      window.__laputaTest?.dispatchBrowserMenuCommand?.('app-check-for-updates')
    })

    await waitFor(() => {
      expect(screen.getByText('No newer stable update is available right now')).toBeInTheDocument()
    })
  })

  it('shows immediate feedback while a menu-driven update check is pending', async () => {
    let resolveUpdate: ((result: { kind: 'up-to-date' }) => void) | null = null
    const checkForUpdates = vi.fn(() => new Promise<{ kind: 'up-to-date' }>((resolve) => {
      resolveUpdate = resolve
    }))
    vi.mocked(useUpdater).mockReturnValue(createMockUpdaterResult(checkForUpdates))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
      expect(typeof window.__laputaTest?.dispatchBrowserMenuCommand).toBe('function')
    })

    act(() => {
      window.__laputaTest?.dispatchBrowserMenuCommand?.('app-check-for-updates')
    })

    await waitFor(() => {
      expect(screen.getByText('Checking for updates...')).toBeInTheDocument()
    })
    expect(checkForUpdates).toHaveBeenCalledOnce()

    await act(async () => {
      resolveUpdate?.({ kind: 'up-to-date' })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByText('No newer stable update is available right now')).toBeInTheDocument()
    })
  })

  it('shows onboarding after telemetry consent when no active vault is configured', async () => {
    mockCommandResults.get_settings = createSettings({ telemetry_consent: null })
    mockCommandResults.load_vault_list = { vaults: [], active_vault: null, hidden_defaults: [] }
    mockCommandResults.check_vault_exists = (args?: { path?: string }) => args?.path === expectedDefaultVaultPath

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Help improve Tolaria')).toBeInTheDocument()
    }, { timeout: SLOW_APP_READY_TIMEOUT_MS })

    fireEvent.click(screen.getByTestId('telemetry-accept'))

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    }, { timeout: SLOW_APP_READY_TIMEOUT_MS })
    expect(screen.getByTestId('welcome-open-folder')).toHaveTextContent('Open existing vault')
  })

  it.each([
    ['telemetry-accept', 'Allow anonymous reporting'],
    ['telemetry-decline', 'No thanks'],
  ])('ignores a remembered default vault after %s when onboarding was never completed', async (buttonTestId) => {
    const rememberedDefaultVaultPath = expectedDefaultVaultPath
    localStorage.setItem('tolaria_welcome_dismissed', '1')
    mockCommandResults.get_default_vault_path = rememberedDefaultVaultPath
    mockCommandResults.get_settings = createSettings({ telemetry_consent: null })
    mockCommandResults.load_vault_list = {
      vaults: [],
      active_vault: rememberedDefaultVaultPath,
      hidden_defaults: [],
    }
    mockCommandResults.check_vault_exists = (args?: { path?: string }) => args?.path === rememberedDefaultVaultPath

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Help improve Tolaria')).toBeInTheDocument()
    }, { timeout: SLOW_APP_READY_TIMEOUT_MS })

    fireEvent.click(screen.getByTestId(buttonTestId))

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    }, { timeout: SLOW_APP_READY_TIMEOUT_MS })
    expect(screen.getByTestId('welcome-open-folder')).toHaveTextContent('Open existing vault')
  })

  it('keeps one startup shell visible while the last vault is still resolving', async () => {
    localStorage.setItem('tolaria_welcome_dismissed', '1')

    let resolveVaultList: ((value: typeof mockVaultList) => void) | null = null

    mockCommandResults.load_vault_list = () =>
      new Promise<typeof mockVaultList>((resolve) => {
        resolveVaultList = resolve
      })
    mockCommandResults.check_vault_exists = (args?: { path?: string }) => args?.path === '/work'

    render(<App />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByTestId('startup-shell-fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('note-list-loading-skeleton')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-vault-reloading')).not.toBeInTheDocument()

    await act(async () => {
      resolveVaultList?.({
        vaults: [{ label: 'Work Vault', path: '/work' }],
        active_vault: '/work',
        hidden_defaults: [],
      })
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.queryByTestId('startup-shell-fallback')).not.toBeInTheDocument()
      expect(screen.getByTestId('status-vault-trigger')).toHaveTextContent('Work Vault')
    })
  })

  it('shows the missing-vault screen once the resolved active vault is confirmed missing', async () => {
    localStorage.setItem('tolaria_welcome_dismissed', '1')
    mockCommandResults.load_vault_list = {
      vaults: [{ label: 'Old Vault', path: '/missing-vault' }],
      active_vault: '/missing-vault',
      hidden_defaults: [],
    }
    mockCommandResults.check_vault_exists = (args?: { path?: string }) => args?.path === expectedDefaultVaultPath

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/folder may have moved or been deleted/)).toBeInTheDocument()
    }, { timeout: SLOW_APP_READY_TIMEOUT_MS })
    expect(screen.getByTestId('welcome-open-folder')).toHaveTextContent('Open existing vault')
  })

  it('shows welcome instead of vault-missing when the missing path was not a persisted active vault', async () => {
    localStorage.setItem('tolaria_welcome_dismissed', '1')
    mockCommandResults.load_vault_list = {
      vaults: [],
      active_vault: null,
      hidden_defaults: [],
    }
    mockCommandResults.check_vault_exists = (args?: { path?: string }) => args?.path === expectedDefaultVaultPath

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to Tolaria')).toBeInTheDocument()
    })
    expect(screen.getByTestId('welcome-open-folder')).toHaveTextContent('Open existing vault')
  })

  it('persists and opens the onboarding template vault after cloning', async () => {
    let templateExists = false
    const saveVaultList = vi.fn()
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('file:///Users/mock/Documents')
    const expectedLabel = 'Getting Started'

    mockCommandResults.load_vault_list = { vaults: [], active_vault: null, hidden_defaults: [] }
    mockCommandResults.check_vault_exists = (args?: { path?: string }) => {
      if (args?.path === expectedDefaultVaultPath) {
        return templateExists
      }
      return false
    }
    mockCommandResults.create_getting_started_vault = () => {
      templateExists = true
      return expectedDefaultVaultPath
    }
    mockCommandResults.save_vault_list = (args?: {
      list?: { vaults?: Array<{ label: string; path: string }>; active_vault?: string | null }
    }) => {
      saveVaultList(args)
      return null
    }

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('welcome-create-vault'))

    await waitFor(() => {
      expect(saveVaultList).toHaveBeenCalledWith({
        list: {
          vaults: [],
          active_vault: expectedDefaultVaultPath,
          hidden_defaults: [],
        },
      })
    })
    expect(saveVaultList).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.getByTestId('status-vault-trigger')).toHaveTextContent(expectedLabel)
    })

    promptSpy.mockRestore()
  })

  it('renders sidebar without an All Notes entry', async () => {
    render(<App />)
    await waitFor(() => {
      // The left navigation intentionally has no synthetic All Notes entry.
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
      expect(screen.queryByText('All Notes')).not.toBeInTheDocument()
    })
  })

  it('renders status bar', async () => {
    render(<App />)
    // StatusBar should be present
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })
    // The status bar element should exist in the DOM
    const appShell = document.querySelector('.app-shell')
    expect(appShell).toBeInTheDocument()
  })

  it('switches vaults from the bottom bar after onboarding is ready', async () => {
    let resolveSwitchedVaultScan: ((value: typeof mockEntries) => void) | null = null
    const switchedVaultScan = new Promise<typeof mockEntries>((resolve) => {
      resolveSwitchedVaultScan = resolve
    })
    mockCommandResults.load_vault_list = {
      vaults: [
        { label: 'Test Vault', path: '/work' },
        { label: 'Work Vault', path: '/vault-2' },
      ],
      active_vault: '/work',
      hidden_defaults: [],
    }
    mockCommandResults.list_vault = ({ path }: { path?: string } = {}) =>
      path === '/vault-2' ? switchedVaultScan : mockEntries

    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('status-vault-trigger')).toHaveTextContent('Test Vault')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Switch Project' }))
    fireEvent.click(screen.getByTestId('vault-menu-item-Work Vault'))

    expect(screen.queryByTestId('startup-shell-fallback')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('status-vault-trigger')).toHaveTextContent('Work Vault')
    })

    await act(async () => {
      resolveSwitchedVaultScan?.(mockEntries)
      await Promise.resolve()
    })

    expect(screen.getByTestId('status-vault-trigger')).toHaveTextContent('Work Vault')
  })

  it('Cmd+1 hides sidebar and note list (editor-only mode)', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })

    // All panels visible by default
    expect(document.querySelector('.app__sidebar')).toBeInTheDocument()
    expect(document.querySelector('.app__note-list')).toBeInTheDocument()

    // Cmd+1 → editor-only
    fireEvent.keyDown(window, { key: '1', metaKey: true })
    await waitFor(() => {
      expect(document.querySelector('.app__sidebar')).not.toBeInTheDocument()
      expect(document.querySelector('.app__note-list')).not.toBeInTheDocument()
    })
  })

  it('Cmd+2 shows editor + note list (sidebar hidden)', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })

    fireEvent.keyDown(window, { key: '2', metaKey: true })
    await waitFor(() => {
      expect(document.querySelector('.app__sidebar')).not.toBeInTheDocument()
      expect(document.querySelector('.app__note-list')).toBeInTheDocument()
    })
  })

  it('Cmd+3 restores all panels after Cmd+1', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })

    // Switch to editor-only first
    fireEvent.keyDown(window, { key: '1', metaKey: true })
    await waitFor(() => {
      expect(document.querySelector('.app__sidebar')).not.toBeInTheDocument()
    })

    // Cmd+3 → all panels
    fireEvent.keyDown(window, { key: '3', metaKey: true })
    await waitFor(() => {
      expect(document.querySelector('.app__sidebar')).toBeInTheDocument()
      expect(document.querySelector('.app__note-list')).toBeInTheDocument()
    })
  })

  it('updates the main-window size constraints when the view mode changes', async () => {
    const { invoke } = await import('@tauri-apps/api/core') as { invoke: ReturnType<typeof vi.fn> }

    render(<App />)
    await waitFor(() => {
      expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    })

    invoke.mockClear()

    fireEvent.keyDown(window, { key: '1', metaKey: true })
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('update_current_window_min_size', {
        minWidth: 480,
        minHeight: 400,
        growToFit: true,
      })
    })

    invoke.mockClear()

    fireEvent.keyDown(window, { key: '3', metaKey: true })
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('update_current_window_min_size', {
        minWidth: 1030,
        minHeight: 400,
        growToFit: true,
      })
    })
  })

})
