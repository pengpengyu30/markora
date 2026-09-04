import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  EDITOR_THEME_CATALOG,
  EDITOR_THEME_IDS,
  type EditorThemeId,
} from '../../src/editorThemes/editorThemeCatalog'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from './helpers'

const FIXTURE_TITLE = 'Editor Themes Phase 0'
const FIXTURE_RELATIVE_PATH = path.join('note', 'editor-themes-phase-0.md')
const THEME_IDS = EDITOR_THEME_IDS
const APPEARANCES = ['light', 'dark'] as const

type ThemeId = EditorThemeId
type Appearance = typeof APPEARANCES[number]

const EXPECTED_RICH_DIMENSIONS = Object.fromEntries(
  EDITOR_THEME_CATALOG.map((theme) => [theme.id, {
    fontSize: `${theme.shared.editor.fontSize}px`,
    lineHeight: `${theme.shared.editor.fontSize * theme.shared.editor.lineHeight}px`,
    maxWidth: `${theme.shared.editor.maxWidth}px`,
  }]),
) as Record<ThemeId, { fontSize: string; lineHeight: string; maxWidth: string }>

type RichSnapshot = {
  theme: string | null
  appearance: string | null
  editorIdentity: string
  editorText: string
  editorScrollTop: number
  selection: { anchor: number; head: number } | null
  selectedText: string
  dimensions: { fontFamily: string; fontSize: string; lineHeight: string; maxWidth: string }
  canvas: { background: string; token: string; scrollAreaBackground: string }
  content: {
    callouts: number
    highlights: number
    tables: number
    math: number
    mermaid: number
    image: number
  }
  colors: {
    heading: string
    link: string
    inlineCodeBackground: string
    calloutBackground: string
    tableHeaderBackground: string
    mermaidBackground: string
  }
  shell: {
    appSurface: string
    projectTreeSurface: string
    sidebarSurface: string
    noteListSurface: string
    statusBarSurface: string
    breadcrumbSurface: string
    toolbarSurface: string
    primary: string
  }
}

async function setEditorTheme(page: Page, theme: ThemeId): Promise<void> {
  await page.evaluate((editorTheme) => {
    document.documentElement.setAttribute('data-editor-theme', editorTheme)
  }, theme)
  await expect.poll(() => page.locator('[data-editor-theme-scope="true"]').getAttribute('data-editor-theme')).toBe(theme)
}

async function setAppearance(page: Page, appearance: Appearance): Promise<void> {
  const current = await page.locator('html').getAttribute('data-theme')
  if (current === appearance) return
  await page.getByTestId('status-theme-mode').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', appearance)
}

async function selectFixtureNote(page: Page): Promise<void> {
  await page.getByTestId('note-list-container').getByText(FIXTURE_TITLE, { exact: true }).click()
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 10_000 })
}

