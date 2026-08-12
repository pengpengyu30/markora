import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'
import type { Settings } from '../types'
import { THEME_MODE_STORAGE_KEY } from '../lib/themeMode'

const { registerEscapeSurfaceMock, unregisterEscapeSurfaceMock } = vi.hoisted(() => ({
  registerEscapeSurfaceMock: vi.fn(),
  unregisterEscapeSurfaceMock: vi.fn(),
}))

vi.mock('../utils/macosDismissableEscapeSurface', () => ({
  registerMacosDismissableEscapeSurface: registerEscapeSurfaceMock,
}))

const emptySettings: Settings = {
  auto_pull_interval_minutes: null,
  git_enabled: null,
  git_path: null,
  git_provider: null,
  git_wsl_distro: null,
  autogit_enabled: null,
  autogit_idle_threshold_seconds: null,
  autogit_inactive_threshold_seconds: null,
  release_channel: null,
  automatic_update_checks_enabled: null,
  theme_mode: null,
  ui_language: null,
  date_display_format: null,
  hide_gitignored_files: null,
  all_notes_show_pdfs: null,
  all_notes_show_images: null,
  all_notes_show_unsupported: null,
  note_list_show_filename: null,
  folder_view_show_non_markdown: null,
}

function installPointerCapturePolyfill() {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {}
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
}

function createStorageMock(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: vi.fn(() => { values.clear() }),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => { values.delete(key) }),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
}

function installMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    })),
  })
}

