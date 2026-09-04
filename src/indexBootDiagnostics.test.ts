import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EDITOR_THEME_IDS } from './editorThemes/editorThemeCatalog'
import { EDITOR_THEME_STORAGE_KEY } from './lib/editorThemeStorage'

const localStorageMock = (() => {
  let values: Record<string, string> = {}
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => { values[key] = value },
    removeItem: (key: string) => { delete values[key] },
    clear: () => { values = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

const STARTUP_SHELL_FALLBACK_NODE_KEY = '__markoraStartupShellFallbackNode'

function indexHtml(): string {
  return readFileSync(`${process.cwd()}/index.html`, 'utf8')
}

function inlineScriptsFromIndex(): string[] {
  return [...indexHtml().matchAll(/<script>\s*([\s\S]*?)\s*<\/script>/g)].map((match) => match[1])
}

function startupRootContentFromIndex(): string {
  const match = indexHtml().match(/<div id="root">([\s\S]*?)<\/div>\s*<script>\s*\(function \(\) \{\s*var bootShell/)
  if (!match) throw new Error('index.html startup shell root was not found')
  return match[1]
}

function firstInlineScriptFromIndex(): string {
  const script = inlineScriptsFromIndex()[0]
  if (!script) throw new Error('index.html startup script was not found')
  return script
}

function editorThemeStartupScriptFromIndex(): string {
  const script = inlineScriptsFromIndex().find((candidate) => candidate.includes('data-editor-theme'))
  if (!script) throw new Error('index.html editor theme startup script was not found')
  return script
}

describe('index startup script', () => {
  it('does not ship a visible boot diagnostics element by default', () => {
    const html = indexHtml()

    expect(html).not.toContain('Tolaria boot: HTML parsed')
    expect(html).not.toContain('<pre id="markora-boot-diagnostics"')
  })

  it('ships a static startup shell before the React module loads', () => {
    const rootContent = startupRootContentFromIndex()

    expect(rootContent).toContain('id="markora-boot-shell"')
    expect(rootContent).toContain('class="startup-shell-fallback"')
    expect(rootContent).toContain('aria-hidden="true"')
  })

  it('captures the static startup shell markup for the React fallback', () => {
    const captureScript = inlineScriptsFromIndex().find((script) =>
      script.includes('__markoraStartupShellFallbackNode'))
    if (!captureScript) throw new Error('index.html startup shell capture script was not found')

    Reflect.deleteProperty(window, STARTUP_SHELL_FALLBACK_NODE_KEY)
    const parsed = new DOMParser().parseFromString(
      `<div id="root">${startupRootContentFromIndex()}</div>`,
      'text/html',
    )
    document.body.replaceChildren(...parsed.body.childNodes)
    new Function(captureScript)()

    const capturedNode = Reflect.get(window, STARTUP_SHELL_FALLBACK_NODE_KEY)
    expect(capturedNode).toBeInstanceOf(Node)
    expect((capturedNode as Element).querySelector('.startup-shell-fallback__editor-title')).not.toBeNull()
  })

  it('does not show the boot overlay for ResizeObserver loop notifications', () => {
    document.body.replaceChildren()
    new Function(firstInlineScriptFromIndex())()

    const event = new ErrorEvent('error', {
      cancelable: true,
      message: 'ResizeObserver loop completed with undelivered notifications.',
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(document.body.children).toHaveLength(0)
  })

  it('does not create a visible boot overlay for real startup errors', () => {
    document.body.innerHTML = ''
    new Function(firstInlineScriptFromIndex())()

    window.dispatchEvent(new ErrorEvent('error', {
      message: 'startup failed',
      filename: 'app.js',
      lineno: 1,
      colno: 2,
    }))

    expect(document.body.children).toHaveLength(0)
  })

  it('prepaints the validated editor identity and projected application surfaces', () => {
    const script = editorThemeStartupScriptFromIndex()
    const expected = {
      default: {
        light: { app: '#FFFFFF', sidebar: '#F7F6F3', panel: '#F7F6F3', card: '#FFFFFF', popover: '#EBEBEA', button: '#EBEBEA', primary: '#155DFF', heading: '#37352F' },
        dark: { app: '#1F1E1B', sidebar: '#161616', panel: '#161616', card: '#23221F', popover: '#34322D', button: '#34322D', primary: '#8AB4FF', heading: '#F1ECE3' },
      },
      code: {
        light: { app: '#F6F8FB', sidebar: '#F0F4F8', panel: '#F0F4F8', card: '#F8FAFC', popover: '#E7EDF4', button: '#E7EDF4', primary: '#1D4ED8', heading: '#111827' },
        dark: { app: '#111827', sidebar: '#162033', panel: '#162033', card: '#172235', popover: '#25344B', button: '#25344B', primary: '#8AB4FF', heading: '#F8FAFC' },
      },
      editorial: {
        light: { app: '#FCF9F5', sidebar: '#F3EBE5', panel: '#F3EBE5', card: '#F7F0EA', popover: '#EFE5DE', button: '#EFE5DE', primary: '#8F3D52', heading: '#2B2525' },
        dark: { app: '#211D1B', sidebar: '#2A2221', panel: '#2A2221', card: '#2A2221', popover: '#4A3937', button: '#4A3937', primary: '#E39AAA', heading: '#FFF6F1' },
      },
      canvas: {
        light: { app: '#F7F9FC', sidebar: '#EEF2F7', panel: '#EEF2F7', card: '#F3F6FB', popover: '#E9EDF5', button: '#E9EDF5', primary: '#4F46B8', heading: '#172033' },
        dark: { app: '#202225', sidebar: '#292C35', panel: '#292C35', card: '#282B33', popover: '#3F4350', button: '#3F4350', primary: '#A8A4FF', heading: '#FFFFFF' },
      },
    } as const

    for (const appearance of ['light', 'dark'] as const) {
      document.documentElement.setAttribute('data-theme', appearance)
      for (const editorThemeId of EDITOR_THEME_IDS) {
        window.localStorage.setItem(EDITOR_THEME_STORAGE_KEY, editorThemeId)
        new Function(script)()

        expect(document.documentElement).toHaveAttribute('data-editor-theme', editorThemeId)
        expect(document.documentElement).toHaveAttribute('data-theme', appearance)
        const palette = expected[editorThemeId][appearance]
        expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe(palette.app)
        expect(document.documentElement.style.getPropertyValue('--surface-sidebar')).toBe(palette.sidebar)
        expect(document.documentElement.style.getPropertyValue('--surface-panel')).toBe(palette.panel)
        expect(document.documentElement.style.getPropertyValue('--surface-card')).toBe(palette.card)
        expect(document.documentElement.style.getPropertyValue('--surface-popover')).toBe(palette.popover)
        expect(document.documentElement.style.getPropertyValue('--surface-button')).toBe(palette.button)
        expect(document.documentElement.style.getPropertyValue('--card')).toBe(palette.card)
        expect(document.documentElement.style.getPropertyValue('--bg-card')).toBe(palette.card)
        expect(document.documentElement.style.getPropertyValue('--text-heading')).toBe(palette.heading)
        expect(document.documentElement.style.getPropertyValue('--primary')).toBe(palette.primary)
        expect(document.documentElement.style.getPropertyValue('--background')).toBe(palette.app)
        expect(document.documentElement.style.getPropertyValue('--sidebar')).toBe(palette.sidebar)
      }
    }

    window.localStorage.setItem(EDITOR_THEME_STORAGE_KEY, 'removed-theme')
    new Function(script)()

    expect(document.documentElement).toHaveAttribute('data-editor-theme', 'default')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#1F1E1B')
    expect(document.documentElement.style.getPropertyValue('--surface-card')).toBe('#23221F')
    expect(document.documentElement.style.getPropertyValue('--card')).toBe('#23221F')
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#8AB4FF')
  })

  it('falls back to Default when startup cache access is unavailable', () => {
    const script = editorThemeStartupScriptFromIndex()
    const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('SecurityError') },
    })

    try {
      document.documentElement.setAttribute('data-theme', 'dark')
      new Function(script)()

      expect(document.documentElement).toHaveAttribute('data-editor-theme', 'default')
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
      expect(document.documentElement.style.getPropertyValue('--surface-app')).toBe('#1F1E1B')
    } finally {
      if (localStorageDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor)
      }
    }
  })
})