async function readRichSnapshot(page: Page): Promise<RichSnapshot> {
  return page.evaluate(() => {
    const scope = document.querySelector<HTMLElement>('[data-editor-theme-scope="true"]')
    const editor = document.querySelector<HTMLElement>('.bn-editor')
    const scrollArea = document.querySelector<HTMLElement>('.editor-scroll-area')
    const app = document.querySelector<HTMLElement>('.app')
    const sidebar = document.querySelector<HTMLElement>('.app__sidebar')
    const projectTree = document.querySelector<HTMLElement>('[data-testid^="folder-row:"]')
    const noteList = document.querySelector<HTMLElement>('.app__note-list')
    const statusBar = document.querySelector<HTMLElement>('[data-testid="status-bar"]')
    const breadcrumb = document.querySelector<HTMLElement>('.breadcrumb-bar')
    const toolbar = document.querySelector<HTMLElement>('.breadcrumb-bar__actions')
    if (!scope || !editor || !scrollArea || !app || !sidebar || !projectTree || !noteList || !statusBar || !breadcrumb || !toolbar) {
      throw new Error('Rich editor snapshot target is missing')
    }

    const style = getComputedStyle(editor)
    const scopeStyle = getComputedStyle(scope)
    const readToken = (element: Element, name: string) => getComputedStyle(element).getPropertyValue(name).trim()
    const selection = window.getSelection()
    const editorTextSource = editor.cloneNode(true) as HTMLElement
    editorTextSource.querySelectorAll('style, .mermaid-diagram').forEach(derivedElement => derivedElement.remove())
    return {
      theme: scope.dataset.editorTheme ?? null,
      appearance: document.documentElement.getAttribute('data-theme'),
      editorIdentity: editor.dataset.phase4EditorIdentity ?? '',
      editorText: editorTextSource.textContent ?? '',
      editorScrollTop: scrollArea.scrollTop,
      selection: selection && selection.rangeCount > 0 ? {
        anchor: selection.anchorOffset,
        head: selection.focusOffset,
      } : null,
      selectedText: selection?.toString() ?? '',
      dimensions: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        maxWidth: style.maxWidth,
      },
      canvas: {
        background: scopeStyle.backgroundColor,
        token: readToken(scope, '--editor-theme-surfaces-canvas'),
        scrollAreaBackground: getComputedStyle(scrollArea).backgroundColor,
      },
      content: {
        callouts: scope.querySelectorAll('.markora-callout').length,
        highlights: scope.querySelectorAll('mark.markdown-highlight').length,
        tables: scope.querySelectorAll('table').length,
        math: scope.querySelectorAll('.math').length,
        mermaid: scope.querySelectorAll('[data-testid="mermaid-diagram"]').length,
        image: scope.querySelectorAll('img[alt="Fixture image"]').length,
      },
      colors: {
        heading: readToken(scope.querySelector('h1') ?? scope, 'color'),
        link: readToken(scope.querySelector('a') ?? scope, 'color'),
        inlineCodeBackground: readToken(scope.querySelector('code') ?? scope, 'background-color'),
        calloutBackground: readToken(scope.querySelector('.markora-callout') ?? scope, 'background-color'),
        tableHeaderBackground: readToken(scope.querySelector('th') ?? scope, 'background-color'),
        mermaidBackground: readToken(scope.querySelector('.mermaid-diagram__viewport') ?? scope, 'background-color'),
      },
      shell: {
        appSurface: readToken(app, '--surface-app'),
        projectTreeSurface: readToken(projectTree, '--surface-sidebar'),
        sidebarSurface: readToken(sidebar, '--surface-sidebar'),
        noteListSurface: readToken(noteList, '--surface-card'),
        statusBarSurface: readToken(statusBar, '--sidebar'),
        breadcrumbSurface: readToken(breadcrumb, '--background'),
        toolbarSurface: readToken(toolbar, '--surface-app'),
        primary: readToken(app, '--primary'),
      },
    }
  })
}

async function readEditorThemeToken(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((element) => (
    getComputedStyle(element).getPropertyValue('--editor-theme-surfaces-canvas').trim()
  ))
}

async function readResponsiveSnapshot(page: Page) {
  return page.evaluate(() => {
    const wrapper = document.querySelector<HTMLElement>('.editor-content-wrapper')
    const editor = document.querySelector<HTMLElement>('.bn-editor')
    const scrollArea = document.querySelector<HTMLElement>('.editor-scroll-area')
    const image = document.querySelector<HTMLImageElement>('.bn-editor img[alt="Fixture image"]')
    if (!wrapper || !editor || !scrollArea) throw new Error('Rich responsive layout target is missing')

    const wrapperStyle = getComputedStyle(wrapper)
    const editorStyle = getComputedStyle(editor)
    const wrapperRect = wrapper.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()
    const scrollAreaRect = scrollArea.getBoundingClientRect()
    const imageRect = image?.getBoundingClientRect()

    return {
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      wrapperPaddingLeft: Number.parseFloat(wrapperStyle.paddingLeft),
      wrapperPaddingRight: Number.parseFloat(wrapperStyle.paddingRight),
      wrapperRect: { left: wrapperRect.left, right: wrapperRect.right },
      editorPaddingLeft: Number.parseFloat(editorStyle.paddingLeft),
      editorPaddingRight: Number.parseFloat(editorStyle.paddingRight),
      editorRect: { left: editorRect.left, right: editorRect.right },
      scrollAreaRect: { left: scrollAreaRect.left, right: scrollAreaRect.right },
      imageRect: imageRect ? { right: imageRect.right } : null,
    }
  })
}

