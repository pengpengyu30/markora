import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EDITOR_THEME_IDS } from './editorThemeCatalog'
import { EditorThemeLaboratory } from './EditorThemeLaboratory'

const { replaceBlocksMock, resolveBlocksForTargetMock } = vi.hoisted(() => ({
  replaceBlocksMock: vi.fn(),
  resolveBlocksForTargetMock: vi.fn(),
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

vi.mock('../hooks/useAppPreferences', () => ({
  AppPreferencesProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('../components/SingleEditorView', () => ({
  SingleEditorView: ({
    editorTheme,
    themeMode,
  }: {
    editorTheme?: { id: string }
    themeMode?: string
  }) => (
    <div
      data-testid="laboratory-renderer"
      data-renderer-theme={editorTheme ? `${editorTheme.id}:${themeMode}` : 'missing'}
    />
  ),
}))

vi.mock('./editorThemeLaboratoryFixture', () => ({
  EDITOR_THEME_LABORATORY_FIXTURE_PATH: 'theme-laboratory/editor-themes-phase-3.md',
  EDITOR_THEME_LABORATORY_MARKDOWN: '# laboratory fixture',
}))

describe('EditorThemeLaboratory', () => {
  beforeEach(() => {
    resolveBlocksForTargetMock.mockResolvedValue({ blocks: [] })
    replaceBlocksMock.mockClear()
  })

  it('passes each preview theme and appearance to the renderer boundary', () => {
    render(<EditorThemeLaboratory />)

    expect(screen.getAllByTestId('laboratory-renderer').map((renderer) => (
      renderer.getAttribute('data-renderer-theme')
    ))).toEqual(EDITOR_THEME_IDS.map((themeId) => `${themeId}:light`))
  })
})
