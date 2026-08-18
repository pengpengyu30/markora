import { useState, type ComponentProps } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FolderTree } from './FolderTree'
import { FOLDER_ROW_NESTING_INDENT, getFolderConnectorLeft } from './folder-tree/folderTreeLayout'
import { CREATE_NOTE_IN_FOLDER_EVENT } from '../hooks/noteCreationRequests'
import type { FolderNode, SidebarSelection } from '../types'

const mockFolders: FolderNode[] = [
  {
    name: 'projects',
    path: 'projects',
    children: [
      { name: 'laputa', path: 'projects/laputa', children: [] },
      { name: 'portfolio', path: 'projects/portfolio', children: [] },
    ],
  },
  { name: 'areas', path: 'areas', children: [] },
  { name: 'journal', path: 'journal', children: [] },
]

const defaultSelection: SidebarSelection = { kind: 'filter', filter: 'all' }
const vaultRootPath = '/Users/luca/Laputa'

const multiProjectFolders: FolderNode[] = [
  {
    name: 'Project A',
    path: '',
    rootPath: '/projects/a',
    color: 'orange',
    children: [{ name: 'docs-a', path: 'docs-a', rootPath: '/projects/a', children: [] }],
  },
  {
    name: 'Project B',
    path: '',
    rootPath: '/projects/b',
    color: 'purple',
    children: [{ name: 'docs-b', path: 'docs-b', rootPath: '/projects/b', children: [] }],
  },
]

function renderTree(props: Partial<ComponentProps<typeof FolderTree>> = {}) {
  const onSelect = props.onSelect ?? vi.fn()
  render(
    <FolderTree
      folders={mockFolders}
      selection={defaultSelection}
      onSelect={onSelect}
      {...props}
    />,
  )
  return { onSelect }
}

function clickFolderRow(path: string) {
  fireEvent.click(screen.getByTestId(`folder-row:${path}`))
}

async function submitNewFolder(name: string) {
  fireEvent.click(screen.getByTestId('create-folder-btn'))
  const input = screen.getByTestId('new-folder-input')
  fireEvent.change(input, { target: { value: name } })
  await act(async () => {
    fireEvent.keyDown(input, { key: 'Enter' })
  })
}