async function installEditorProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>('.bn-editor')
    if (!editor) throw new Error('Rich editor is missing')
    editor.dataset.phase4EditorIdentity = 'rich-editor-instance'
  })
}

test.describe('Editor theme Phase 4 Rich editor', () => {
  test.setTimeout(120_000)

  let tempVaultDir = ''

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 820 })
    tempVaultDir = createFixtureVaultCopy()
    await openFixtureVault(page, tempVaultDir, { expectedReadyTitle: FIXTURE_TITLE })
    await selectFixtureNote(page)
    await installEditorProbe(page)
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('applies every family and appearance to Rich content while preserving editor state @smoke', async ({ page }) => {
    const notePath = path.join(tempVaultDir, FIXTURE_RELATIVE_PATH)
    const originalContent = fs.readFileSync(notePath, 'utf8')
    const saveRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/vault/save')) saveRequests.push(request.url())
    })

    for (const appearance of APPEARANCES) {
      await setAppearance(page, appearance)

      for (const theme of THEME_IDS) {
        await setEditorTheme(page, theme)
        const snapshot = await readRichSnapshot(page)
        const expected = EXPECTED_RICH_DIMENSIONS[theme]

        expect(snapshot.theme).toBe(theme)
        expect(snapshot.appearance).toBe(appearance)
        expect(snapshot.dimensions.fontSize).toBe(expected.fontSize)
        expect(snapshot.dimensions.lineHeight).toBe(expected.lineHeight)
        expect(snapshot.dimensions.maxWidth).toBe(expected.maxWidth)
        expect(snapshot.canvas.background).not.toBe('rgba(0, 0, 0, 0)')
        expect(snapshot.canvas.token).not.toBe('')
        expect(snapshot.canvas.scrollAreaBackground).toBe(snapshot.canvas.background)
        expect(snapshot.content).toEqual({
          callouts: 7,
          highlights: 5,
          tables: 1,
          math: 1,
          mermaid: 1,
          image: 1,
        })
        expect(snapshot.colors.heading).not.toBe('')
        expect(snapshot.colors.link).not.toBe('')
        expect(snapshot.colors.inlineCodeBackground).not.toBe('')
        expect(snapshot.colors.calloutBackground).not.toBe('')
        expect(snapshot.colors.tableHeaderBackground).not.toBe('')
        expect(snapshot.colors.mermaidBackground).not.toBe('')
        const themeDefinition = EDITOR_THEME_CATALOG.find((candidate) => candidate.id === theme)
        if (!themeDefinition) throw new Error(`Theme definition is missing: ${theme}`)
        const expectedVariant = themeDefinition.variants[appearance]
        expect(snapshot.shell).toEqual({
          appSurface: expectedVariant.surfaces.canvas,
          projectTreeSurface: expectedVariant.surfaces.code,
          sidebarSurface: expectedVariant.surfaces.code,
          noteListSurface: expectedVariant.surfaces.quote,
          statusBarSurface: expectedVariant.surfaces.code,
          breadcrumbSurface: expectedVariant.surfaces.canvas,
          toolbarSurface: expectedVariant.surfaces.canvas,
          primary: expectedVariant.accents.primary,
        })
      }
    }

    await setAppearance(page, 'light')
    await setEditorTheme(page, 'default')
    const editor = page.locator('.bn-editor')
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' unsaved-phase-4-edit')
    await expect(page.getByTestId('unsaved-indicator')).toBeVisible({ timeout: 5_000 })

    await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>('.bn-editor')
      const scrollArea = document.querySelector<HTMLElement>('.editor-scroll-area')
      if (!editor || !scrollArea) throw new Error('Rich editor state target is missing')
      editor.focus()
      scrollArea.scrollTop = Math.min(160, Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight))
      ;(window as Window & { __phase4EditorProbe?: HTMLElement }).__phase4EditorProbe = editor
    })
    await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>('.bn-editor')
      if (!editor) throw new Error('Rich editor is missing')
      const marker = 'unsaved-phase-4-edit'
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node) {
        const text = node.textContent ?? ''
        const start = text.indexOf(marker)
        if (start >= 0) {
          const range = document.createRange()
          range.setStart(node, start)
          range.setEnd(node, start + marker.length)
          const selection = window.getSelection()
          selection?.removeAllRanges()
          selection?.addRange(range)
          document.dispatchEvent(new Event('selectionchange'))
          return
        }
        node = walker.nextNode()
      }
      throw new Error('Rich editor edit marker was not found')
    })
    const beforeSwitch = await readRichSnapshot(page)
    expect(beforeSwitch.editorScrollTop).toBeGreaterThan(0)
    expect(beforeSwitch.selectedText).toBe('unsaved-phase-4-edit')
    const beforeSaveRequestCount = saveRequests.length

    await setEditorTheme(page, 'editorial')
    const afterSwitch = await readRichSnapshot(page)

    expect(afterSwitch.editorIdentity).toBe('rich-editor-instance')
    expect(afterSwitch.editorText).toContain('unsaved-phase-4-edit')
    expect(afterSwitch.editorText).toBe(beforeSwitch.editorText)
    expect(afterSwitch.editorScrollTop).toBe(beforeSwitch.editorScrollTop)
    expect(afterSwitch.selection).toEqual(beforeSwitch.selection)
    expect(afterSwitch.selectedText).toBe(beforeSwitch.selectedText)
    await expect(page.getByTestId('unsaved-indicator')).toBeVisible()
    expect(saveRequests).toHaveLength(beforeSaveRequestCount)
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)
    expect(await page.evaluate(() => {
      const current = document.querySelector<HTMLElement>('.bn-editor')
      const previous = (window as Window & { __phase4EditorProbe?: HTMLElement }).__phase4EditorProbe
      return current === previous
    })).toBe(true)

    const historyModifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${historyModifier}+z`)
    const afterUndo = await readRichSnapshot(page)
    expect(afterUndo.editorText).not.toContain('unsaved-phase-4-edit')
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)

    await page.keyboard.press(`${historyModifier}+Shift+z`)
    const afterRedo = await readRichSnapshot(page)
    expect(afterRedo.editorText).toBe(beforeSwitch.editorText)
    expect(afterRedo.editorText).toContain('unsaved-phase-4-edit')
    await expect(page.getByTestId('unsaved-indicator')).toBeVisible()
    expect(saveRequests).toHaveLength(beforeSaveRequestCount)
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)
  })

  test('projects the selected theme into shell surfaces without leaking raw editor tokens @smoke', async ({ page }) => {
    await setEditorTheme(page, 'canvas')

    const shell = await readRichSnapshot(page)
    const expectedCanvas = EDITOR_THEME_CATALOG.find((theme) => theme.id === 'canvas')?.variants.light
    if (!expectedCanvas) throw new Error('Canvas theme definition is missing')
    expect(shell.shell).toEqual({
      appSurface: expectedCanvas.surfaces.canvas,
      projectTreeSurface: expectedCanvas.surfaces.code,
      sidebarSurface: expectedCanvas.surfaces.code,
      noteListSurface: expectedCanvas.surfaces.quote,
      statusBarSurface: expectedCanvas.surfaces.code,
      breadcrumbSurface: expectedCanvas.surfaces.canvas,
      toolbarSurface: expectedCanvas.surfaces.canvas,
      primary: expectedCanvas.accents.primary,
    })
    expect(await readEditorThemeToken(page, '[data-testid^="folder-row:"]')).toBe('')
    expect(await readEditorThemeToken(page, '.breadcrumb-bar__actions')).toBe('')

    await page.locator('.bn-editor').click()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+F' : 'Control+F')
    const findBar = page.getByTestId('rich-editor-find-bar')
    await expect(findBar).toBeVisible()
    expect(await readEditorThemeToken(page, '[data-testid="rich-editor-find-bar"]')).toBe('')
    await page.keyboard.press('Escape')
    await expect(findBar).toHaveCount(0)

    await openCommandPalette(page)
    const commandPalette = page.locator('[data-command-palette="true"]')
    expect(await readEditorThemeToken(page, '[data-command-palette="true"]')).toBe('')
    expect(await readEditorThemeToken(page, '[data-command-palette="true"] > div')).toBe('')
    await executeCommand(page, 'Settings')

    const settingsPanel = page.getByTestId('settings-panel')
    await expect(settingsPanel).toBeVisible()
    expect(await readEditorThemeToken(page, '[data-testid="settings-panel"]')).toBe('')
    expect(await readEditorThemeToken(page, '[data-testid="settings-panel"] > div')).toBe('')
    await page.keyboard.press('Escape')
    await expect(settingsPanel).toHaveCount(0)
    await expect(commandPalette).toHaveCount(0)
  })

  test('keeps Rich content inside the viewport at narrow and Wide widths @smoke', async ({ page }) => {
    await setEditorTheme(page, 'canvas')
    await page.setViewportSize({ width: 390, height: 900 })

    const narrow = await readResponsiveSnapshot(page)
    expect(narrow.pageScrollWidth).toBeLessThanOrEqual(narrow.viewportWidth + 1)
    expect(narrow.wrapperPaddingLeft).toBeGreaterThanOrEqual(16)
    expect(narrow.wrapperPaddingRight).toBeGreaterThanOrEqual(16)
    expect(narrow.wrapperPaddingLeft).toBeLessThanOrEqual(24)
    expect(narrow.wrapperPaddingRight).toBeLessThanOrEqual(24)
    expect(narrow.editorPaddingLeft).toBe(0)
    expect(narrow.editorPaddingRight).toBe(0)
    expect(narrow.editorRect.left).toBeGreaterThanOrEqual(narrow.scrollAreaRect.left - 1)
    expect(narrow.editorRect.right).toBeLessThanOrEqual(narrow.scrollAreaRect.right + 1)
    if (narrow.imageRect) {
      expect(narrow.imageRect.right).toBeLessThanOrEqual(narrow.scrollAreaRect.right + 1)
    }

    const wideButton = page.getByRole('button', { name: 'Switch to wide note width' })
    await expect(wideButton).toBeVisible({ timeout: 5_000 })
    await wideButton.click()
    await expect(page.locator('.editor-content-width--wide')).toBeVisible({ timeout: 5_000 })

    const wide = await readResponsiveSnapshot(page)
    expect(wide.pageScrollWidth).toBeLessThanOrEqual(wide.viewportWidth + 1)
    expect(wide.wrapperPaddingLeft).toBeGreaterThanOrEqual(16)
    expect(wide.wrapperPaddingRight).toBeGreaterThanOrEqual(16)
    expect(wide.editorPaddingLeft).toBe(0)
    expect(wide.editorPaddingRight).toBe(0)
    expect(wide.editorRect.left).toBeGreaterThanOrEqual(wide.scrollAreaRect.left - 1)
    expect(wide.editorRect.right).toBeLessThanOrEqual(wide.scrollAreaRect.right + 1)
    if (wide.imageRect) {
      expect(wide.imageRect.right).toBeLessThanOrEqual(wide.scrollAreaRect.right + 1)
    }
  })
})
