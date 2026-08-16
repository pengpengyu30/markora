import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditorContentLayout } from './EditorContentLayout'

vi.mock('../BreadcrumbBar', () => ({
  BreadcrumbBar: ({ content, noteWidth }: { content?: string; noteWidth?: string }) => (
    <div data-testid="breadcrumb-bar" data-content={content} data-note-width={noteWidth} />
  ),
}))

vi.mock('../ArchivedNoteBanner', () => ({
  ArchivedNoteBanner: () => <div data-testid="archived-banner" />,
}))

vi.mock('../RawEditorView', () => ({
  RawEditorView: () => <div data-testid="raw-editor-view" />,
}))

vi.mock('../FilePreview', () => ({
  FilePreview: ({ entry }: { entry: { path: string } }) => (
    <div data-testid="file-preview" data-path={entry.path} />
  ),
}))

vi.mock('../SingleEditorView', () => ({
  SingleEditorView: ({ availableTags, onUpdateTags }: { availableTags?: unknown[]; onUpdateTags?: unknown }) => (
    <div
      data-testid="single-editor-view"
      data-available-tags={availableTags?.length ?? 0}
      data-has-update-tags={onUpdateTags ? 'true' : 'false'}
    />
  ),
}))

function createModel(overrides: Record<string, unknown> = {}) {
  return {
    activeTab: {
      entry: {
        path: '/vault/project/demo.md',
        filename: 'demo.md',
        title: 'Demo Note',
      },
      content: 'Body',
    },
    isLoadingNewTab: false,
    entries: [],
    editor: {},
    richEditorContentReady: true,
    effectiveRawMode: false,
    onToggleRaw: vi.fn(),
    onRawContentChange: vi.fn(),
    onSave: vi.fn(),
    showEditor: true,
    isArchived: false,
    onUnarchiveNote: undefined,
    path: '/vault/project/demo.md',
    breadcrumbBarRef: createRef<HTMLDivElement>(),
    wordCount: 12,
    vaultPath: '/vault',
    cssVars: {},
    onNavigateWikilink: vi.fn(),
    onEditorChange: vi.fn(),
    isDeletedPreview: false,
    isHtmlFile: false,
    legacyUnsupportedKind: null,
    rawLatestContentRef: { current: null },
    noteWidth: 'normal',
    onToggleNoteWidth: vi.fn(),
    forceRawMode: false,
    onToggleFavorite: vi.fn(),
    onToggleOrganized: vi.fn(),
    onDeleteNote: vi.fn(),
    onArchiveNote: vi.fn(),
    ...overrides,
  } as never
}

describe('EditorContentLayout', () => {
  it('never renders the legacy title section', () => {
    const { container } = render(<EditorContentLayout {...createModel()} />)

    expect(container.querySelector('.title-section')).toBeNull()
    expect(screen.queryByTestId('title-field-input')).not.toBeInTheDocument()
    expect(screen.getByTestId('single-editor-view')).toBeInTheDocument()
  })

  it('does not show stale editor chrome while switching tabs', () => {
    const { container } = render(
      <EditorContentLayout
        {...createModel({
          activeTab: null,
          isLoadingNewTab: true,
        })}
      />,
    )

    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(screen.queryByTestId('single-editor-view')).not.toBeInTheDocument()
    expect(screen.queryByTestId('title-field-input')).not.toBeInTheDocument()
  })

  it('keeps stale rich-editor content hidden until the selected note swap is applied', () => {
    const { container } = render(
      <EditorContentLayout
        {...createModel({
          richEditorContentReady: false,
          activeTab: {
            entry: {
              path: '/vault/project/new-note.md',
              filename: 'new-note.md',
              title: 'New Note',
            },
            content: '# New Note',
          },
        })}
      />,
    )

    expect(screen.queryByTestId('single-editor-view')).not.toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeNull()
    expect(screen.getByTestId('breadcrumb-bar')).toHaveAttribute('data-content', '# New Note')
  })

  it('marks the editor content root and breadcrumb with the note width mode', () => {
    const { container } = render(<EditorContentLayout {...createModel({ noteWidth: 'wide' })} />)

    expect(container.firstElementChild).toHaveClass('editor-content-width--wide')
    expect(screen.getByTestId('breadcrumb-bar')).toHaveAttribute('data-note-width', 'wide')
  })

  it('passes the active note content into the breadcrumb', () => {
    render(<EditorContentLayout {...createModel({
      activeTab: {
        entry: {
          path: '/vault/project/ref-570.md',
          filename: 'ref-570.md',
          title: 'Reference Planning Notes',
        },
        content: '---\ntitle: Reference Planning Notes\n---\n\nBody',
      },
    })} />)

    expect(screen.getByTestId('breadcrumb-bar')).toHaveAttribute(
      'data-content',
      '---\ntitle: Reference Planning Notes\n---\n\nBody',
    )
  })

  it('passes tag editing controls into the rich editor surface', () => {
    render(<EditorContentLayout {...createModel({
      availableTags: [{ name: 'product', count: 2 }],
      onUpdateTags: vi.fn(),
    })} />)

    expect(screen.getByTestId('single-editor-view')).toHaveAttribute('data-available-tags', '1')
    expect(screen.getByTestId('single-editor-view')).toHaveAttribute('data-has-update-tags', 'true')
  })

  it('keeps raw mode out of the rich-editor content wrapper', () => {
    render(<EditorContentLayout {...createModel({
      effectiveRawMode: true,
      showEditor: false,
      noteWidth: 'normal',
    })} />)

    const rawEditor = screen.getByTestId('raw-editor-view')
    const findScope = rawEditor.closest('[data-editor-find-scope="true"]')

    expect(findScope).toHaveClass('editor-scroll-area')
    expect(rawEditor.closest('.editor-content-wrapper')).toBeNull()
  })

  it.each([
    ['HTML files', { isHtmlFile: true, fileKind: 'text' }],
    ['legacy Sheet notes', { legacyUnsupportedKind: 'sheet' }],
  ])('renders %s through the generic unsupported fallback without mounting the rich editor', (_label, flags) => {
    render(<EditorContentLayout {...createModel({
      ...flags,
      richEditorContentReady: false,
      activeTab: {
        entry: {
          path: '/vault/reports/status.html',
          filename: 'status.html',
          title: 'Status',
          ...('fileKind' in flags ? { fileKind: flags.fileKind } : {}),
        },
        content: 'legacy content',
      },
    })} />)

    expect(screen.getByTestId('file-preview')).toHaveAttribute('data-path', '/vault/reports/status.html')
    expect(screen.queryByTestId('single-editor-view')).not.toBeInTheDocument()
    expect(screen.queryByTestId('raw-editor-view')).not.toBeInTheDocument()
  })
})