describe('FolderTree', () => {
  it('renders nothing when folders is empty', () => {
    const { container } = render(
      <FolderTree folders={[]} selection={defaultSelection} onSelect={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders FOLDERS header and top-level folders', () => {
    render(<FolderTree folders={mockFolders} selection={defaultSelection} onSelect={vi.fn()} />)
    expect(screen.getByText('FOLDERS')).toBeInTheDocument()
    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('areas')).toBeInTheDocument()
    expect(screen.getByText('journal')).toBeInTheDocument()
  })

  it('renders the vault root as the top-level folder when a vault path is available', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        vaultRootPath={vaultRootPath}
      />,
    )

    expect(screen.getByText('Laputa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Laputa' })).toBeInTheDocument()
    expect(screen.getByText('projects')).toBeInTheDocument()
    expect(screen.getByText('areas')).toBeInTheDocument()
    expect(screen.getByText('journal')).toBeInTheDocument()
  })

  it('renders the vault root even when the vault has no subfolders', () => {
    render(
      <FolderTree
        folders={[]}
        selection={defaultSelection}
        onSelect={vi.fn()}
        vaultRootPath={vaultRootPath}
      />,
    )

    expect(screen.getByText('Laputa')).toBeInTheDocument()
  })


  it('lets the vault root collapse and expand from the row', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={{ kind: 'folder', path: '', rootPath: vaultRootPath }}
        onSelect={vi.fn()}
        vaultRootPath={vaultRootPath}
      />,
    )

    fireEvent.click(screen.getByTestId('folder-row:'))
    expect(screen.queryByText('projects')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('folder-row:'))
    expect(screen.getByText('projects')).toBeInTheDocument()
  })

  it('selects an unselected folder without changing its expansion', () => {
    render(<FolderTree folders={mockFolders} selection={defaultSelection} onSelect={vi.fn()} />)
    expect(screen.queryByText('laputa')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('folder-row:projects'))
    expect(screen.queryByText('laputa')).not.toBeInTheDocument()
    expect(screen.queryByText('portfolio')).not.toBeInTheDocument()
  })

  it('calls onSelect with folder kind when clicking a folder row', () => {
    const onSelect = vi.fn()
    render(<FolderTree folders={mockFolders} selection={defaultSelection} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('folder-row:projects'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'folder', path: 'projects' })
  })

  it('selects the vault root with the root path attached', () => {
    const { onSelect } = renderTree({ vaultRootPath })

    clickFolderRow('')
    expect(onSelect).toHaveBeenCalledWith({ kind: 'folder', path: '', rootPath: vaultRootPath })
  })

  it('selects child folders with the vault root path attached when the tree has a root', () => {
    const { onSelect } = renderTree({ vaultRootPath })

    clickFolderRow('areas')

    expect(onSelect).toHaveBeenCalledWith({ kind: 'folder', path: 'areas', rootPath: vaultRootPath })
  })

  it('expands an already-selected collapsed folder synchronously', () => {
    function FolderTreeHarness() {
      const [selection, setSelection] = useState<SidebarSelection>({ kind: 'folder', path: 'projects' })
      return <FolderTree folders={mockFolders} selection={selection} onSelect={setSelection} />
    }

    render(<FolderTreeHarness />)

    fireEvent.click(screen.getByTestId('folder-row:projects'))
    expect(screen.getByText('laputa')).toBeInTheDocument()
    expect(screen.getByText('portfolio')).toBeInTheDocument()
  })

  it('collapses an already-selected expanded folder synchronously', () => {
    function FolderTreeHarness() {
      const [selection, setSelection] = useState<SidebarSelection>({ kind: 'folder', path: 'projects' })
      return <FolderTree folders={mockFolders} selection={selection} onSelect={setSelection} />
    }

    render(<FolderTreeHarness />)

    fireEvent.click(screen.getByTestId('folder-row:projects'))
    expect(screen.getByText('laputa')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('folder-row:projects'))
    expect(screen.queryByText('laputa')).not.toBeInTheDocument()
  })

  it('toggles on every consecutive click without using click-count detail', () => {
    function FolderTreeHarness() {
      const [selection, setSelection] = useState<SidebarSelection>({ kind: 'folder', path: 'projects' })
      return <FolderTree folders={mockFolders} selection={selection} onSelect={setSelection} />
    }

    render(<FolderTreeHarness />)
    const row = screen.getByTestId('folder-row:projects')

    fireEvent.click(row, { detail: 1 })
    expect(screen.getByText('laputa')).toBeInTheDocument()

    fireEvent.click(row, { detail: 2 })
    expect(screen.queryByText('laputa')).not.toBeInTheDocument()

    fireEvent.click(row, { detail: 3 })
    expect(screen.getByText('laputa')).toBeInTheDocument()
  })

  it('keeps an expanded folder open when selecting a different folder', () => {
    function FolderTreeHarness() {
      const [selection, setSelection] = useState<SidebarSelection>(defaultSelection)
      return <FolderTree folders={mockFolders} selection={selection} onSelect={setSelection} />
    }

    render(<FolderTreeHarness />)

    fireEvent.click(screen.getByTestId('folder-row:projects'))
    fireEvent.click(screen.getByTestId('folder-row:projects'))
    expect(screen.getByText('laputa')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('folder-row:areas'))
    fireEvent.click(screen.getByTestId('folder-row:projects'))

    expect(screen.getByText('laputa')).toBeInTheDocument()
    expect(screen.getByText('portfolio')).toBeInTheDocument()
  })

  it('collapses section when clicking the FOLDERS header', () => {
    render(<FolderTree folders={mockFolders} selection={defaultSelection} onSelect={vi.fn()} />)
    expect(screen.getByText('projects')).toBeInTheDocument()
    fireEvent.click(screen.getByText('FOLDERS'))
    expect(screen.queryByText('projects')).not.toBeInTheDocument()
  })

  it('highlights the selected folder with a background while keeping neutral text', () => {
    const selection: SidebarSelection = { kind: 'folder', path: 'areas' }
    render(<FolderTree folders={mockFolders} selection={selection} onSelect={vi.fn()} />)
    const row = screen.getByTestId('folder-row:areas')
    expect(row.parentElement).toHaveClass('bg-[var(--accent-blue-light)]')
    expect(row).toHaveClass('text-foreground')
    expect(row).not.toHaveClass('text-primary')
  })

  it('opens the create-folder input from the header action', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onCreateFolder={vi.fn().mockResolvedValue(true)}
      />,
    )
    fireEvent.click(screen.getByTestId('create-folder-btn'))
    expect(screen.getByTestId('new-folder-input')).toBeInTheDocument()
  })

  it('places the header create input under the active Project root', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    render(
      <FolderTree
        folders={multiProjectFolders}
        selection={defaultSelection}
        activeProjectPath="/projects/b"
        onSelect={vi.fn()}
        onCreateFolder={onCreateFolder}
      />,
    )

    fireEvent.click(screen.getByTestId('create-folder-btn'))

    const input = screen.getByTestId('new-folder-input')
    const projectARow = screen.getByRole('button', { name: 'Project A' }).parentElement
    const projectBRow = screen.getByRole('button', { name: 'Project B' }).parentElement
    expect(projectARow?.nextElementSibling).not.toContainElement(input)
    expect(projectBRow?.nextElementSibling).toContainElement(input)

    fireEvent.change(input, { target: { value: 'inbox' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('inbox', { path: '', rootPath: '/projects/b' })
    })
  })

  it('passes the selected folder as the parent when creating a new folder', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    renderTree({
      selection: { kind: 'folder', path: 'projects', rootPath: vaultRootPath },
      onCreateFolder,
      vaultRootPath,
    })

    await submitNewFolder('laputa')

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('laputa', {
        path: 'projects',
        rootPath: vaultRootPath,
      })
    })
  })

  it('passes the target vault root when the vault root is selected', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    const otherVault = '/Users/luca/Team'
    const folders: FolderNode[] = [
      {
        name: 'Personal',
        path: '',
        rootPath: vaultRootPath,
        children: [{ name: 'areas', path: 'areas', rootPath: vaultRootPath, children: [] }],
      },
      {
        name: 'Team',
        path: '',
        rootPath: otherVault,
        children: [{ name: 'areas', path: 'areas', rootPath: otherVault, children: [] }],
      },
    ]

    renderTree({
      folders,
      selection: { kind: 'folder', path: '', rootPath: otherVault },
      onCreateFolder,
      vaultRootPath,
    })

    await submitNewFolder('inbox')

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('inbox', {
        path: '',
        rootPath: otherVault,
      })
    })
  })

  it('uses the default vault root when no folder-like selection is active', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    renderTree({ onCreateFolder, vaultRootPath })

    await submitNewFolder('inbox')

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('inbox', { path: '', rootPath: vaultRootPath })
    })
  })

  it('omits parent context when the folder tree has no Project root', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    renderTree({ onCreateFolder })

    await submitNewFolder('inbox')

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('inbox', undefined)
    })
  })

  it('expands the selected parent after a successful create so the new child is visible', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    render(
      <FolderTree
        folders={mockFolders}
        selection={{ kind: 'folder', path: 'projects' }}
        onSelect={vi.fn()}
        onCreateFolder={onCreateFolder}
      />,
    )

    // Sanity: selecting a folder auto-expands its ancestors but not the folder
    // itself, so 'projects' starts collapsed.
    expect(screen.getByRole('button', { name: 'projects' })).toHaveAttribute('aria-expanded', 'false')

    await submitNewFolder('laputa')

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalled()
    })
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'projects' })).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('leaves expansion alone when create resolves falsy (validation rejected, etc.)', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(false)
    render(
      <FolderTree
        folders={mockFolders}
        selection={{ kind: 'folder', path: 'projects' }}
        onSelect={vi.fn()}
        onCreateFolder={onCreateFolder}
      />,
    )

    await submitNewFolder('laputa')

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: 'projects' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not start rename on folder double-click', () => {
    const onStartRenameFolder = vi.fn()
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onRenameFolder={vi.fn().mockResolvedValue(true)}
        onStartRenameFolder={onStartRenameFolder}
        onCancelRenameFolder={vi.fn()}
      />,
    )
    fireEvent.doubleClick(screen.getByTestId('folder-row:projects'))
    expect(onStartRenameFolder).not.toHaveBeenCalled()
  })

  it('starts rename from the folder context menu', () => {
    const onStartRenameFolder = vi.fn()
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onStartRenameFolder={onStartRenameFolder}
      />,
    )

    fireEvent.contextMenu(screen.getByTestId('folder-row:projects'))
    fireEvent.click(screen.getByText('Rename folder...'))

    expect(onStartRenameFolder).toHaveBeenCalledWith('projects')
  })

  it('keeps rename and delete out of row hover actions', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onDeleteFolder={vi.fn()}
        onRenameFolder={vi.fn().mockResolvedValue(true)}
        onStartRenameFolder={vi.fn()}
        onCancelRenameFolder={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('rename-folder-btn:projects')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delete-folder-btn:projects')).not.toBeInTheDocument()
  })

  it('does not render folder-level disclosure buttons', () => {
    render(<FolderTree folders={mockFolders} selection={defaultSelection} onSelect={vi.fn()} />)

    const leafRowContainer = screen.getByTestId('folder-row:areas').parentElement
    const parentRowContainer = screen.getByTestId('folder-row:projects').parentElement

    expect(leafRowContainer).not.toBeNull()
    expect(parentRowContainer).not.toBeNull()
    expect(within(leafRowContainer as HTMLElement).queryAllByRole('button')).toHaveLength(1)
    expect(within(parentRowContainer as HTMLElement).queryAllByRole('button')).toHaveLength(1)
    expect(screen.queryByLabelText('Expand projects')).not.toBeInTheDocument()
  })

  it('aligns nested folders with the parent folder name and centers connectors on parent icons', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        vaultRootPath={vaultRootPath}
      />,
    )

    expect(screen.getByTestId('folder-row:').parentElement).toHaveStyle({ paddingLeft: '0px' })
    expect(screen.getByTestId('folder-row:projects').parentElement).toHaveStyle({ paddingLeft: `${FOLDER_ROW_NESTING_INDENT}px` })
    expect(screen.getByTestId('folder-connector:')).toHaveStyle({ left: `${getFolderConnectorLeft(0)}px` })
  })

  it('shows the rename input when a folder is being renamed', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={{ kind: 'folder', path: 'areas' }}
        onSelect={vi.fn()}
        onRenameFolder={vi.fn().mockResolvedValue(true)}
        renamingFolderPath="areas"
        onCancelRenameFolder={vi.fn()}
      />,
    )
    expect(screen.getByTestId('rename-folder-input')).toBeInTheDocument()
  })

  it('keeps folder toggling healthy after cancelling rename', () => {
    const onCancelRenameFolder = vi.fn()
    const { rerender } = render(
      <FolderTree
        folders={mockFolders}
        selection={{ kind: 'folder', path: 'projects' }}
        onSelect={vi.fn()}
        onRenameFolder={vi.fn().mockResolvedValue(true)}
        renamingFolderPath="projects"
        onCancelRenameFolder={onCancelRenameFolder}
      />,
    )

    fireEvent.keyDown(screen.getByTestId('rename-folder-input'), { key: 'Escape' })
    expect(onCancelRenameFolder).toHaveBeenCalledTimes(1)

    rerender(
      <FolderTree
        folders={mockFolders}
        selection={{ kind: 'folder', path: 'projects' }}
        onSelect={vi.fn()}
        onRenameFolder={vi.fn().mockResolvedValue(true)}
        onCancelRenameFolder={onCancelRenameFolder}
      />,
    )

    const wasExpanded = screen.queryByText('laputa') !== null
    fireEvent.click(screen.getByTestId('folder-row:projects'))

    expect(screen.queryByText('laputa') !== null).toBe(!wasExpanded)
  })

  it('commits folder rename on blur so the row can collapse afterward', async () => {
    const renameSpy = vi.fn()

    function FolderTreeRenameHarness() {
      const [renamingFolderPath, setRenamingFolderPath] = useState<string | null>('projects')
      return (
        <FolderTree
          folders={mockFolders}
          selection={{ kind: 'folder', path: 'projects' }}
          onSelect={vi.fn()}
          onRenameFolder={(folderPath, nextName) => {
            renameSpy(folderPath, nextName)
            setRenamingFolderPath(null)
            return true
          }}
          renamingFolderPath={renamingFolderPath}
          onCancelRenameFolder={() => setRenamingFolderPath(null)}
        />
      )
    }

    render(<FolderTreeRenameHarness />)

    fireEvent.blur(screen.getByTestId('rename-folder-input'))

    await vi.waitFor(() => {
      expect(renameSpy).toHaveBeenCalledWith('projects', 'projects')
    })
    expect(screen.queryByTestId('rename-folder-input')).not.toBeInTheDocument()
    expect(screen.queryByText('laputa')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('folder-row:projects'))

    expect(screen.getByText('laputa')).toBeInTheDocument()
  })

  it('opens a context menu with a delete action on right-click', () => {
    const onDeleteFolder = vi.fn()
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onDeleteFolder={onDeleteFolder}
        onStartRenameFolder={vi.fn()}
      />,
    )
    fireEvent.contextMenu(screen.getByText('projects'))
    expect(screen.getByTestId('folder-context-menu')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('delete-folder-menu-item'))
    expect(onDeleteFolder).toHaveBeenCalledWith('projects')
  })

  it('enables context actions for a writable non-active Project and preserves its root', () => {
    const onDeleteFolder = vi.fn()
    const onStartRenameFolder = vi.fn()
    render(
      <FolderTree
        folders={multiProjectFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onDeleteFolder={onDeleteFolder}
        onStartRenameFolder={onStartRenameFolder}
        writableVaultPaths={['/projects/a', '/projects/b']}
      />,
    )

    fireEvent.contextMenu(screen.getByText('docs-b'))
    fireEvent.click(screen.getByText('Rename folder...'))
    expect(onStartRenameFolder).toHaveBeenCalledWith('docs-b', '/projects/b')

    fireEvent.contextMenu(screen.getByText('docs-b'))
    fireEvent.click(screen.getByTestId('delete-folder-menu-item'))
    expect(onDeleteFolder).toHaveBeenCalledWith('docs-b', '/projects/b')
  })

  it('scrolls the selected Project folder into view after selection changes', () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    render(
      <FolderTree
        folders={multiProjectFolders}
        selection={{ kind: 'folder', path: 'docs-b', rootPath: '/projects/b' }}
        onSelect={vi.fn()}
        writableVaultPaths={['/projects/a', '/projects/b']}
      />,
    )

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })

  it('renders Project root icons without their configured identity colors', () => {
    render(
      <FolderTree
        folders={multiProjectFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
      />,
    )

    const projectAIcon = screen.getByRole('button', { name: 'Project A' }).querySelector('svg')
    const projectBIcon = screen.getByRole('button', { name: 'Project B' }).querySelector('svg')

    expect(projectAIcon).not.toHaveAttribute('style')
    expect(projectBIcon).not.toHaveAttribute('style')
  })

  it('sizes the folder context menu to visible actions instead of filling the viewport', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        folderFileActions={{
          copyFolderPath: vi.fn(),
          revealFolder: vi.fn(),
        }}
        onDeleteFolder={vi.fn()}
        onStartRenameFolder={vi.fn()}
      />,
    )

    fireEvent.contextMenu(screen.getByText('projects'))

    const menu = screen.getByTestId('folder-context-menu')
    expect(menu).toHaveClass('w-max')
    expect(menu).toHaveClass('min-w-[min(11.25rem,calc(100vw-16px))]')
    expect(menu).toHaveClass('max-w-[min(22rem,calc(100vw-16px))]')
  })

  it('dismisses the folder context menu on Escape', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onDeleteFolder={vi.fn()}
        onStartRenameFolder={vi.fn()}
      />,
    )
    fireEvent.contextMenu(screen.getByText('projects'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('folder-context-menu')).not.toBeInTheDocument()
  })

  it('opens folder file actions from the context menu', () => {
    const onRevealFolder = vi.fn()
    const onCopyFolderPath = vi.fn()
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        folderFileActions={{
          copyFolderPath: onCopyFolderPath,
          revealFolder: onRevealFolder,
        }}
        onStartRenameFolder={vi.fn()}
      />,
    )

    fireEvent.contextMenu(screen.getByText('projects'))
    fireEvent.click(screen.getByTestId('reveal-folder-menu-item'))
    expect(onRevealFolder).toHaveBeenCalledWith('projects')

    fireEvent.contextMenu(screen.getByText('projects'))
    fireEvent.click(screen.getByTestId('copy-folder-path-menu-item'))
    expect(onCopyFolderPath).toHaveBeenCalledWith('projects')
  })

  it('creates a note in the right-clicked mounted folder', () => {
    const onCreateNoteInFolder = vi.fn()
    const folders: FolderNode[] = [
      {
        name: 'Personal',
        path: '',
        rootPath: '/Users/luca/Personal',
        children: [{ name: 'projects', path: 'projects', rootPath: '/Users/luca/Personal', children: [] }],
      },
      {
        name: 'Team',
        path: '',
        rootPath: '/Users/luca/Team',
        children: [{ name: 'projects', path: 'projects', rootPath: '/Users/luca/Team', children: [] }],
      },
    ]

    render(
      <FolderTree
        folders={folders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        vaultRootPath="/Users/luca/Team"
      />,
    )

    window.addEventListener(CREATE_NOTE_IN_FOLDER_EVENT, onCreateNoteInFolder)
    fireEvent.contextMenu(screen.getAllByTestId('folder-row:projects')[1])
    fireEvent.click(screen.getByTestId('create-note-in-folder-menu-item'))

    expect(onCreateNoteInFolder).toHaveBeenCalledOnce()
    expect((onCreateNoteInFolder.mock.calls[0][0] as CustomEvent).detail).toEqual({
      folderPath: 'projects',
      rootPath: '/Users/luca/Team',
    })
    window.removeEventListener(CREATE_NOTE_IN_FOLDER_EVENT, onCreateNoteInFolder)
  })

  it('creates a folder inside the right-clicked folder', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(true)
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        onCreateFolder={onCreateFolder}
      />,
    )

    fireEvent.contextMenu(screen.getByText('projects'))
    fireEvent.click(screen.getByTestId('create-folder-in-folder-menu-item'))

    const parentRow = screen.getByTestId('folder-create-parent:projects')
    const input = within(parentRow).getByTestId('new-folder-input')
    fireEvent.change(input, { target: { value: 'research' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    await vi.waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('research', { path: 'projects' })
    })
  })

  it('keeps destructive folder actions off the vault root row and menu', () => {
    render(
      <FolderTree
        folders={mockFolders}
        selection={defaultSelection}
        onSelect={vi.fn()}
        folderFileActions={{
          copyFolderPath: vi.fn(),
          revealFolder: vi.fn(),
        }}
        onDeleteFolder={vi.fn()}
        onRenameFolder={vi.fn().mockResolvedValue(true)}
        onStartRenameFolder={vi.fn()}
        onCancelRenameFolder={vi.fn()}
        vaultRootPath={vaultRootPath}
      />,
    )

    expect(screen.queryByTestId('rename-folder-btn:')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delete-folder-btn:')).not.toBeInTheDocument()

    fireEvent.contextMenu(screen.getByText('Laputa'))

    expect(screen.getByTestId('reveal-folder-menu-item')).toBeInTheDocument()
    expect(screen.getByTestId('copy-folder-path-menu-item')).toBeInTheDocument()
    expect(screen.queryByText('Rename folder...')).not.toBeInTheDocument()
    expect(screen.queryByTestId('delete-folder-menu-item')).not.toBeInTheDocument()
  })

  it('moves a dragged note onto an eligible folder row', () => {
    const onMoveNoteToFolder = vi.fn()
    renderTree({
      onCanDropNote: (notePath, folderPath) => notePath === '/vault/alpha.md' && folderPath === 'projects',
      onMoveNoteToFolder,
    })

    const dataTransfer = {
      dropEffect: 'none',
      getData: vi.fn((type: string) => type === 'application/x-tolaria-note-path' ? '/vault/alpha.md' : ''),
    }
    const row = screen.getByTestId('folder-row:projects')

    fireEvent.dragOver(row, { dataTransfer })
    fireEvent.drop(row, { dataTransfer })

    expect(dataTransfer.dropEffect).toBe('move')
    expect(onMoveNoteToFolder).toHaveBeenCalledWith('/vault/alpha.md', 'projects')
  })

  it('moves a dragged note onto the vault root row', () => {
    const onMoveNoteToFolder = vi.fn()
    renderTree({
      onCanDropNote: (notePath, folderPath) => notePath === '/vault/projects/alpha.md' && folderPath === '',
      onMoveNoteToFolder,
      vaultRootPath,
    })

    const dataTransfer = {
      dropEffect: 'none',
      getData: vi.fn((type: string) => type === 'application/x-tolaria-note-path' ? '/vault/projects/alpha.md' : ''),
    }

    fireEvent.drop(screen.getByTestId('folder-row:'), { dataTransfer })

    expect(onMoveNoteToFolder).toHaveBeenCalledWith('/vault/projects/alpha.md', '')
  })
})
