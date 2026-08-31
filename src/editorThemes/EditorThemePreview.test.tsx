import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resolveEffectiveEditorTheme } from './editorThemeCatalog'
import { EditorThemePreview } from './EditorThemePreview'

const { resolveBlocksForTargetMock, replaceBlocksMock } = vi.hoisted(() => ({
  resolveBlocksForTargetMock: vi.fn(),
  replaceBlocksMock: vi.fn(),
}))

vi.mock('@blocknote/react', () => ({
  useCreateBlockNote: () => ({
    document: [],
    replaceBlocks: replaceBlocksMock,
  }),
}))

vi.mock('../components/editorSchema', () => ({ schema: {} }))

vi.mock('../hooks/editorBlockResolution', () => ({
  resolveBlocksForTarget: resolveBlocksForTargetMock,
}))

vi.mock('../components/SingleEditorView', () => ({
  SingleEditorView: ({ editable, editorTheme }: { editable?: boolean; editorTheme?: { id: string; variant: string } }) => (
    <div
      data-testid="editor-theme-preview-renderer"
      data-editable={String(editable)}
      data-renderer-theme={`${editorTheme?.id}:${editorTheme?.variant}`}
    />
  ),
}))

describe('EditorThemePreview', () => {
  beforeEach(() => {
    resolveBlocksForTargetMock.mockResolvedValue({ blocks: [] })
    replaceBlocksMock.mockClear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-editor-theme')
  })

  it('renders the fixed read-only preview in an isolated 100% theme scope', async () => {
    const theme = resolveEffectiveEditorTheme('code', 'dark')

    render(<EditorThemePreview ariaLabel="Editor theme preview" theme={theme} />)

    const preview = screen.getByTestId('settings-editor-theme-preview')
    expect(preview).toHaveAttribute('role', 'region')
    expect(preview).toHaveAttribute('aria-label', 'Editor theme preview')
    expect(preview).toHaveAttribute('data-editor-theme', 'code')
    expect(preview).toHaveAttribute('data-editor-theme-variant', 'dark')
    expect(preview).toHaveAttribute('data-editor-theme-scale', '100')
    expect(preview.style.getPropertyValue('--editor-theme-surfaces-canvas')).toBe('#111827')
    expect(preview.style.getPropertyValue('--editor-max-width')).toBe('900px')
    expect(screen.getByTestId('editor-theme-preview-renderer')).toHaveAttribute('data-editable', 'false')
    expect(screen.getByTestId('editor-theme-preview-renderer')).toHaveAttribute('data-renderer-theme', 'code:dark')
    expect(document.documentElement).not.toHaveAttribute('data-theme')
    expect(document.documentElement).not.toHaveAttribute('data-editor-theme')

    await vi.waitFor(() => expect(resolveBlocksForTargetMock).toHaveBeenCalledWith(expect.objectContaining({
      targetPath: 'settings/editor-theme-preview.md',
      content: expect.stringContaining('# Editor theme preview'),
    })));
  })
})
