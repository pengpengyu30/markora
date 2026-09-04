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
const APPEARANCES = ['light', 'dark'] as const
const THEME_IDS = EDITOR_THEME_IDS
const STATUS_DOT_SELECTOR = '[data-testid="unsaved-indicator"], [data-testid="pending-save-indicator"]'

type Appearance = typeof APPEARANCES[number]

type RawSnapshot = {
  theme: string | null
  appearance: string | null
  document: string
  selection: { from: number; to: number } | null
  scrollTop: number
  editor: {
    fontFamily: string
    fontSize: string
    lineHeight: string
    backgroundColor: string
    color: string
  }
  content: {
    padding: string
    caretColor: string
  }
  gutters: {
    backgroundColor: string
    color: string
    borderRightColor: string
  }
  activeLine: string
  selectionBackground: string
  frontmatter: {
    key: string
    value: string
  }
  lineNumberCount: number
  viewIsStable: boolean
}

function cssRgb(hex: string): string {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgb(${red}, ${green}, ${blue})`
}

function firstFontFamily(fontFamily: string): string {
  return fontFamily.split(',')[0]?.trim().replace(/^['"]|['"]$/gu, '') ?? fontFamily
}

async function setAppearance(page: Page, appearance: Appearance): Promise<void> {
  const current = await page.locator('html').getAttribute('data-theme')
  if (current === appearance) return
  await page.getByTestId('status-theme-mode').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', appearance)
}

async function setEditorTheme(page: Page, theme: EditorThemeId): Promise<void> {
  await page.evaluate((editorTheme) => {
    document.documentElement.setAttribute('data-editor-theme', editorTheme)
  }, theme)
  await expect(page.locator('[data-editor-theme-scope="true"]')).toHaveAttribute('data-editor-theme', theme)
}

async function openRawMode(page: Page): Promise<void> {
  await openCommandPalette(page)
  await executeCommand(page, 'Toggle Raw')
  await expect(page.getByTestId('raw-editor-codemirror')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 })
}

async function readRawSnapshot(page: Page): Promise<RawSnapshot> {
  return page.evaluate(() => {
    const host = document.querySelector<HTMLElement & {
      __cmView?: {
        state: {
          doc: { toString(): string }
          selection: { main: { from: number; to: number } }
        }
      }
    }>('[data-testid="raw-editor-codemirror"]')
    const scope = document.querySelector<HTMLElement>('[data-editor-theme-scope="true"]')
    const editor = host?.querySelector<HTMLElement>('.cm-editor')
    const content = host?.querySelector<HTMLElement>('.cm-content')
    const scroller = host?.querySelector<HTMLElement>('.cm-scroller')
    const gutters = host?.querySelector<HTMLElement>('.cm-gutters')
    const activeLine = host?.querySelector<HTMLElement>('.cm-activeLine')
    const selectionBackground = host?.querySelector<HTMLElement>('.cm-selectionBackground')
    const frontmatterKey = host?.querySelector<HTMLElement>('.cm-frontmatter-key')
    const frontmatterValue = host?.querySelector<HTMLElement>('.cm-frontmatter-value')
    const view = host?.__cmView
    if (!host || !scope || !editor || !content || !scroller || !gutters || !view) {
      throw new Error('Raw editor snapshot target is missing')
    }

    const selection = view.state.selection.main
    const previousView = (window as Window & { __phase5RawViewProbe?: unknown }).__phase5RawViewProbe
    return {
      theme: scope.dataset.editorTheme ?? null,
      appearance: document.documentElement.getAttribute('data-theme'),
      document: view.state.doc.toString(),
      selection: { from: selection.from, to: selection.to },
      scrollTop: scroller.scrollTop,
      editor: {
        fontFamily: getComputedStyle(editor).fontFamily,
        fontSize: getComputedStyle(editor).fontSize,
        lineHeight: getComputedStyle(editor).lineHeight,
        backgroundColor: getComputedStyle(editor).backgroundColor,
        color: getComputedStyle(editor).color,
      },
      content: {
        padding: getComputedStyle(content).padding,
        caretColor: getComputedStyle(content).caretColor,
      },
      gutters: {
        backgroundColor: getComputedStyle(gutters).backgroundColor,
        color: getComputedStyle(gutters).color,
        borderRightColor: getComputedStyle(gutters).borderRightColor,
      },
      activeLine: activeLine ? getComputedStyle(activeLine).backgroundColor : '',
      selectionBackground: selectionBackground ? getComputedStyle(selectionBackground).backgroundColor : '',
      frontmatter: {
        key: frontmatterKey ? getComputedStyle(frontmatterKey).color : '',
        value: frontmatterValue ? getComputedStyle(frontmatterValue).color : '',
      },
      lineNumberCount: host.querySelectorAll('.cm-lineNumbers .cm-gutterElement').length,
      viewIsStable: previousView === undefined || previousView === view,
    }
  })
}

test.describe('Editor theme Phase 5 Raw editor', () => {
  test.setTimeout(120_000)

  let tempVaultDir = ''

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    tempVaultDir = createFixtureVaultCopy()
    await openFixtureVault(page, tempVaultDir, { expectedReadyTitle: FIXTURE_TITLE })
    await page.getByTestId('note-list-container').getByText(FIXTURE_TITLE, { exact: true }).click()
    await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 10_000 })
    await openRawMode(page)
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('reconfigures Raw in place across all themes and variants while preserving editing state @smoke', async ({ page }) => {
    const notePath = path.join(tempVaultDir, FIXTURE_RELATIVE_PATH)
    const originalContent = fs.readFileSync(notePath, 'utf8')
    const marker = 'phase-5-raw-unsaved'

    for (const appearance of APPEARANCES) {
      await setAppearance(page, appearance)
      for (const themeId of THEME_IDS) {
        await setEditorTheme(page, themeId)
        const snapshot = await readRawSnapshot(page)
        const theme = EDITOR_THEME_CATALOG.find((candidate) => candidate.id === themeId)!
        const variant = theme.variants[appearance]

        expect(snapshot.theme).toBe(themeId)
        expect(snapshot.appearance).toBe(appearance)
        expect(snapshot.viewIsStable).toBe(true)
        expect(snapshot.editor.fontFamily).toContain(firstFontFamily(theme.shared.editor.rawFontFamily))
        expect(snapshot.editor.fontSize).toBe(`${theme.shared.editor.rawFontSize}px`)
        expect(snapshot.editor.lineHeight).toBe(`${theme.shared.editor.rawFontSize * theme.shared.editor.rawLineHeight}px`)
        expect(snapshot.editor.backgroundColor).toBe(cssRgb(variant.surfaces.canvas))
        expect(snapshot.editor.color).toBe(cssRgb(variant.text.primary))
        expect(snapshot.content.padding).toContain(`${theme.shared.editor.paddingHorizontal}px`)
        expect(snapshot.content.caretColor).toBe(cssRgb(variant.colors.cursor))
        expect(snapshot.gutters.backgroundColor).toBe(cssRgb(variant.surfaces.gutter))
        expect(snapshot.gutters.color).toBe(cssRgb(variant.text.muted))
        expect(snapshot.gutters.borderRightColor).toBe(cssRgb(variant.borders.gutter))
        expect(snapshot.frontmatter.key).toBe(cssRgb(variant.syntax.keyword))
        expect(snapshot.frontmatter.value).toBe(cssRgb(variant.syntax.string))
        expect(snapshot.lineNumberCount).toBeGreaterThan(0)
      }
    }

    await page.evaluate((text) => {
      const host = document.querySelector<HTMLElement & {
        __cmView?: {
          state: { doc: { length: number }; selection: { main: { head: number } } }
          dispatch: (transaction: unknown) => void
          focus: () => void
        }
      }>('[data-testid="raw-editor-codemirror"]')
      const view = host?.__cmView
      if (!view) throw new Error('Raw editor view is not available')
      const from = view.state.doc.length
      view.dispatch({
        changes: { from, insert: `\n${text}` },
        selection: { anchor: from + 1, head: from + 1 + text.length },
      })
      view.focus()
      const scroller = host?.querySelector<HTMLElement>('.cm-scroller')
      if (!scroller) throw new Error('Raw editor scroller is not available')
      scroller.scrollTop = 72
      ;(window as Window & { __phase5RawViewProbe?: unknown }).__phase5RawViewProbe = view
    }, marker)
    await expect(page.locator(STATUS_DOT_SELECTOR).first()).toBeVisible()

    const beforeSwitch = await readRawSnapshot(page)
    expect(beforeSwitch.document).toContain(marker)
    expect(beforeSwitch.selection?.to).toBeGreaterThan(beforeSwitch.selection?.from ?? -1)
    expect(beforeSwitch.scrollTop).toBe(72)

    await setEditorTheme(page, 'editorial')
    const afterSwitch = await readRawSnapshot(page)
    expect(afterSwitch.document).toBe(beforeSwitch.document)
    expect(afterSwitch.selection).toEqual(beforeSwitch.selection)
    expect(afterSwitch.scrollTop).toBe(beforeSwitch.scrollTop)
    expect(afterSwitch.viewIsStable).toBe(true)
    await expect(page.locator(STATUS_DOT_SELECTOR).first()).toBeVisible()
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+z`)
    await expect.poll(async () => (await readRawSnapshot(page)).document).not.toContain(marker)
    await page.keyboard.press(`${modifier}+Shift+z`)
    await expect.poll(async () => (await readRawSnapshot(page)).document).toContain(marker)
    await expect(page.locator(STATUS_DOT_SELECTOR).first()).toBeVisible()
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)

    await page.screenshot({
      path: path.resolve('docs/editor-themes-baseline/editor-themes-phase-5-raw-editor-dark-canvas.png'),
    })
  })

  test('keeps Raw find controls on application-owned surfaces @smoke', async ({ page }) => {
    await setAppearance(page, 'dark')
    await setEditorTheme(page, 'canvas')
    await page.locator('.cm-content').click()
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+f' : 'Control+f')

    const findBar = page.getByTestId('raw-editor-find-bar')
    await expect(findBar).toBeVisible()
    const surfaces = await findBar.evaluate((element) => {
      const root = document.documentElement
      const rootStyle = getComputedStyle(root)
      return {
        background: getComputedStyle(element).backgroundColor,
        border: getComputedStyle(element).borderBottomColor,
        appBackground: rootStyle.getPropertyValue('--surface-editor').trim(),
        appBorder: rootStyle.getPropertyValue('--border-subtle').trim(),
      }
    })
    const canvasTheme = EDITOR_THEME_CATALOG.find((candidate) => candidate.id === 'canvas')
    if (!canvasTheme) throw new Error('Canvas theme definition is missing')
    const canvasVariant = canvasTheme.variants.dark
    expect(surfaces.background).toBe(cssRgb(canvasVariant.surfaces.canvas))
    expect(surfaces.border).toBe(cssRgb(canvasVariant.borders.subtle))
    expect(surfaces.appBackground).toBe(canvasVariant.surfaces.canvas)
    expect(surfaces.appBorder).toBe(canvasVariant.borders.subtle)
  })
})