describe('SettingsPanel', () => {
  const onSave = vi.fn()
  const onClose = vi.fn()
  const localStorageMock = createStorageMock()

  it('registers only while the Settings surface is visible', () => {
    registerEscapeSurfaceMock.mockReturnValue(unregisterEscapeSurfaceMock)
    const view = render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(registerEscapeSurfaceMock).toHaveBeenCalledOnce()

    view.rerender(
      <SettingsPanel open={false} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(unregisterEscapeSurfaceMock).toHaveBeenCalledOnce()
  })

  function renderOpenSettings(settings: Settings = emptySettings) {
    return render(
      <SettingsPanel open={true} settings={settings} onSave={onSave} onClose={onClose} />
    )
  }

  function saveSettingsPanel() {
    fireEvent.click(screen.getByTestId('settings-save'))
  }

  function expectSettingsSaved(partial: Partial<Settings>) {
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining(partial))
  }

  function selectThemeMode(label: string) {
    fireEvent.click(screen.getByRole('radio', { name: label }))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
    installMatchMedia(false)
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    installPointerCapturePolyfill()
  })

  it('renders nothing when not open', () => {
    const { container } = render(
      <SettingsPanel open={false} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders modal when open', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getAllByText('Sync & Updates').length).toBeGreaterThan(0)
  })

  it('updates the draft language when stored settings finish loading', () => {
    const { rerender } = render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    rerender(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, ui_language: 'zh-CN' }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  }, 10_000)

  it('calls onSave with stable defaults on save', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      initial_h1_auto_rename_enabled: true,
      release_channel: null,
      automatic_update_checks_enabled: null,
      theme_mode: 'light',
      date_display_format: 'friendly',
      note_width_mode: 'normal',
      hide_gitignored_files: true,
      all_notes_show_pdfs: false,
      all_notes_show_images: false,
      all_notes_show_unsupported: false,
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('saves Gitignored content visibility immediately for keyboard close', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByTestId('settings-hide-gitignored-files'))
    fireEvent.keyDown(screen.getByTestId('settings-panel'), { key: 'Escape' })

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      hide_gitignored_files: false,
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders All Notes file visibility switches off by default', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByText('Show PDFs')).toBeInTheDocument()
    expect(within(screen.getByTestId('settings-all-notes-show-pdfs')).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(within(screen.getByTestId('settings-all-notes-show-images')).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(within(screen.getByTestId('settings-all-notes-show-unsupported')).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders the content display switches off by default', () => {
    renderOpenSettings()

    expect(screen.getByText('Show original filename in the note list')).toBeInTheDocument()
    expect(within(screen.getByTestId('settings-note-list-show-filename')).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    expect(within(screen.getByTestId('settings-folder-view-show-non-markdown')).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('preserves and saves the content display switches', () => {
    renderOpenSettings({
      ...emptySettings,
      note_list_show_filename: true,
      folder_view_show_non_markdown: true,
    })

    expect(within(screen.getByTestId('settings-note-list-show-filename')).getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(within(screen.getByTestId('settings-folder-view-show-non-markdown')).getByRole('switch')).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(within(screen.getByTestId('settings-note-list-show-filename')).getByRole('switch'))
    fireEvent.click(within(screen.getByTestId('settings-folder-view-show-non-markdown')).getByRole('switch'))
    saveSettingsPanel()

    expectSettingsSaved({
      note_list_show_filename: false,
      folder_view_show_non_markdown: false,
    })
  })

  it('preserves saved All Notes file visibility switches', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{
          ...emptySettings,
          all_notes_show_pdfs: true,
          all_notes_show_images: true,
          all_notes_show_unsupported: false,
        }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(within(screen.getByTestId('settings-all-notes-show-pdfs')).getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(within(screen.getByTestId('settings-all-notes-show-images')).getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    expect(within(screen.getByTestId('settings-all-notes-show-unsupported')).getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('saves All Notes file visibility immediately before Escape close', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    const pdfSwitch = within(screen.getByTestId('settings-all-notes-show-pdfs')).getByRole('switch')
    fireEvent.click(pdfSwitch)
    fireEvent.keyDown(screen.getByTestId('settings-panel'), { key: 'Escape' })

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      all_notes_show_pdfs: true,
      all_notes_show_images: false,
      all_notes_show_unsupported: false,
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('saves All Notes visibility toggles without telemetry settings', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(within(screen.getByTestId('settings-all-notes-show-images')).getByRole('switch'))

  })

  it('defaults the color mode control to light', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByTestId('settings-theme-mode')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'false')
  })

  it('defaults the language selector to system language', () => {
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        locale="en"
        systemLocale="zh-CN"
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('settings-ui-language')).toHaveAttribute('data-value', 'system')
    expect(screen.getByText('系统（简体中文）')).toBeInTheDocument()
  })

  it('defaults date display to friendly and note width to normal', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByTestId('settings-date-display-format')).toHaveAttribute('data-value', 'friendly')
    expect(screen.getByTestId('settings-default-note-width')).toHaveAttribute('data-value', 'normal')
  })

  it('preserves saved date display and default note width preferences', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{
          ...emptySettings,
          date_display_format: 'iso',
          note_width_mode: 'wide',
        }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('settings-date-display-format')).toHaveAttribute('data-value', 'iso')
    expect(screen.getByTestId('settings-default-note-width')).toHaveAttribute('data-value', 'wide')
  })

  it('saves date display and default note width preferences', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.pointerDown(screen.getByTestId('settings-date-display-format'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'ISO (2026-05-11)' }))
    fireEvent.pointerDown(screen.getByTestId('settings-default-note-width'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Wide' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      date_display_format: 'iso',
      note_width_mode: 'wide',
    }))
  })

  it('keeps the language selector keyboard accessible', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    const trigger = screen.getByTestId('settings-ui-language')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' })

    expect(screen.getByRole('option', { name: 'Simplified Chinese' })).toBeInTheDocument()
  })

  it('saves the selected UI language and updates visible settings text', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.pointerDown(screen.getByTestId('settings-ui-language'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Simplified Chinese' }))

    expect(screen.getByText('设置')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      ui_language: 'zh-CN',
    }))
  })

  it('uses the stored color mode mirror when settings have no saved mode', () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark')

    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves the selected dark color mode', () => {
    renderOpenSettings()

    selectThemeMode('Dark')
    saveSettingsPanel()

    expectSettingsSaved({
      theme_mode: 'dark',
    })
  })

  it('applies the selected dark color mode immediately while settings stays open', () => {
    renderOpenSettings()

    selectThemeMode('Dark')

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('dark')
    expectSettingsSaved({
      theme_mode: 'dark',
    })
  })

  it('saves system color mode while applying the current OS appearance immediately', () => {
    installMatchMedia(true)
    renderOpenSettings()

    selectThemeMode('System')
    saveSettingsPanel()

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(window.localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('system')
    expectSettingsSaved({
      theme_mode: 'system',
    })
  })

  it('preserves a saved dark color mode until changed', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_mode: 'dark' }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      theme_mode: 'dark',
    }))
  })

  it('defaults the release channel trigger to stable', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByTestId('settings-release-channel')).toHaveAttribute('data-value', 'stable')
    expect(screen.queryByText(/Beta\/Stable/i)).not.toBeInTheDocument()
  })

  it('defaults automatic update checks to on', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByRole('switch', { name: 'Check for updates automatically' })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves the automatic update checks preference when toggled off', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Check for updates automatically' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expectSettingsSaved({
      automatic_update_checks_enabled: false,
    })
  })

  it('treats a legacy beta release channel as stable', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, release_channel: 'beta' }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('settings-release-channel')).toHaveAttribute('data-value', 'stable')
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it('preserves alpha when alpha is already selected', () => {
    const alphaSettings: Settings = {
      ...emptySettings,
      release_channel: 'alpha',
    }

    render(
      <SettingsPanel open={true} settings={alphaSettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      release_channel: 'alpha',
    }))
  })

  it('defaults the initial H1 auto-rename switch to on', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByRole('switch', { name: 'Auto-rename untitled notes from first H1' })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves the initial H1 auto-rename preference when toggled off', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-rename untitled notes from first H1' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      initial_h1_auto_rename_enabled: false,
    }))
  })

  it('calls onClose when Cancel is clicked', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.click(screen.getByTitle('Close settings'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.keyDown(screen.getByTestId('settings-panel'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('saves on Cmd+Enter', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.keyDown(screen.getByTestId('settings-panel'), { key: 'Enter', metaKey: true })

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      theme_mode: 'light',
    }))
  })

  it('calls onClose when clicking backdrop', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.click(screen.getByTestId('settings-panel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows keyboard shortcut hint in footer', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByText(/to open settings/)).toBeInTheDocument()
  })

  it('keeps Tab focus inside the settings panel', () => {
    render(
      <>
        <button type="button" data-testid="background-action">Background</button>
        <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
      </>
    )

    const backgroundAction = screen.getByTestId('background-action')
    const closeButton = screen.getByTitle('Close settings')
    const saveButton = screen.getByTestId('settings-save')

    backgroundAction.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(saveButton).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(closeButton).toHaveFocus()
  })

  it('does not render the removed privacy and telemetry settings', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    expect(screen.queryByTestId('settings-crash-reporting')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-analytics')).not.toBeInTheDocument()
    expect(screen.queryByText('Privacy')).not.toBeInTheDocument()
    expect(screen.queryByText('Telemetry')).not.toBeInTheDocument()
  })
})
