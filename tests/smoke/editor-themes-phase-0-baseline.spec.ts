import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from './helpers'

const BASELINE_ARTIFACT_DIR = path.resolve('docs/editor-themes-baseline')
const FIXTURE_TITLE = 'Editor Themes Phase 0'
const FIXTURE_RELATIVE_PATH = path.join('note', 'editor-themes-phase-0.md')

type BaselineSnapshot = {
  mode: 'rich' | 'raw'
  appearance: 'light' | 'dark'
  app: {
    dataTheme: string | null
    surfaceEditor: string
    textPrimary: string
    accentBlue: string
    borderPrimary: string
    textMuted: string
  }
  editor: {
    fontFamily: string
    fontSize: string
    lineHeight: string
    maxWidth: string
    width: number
    paddingTop: string
    paddingRight: string
    paddingBottom: string
    paddingLeft: string
  }
  raw?: {
    fontFamily: string
    fontSize: string
    lineHeight: string
    contentPadding: string
    gutterBackground: string
    gutterColor: string
    gutterBorderRight: string
    gutterPaddingTop: string
    gutterPaddingLeft: string
    lineNumberPaddingRight: string
    lineNumberMinWidth: string
    lineNumberCount: number
  }
  codeBlock?: {
    count: number
    background: string
    border: string
    text: string
    width: number
    height: number
    codePaddingLeft: string
    lineNumberValues: string[]
    lineNumberAriaHidden: Array<string | null>
    lineNumberEditable: Array<string | null>
  }
  content?: {
    calloutFamilies: string[]
    highlightCount: number
    mathCount: number
    mermaidCount: number
    imageCount: number
  }
}

function readRootColorVariables(page: Page) {
  return page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement)
    const read = (name: string) => rootStyle.getPropertyValue(name).trim()
    return {
      dataTheme: document.documentElement.getAttribute('data-theme'),
      surfaceEditor: read('--surface-editor'),
      textPrimary: read('--text-primary'),
      accentBlue: read('--accent-blue'),
      borderPrimary: read('--border-primary'),
      textMuted: read('--text-muted'),
    }
  })
}

async function readRichBaseline(page: Page, appearance: 'light' | 'dark'): Promise<BaselineSnapshot> {
  const app = await readRootColorVariables(page)
  return page.locator('.editor__blocknote-container').evaluate((container, payload) => {
    const editor = container.querySelector<HTMLElement>('.bn-editor')
    if (!editor) throw new Error('Rich editor was not rendered')

    const style = getComputedStyle(editor)
    const codeBlocks = Array.from(
      container.querySelectorAll<HTMLElement>('[data-content-type="codeBlock"]'),
    )
    const firstCodeBlock = codeBlocks[0]
    const codeStyle = firstCodeBlock ? getComputedStyle(firstCodeBlock) : null
    const code = firstCodeBlock?.querySelector<HTMLElement>('pre code')

    return {
      mode: 'rich',
      appearance: payload.appearance,
      app: payload.app,
      editor: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        maxWidth: style.maxWidth,
        width: editor.getBoundingClientRect().width,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
      },
      codeBlock: {
        count: codeBlocks.length,
        background: codeStyle?.backgroundColor ?? '',
        border: codeStyle?.borderTopColor ?? '',
        text: codeStyle?.color ?? '',
        width: firstCodeBlock?.getBoundingClientRect().width ?? 0,
        height: firstCodeBlock?.getBoundingClientRect().height ?? 0,
        codePaddingLeft: code ? getComputedStyle(code).paddingLeft : '',
        lineNumberValues: Array.from(
          container.querySelectorAll<HTMLElement>('[data-code-line-number]'),
          marker => marker.dataset.codeLineNumber ?? '',
        ),
        lineNumberAriaHidden: Array.from(
          container.querySelectorAll<HTMLElement>('[data-code-line-number]'),
          marker => marker.getAttribute('aria-hidden'),
        ),
        lineNumberEditable: Array.from(
          container.querySelectorAll<HTMLElement>('[data-code-line-number]'),
          marker => marker.getAttribute('contenteditable'),
        ),
      },
      content: {
        calloutFamilies: Array.from(
          container.querySelectorAll<HTMLElement>('.markora-callout'),
          callout => Array.from(callout.classList)
            .find(className => className.startsWith('markora-callout--'))
            ?.replace('markora-callout--', '') ?? '',
        ),
        highlightCount: container.querySelectorAll('mark.markdown-highlight').length,
        mathCount: container.querySelectorAll('.math').length,
        mermaidCount: container.querySelectorAll('[data-testid="mermaid-diagram"]').length,
        imageCount: container.querySelectorAll('img').length,
      },
    } satisfies BaselineSnapshot
  }, { appearance, app })
}

async function readRawBaseline(page: Page, appearance: 'light' | 'dark'): Promise<BaselineSnapshot> {
  const app = await readRootColorVariables(page)
  return page.locator('[data-testid="raw-editor-codemirror"]').evaluate((container, payload) => {
    const editor = container.querySelector<HTMLElement>('.cm-editor')
    const scroller = container.querySelector<HTMLElement>('.cm-scroller')
    const content = container.querySelector<HTMLElement>('.cm-content')
    const gutters = container.querySelector<HTMLElement>('.cm-gutters')
    const lineNumber = container.querySelector<HTMLElement>('.cm-lineNumbers .cm-gutterElement')
    if (!editor || !scroller || !content || !gutters || !lineNumber) {
      throw new Error('Raw editor was not rendered')
    }

    const editorStyle = getComputedStyle(editor)
    const scrollerStyle = getComputedStyle(scroller)
    const contentStyle = getComputedStyle(content)
    const gutterStyle = getComputedStyle(gutters)
    const lineNumberStyle = getComputedStyle(lineNumber)

    return {
      mode: 'raw',
      appearance: payload.appearance,
      app: payload.app,
      editor: {
        fontFamily: editorStyle.fontFamily,
        fontSize: editorStyle.fontSize,
        lineHeight: scrollerStyle.lineHeight,
        maxWidth: '',
        width: editor.getBoundingClientRect().width,
        paddingTop: contentStyle.paddingTop,
        paddingRight: contentStyle.paddingRight,
        paddingBottom: contentStyle.paddingBottom,
        paddingLeft: contentStyle.paddingLeft,
      },
      raw: {
        fontFamily: scrollerStyle.fontFamily,
        fontSize: editorStyle.fontSize,
        lineHeight: scrollerStyle.lineHeight,
        contentPadding: contentStyle.padding,
        gutterBackground: gutterStyle.backgroundColor,
        gutterColor: gutterStyle.color,
        gutterBorderRight: gutterStyle.borderRight,
        gutterPaddingTop: gutterStyle.paddingTop,
        gutterPaddingLeft: gutterStyle.paddingLeft,
        lineNumberPaddingRight: lineNumberStyle.paddingRight,
        lineNumberMinWidth: lineNumberStyle.minWidth,
        lineNumberCount: container.querySelectorAll('.cm-lineNumbers .cm-gutterElement').length,
      },
    } satisfies BaselineSnapshot
  }, { appearance, app })
}

async function readRawContent(page: Page): Promise<string> {
  return page.locator('[data-testid="raw-editor-codemirror"]').evaluate((container) => {
    const host = container as HTMLElement & {
      __cmView?: { state: { doc: { toString(): string } } }
    }
    return host.__cmView?.state.doc.toString() ?? container.textContent ?? ''
  })
}

async function switchAppearance(page: Page, expected: 'light' | 'dark'): Promise<void> {
  const current = await page.locator('html').getAttribute('data-theme')
  if (current === expected) return
  await page.getByTestId('status-theme-mode').click()
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe(expected)
}

async function switchRawMode(page: Page): Promise<void> {
  await openCommandPalette(page)
  await executeCommand(page, 'Toggle Raw')
  await expect(page.getByTestId('raw-editor-codemirror')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 })
}

test.describe('Editor theme Phase 0 baseline', () => {
  test.setTimeout(90_000)

  let tempVaultDir = ''

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    tempVaultDir = createFixtureVaultCopy()
    await openFixtureVault(page, tempVaultDir, { expectedReadyTitle: FIXTURE_TITLE })
    await page.getByTestId('note-list-container').getByText(FIXTURE_TITLE, { exact: true }).click()
    await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 10_000 })
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('renders the representative fixture in Rich and Raw modes in both appearance variants @smoke', async ({ page }) => {
    fs.mkdirSync(BASELINE_ARTIFACT_DIR, { recursive: true })
    const notePath = path.join(tempVaultDir, FIXTURE_RELATIVE_PATH)
    const originalContent = fs.readFileSync(notePath, 'utf8')
    const richEditor = page.locator('.bn-editor')

    await expect(richEditor).toContainText('Editor Themes Phase 0')
    await expect(page.locator('.markora-callout')).toHaveCount(7)
    await expect(page.locator('mark.markdown-highlight')).toHaveCount(5)
    await expect(page.locator('.math')).toHaveCount(1)
    await expect(page.getByTestId('mermaid-diagram')).toHaveCount(1)
    await expect(richEditor.locator('img[alt="Fixture image"]')).toHaveCount(1)

    const richLight = await readRichBaseline(page, 'light')
    expect(richLight.app.dataTheme).toBe('light')
    expect(richLight.editor.fontSize).toBe('15px')
    expect(richLight.editor.maxWidth).toBe('820px')
    expect(richLight.editor.width).toBeGreaterThan(0)
    expect(richLight.codeBlock?.count).toBe(2)
    expect(richLight.codeBlock?.lineNumberValues[0]).toBe('1')
    expect(richLight.codeBlock?.lineNumberAriaHidden.every(value => value === 'true')).toBe(true)
    expect(richLight.codeBlock?.lineNumberEditable.every(value => value === 'false')).toBe(true)
    await page.screenshot({ path: path.join(BASELINE_ARTIFACT_DIR, 'editor-themes-phase-0-rich-light.png') })

    await switchAppearance(page, 'dark')
    const richDark = await readRichBaseline(page, 'dark')
    expect(richDark.app.dataTheme).toBe('dark')
    expect(richDark.editor.fontSize).toBe(richLight.editor.fontSize)
    expect(richDark.editor.maxWidth).toBe(richLight.editor.maxWidth)
    await page.screenshot({ path: path.join(BASELINE_ARTIFACT_DIR, 'editor-themes-phase-0-rich-dark.png') })

    await switchRawMode(page)
    const rawDark = await readRawBaseline(page, 'dark')
    const rawContent = await readRawContent(page)
    expect(rawContent).toContain('# Editor Themes Phase 0')
    expect(rawContent).toContain('> [!danger]')
    expect(rawContent).toContain('```mermaid')
    expect(rawDark.app.dataTheme).toBe('dark')
    expect(rawDark.raw?.lineNumberCount).toBeGreaterThan(0)
    expect(rawDark.raw?.gutterPaddingTop).toBe('0px')
    await page.screenshot({ path: path.join(BASELINE_ARTIFACT_DIR, 'editor-themes-phase-0-raw-dark.png') })

    await switchAppearance(page, 'light')
    const rawLight = await readRawBaseline(page, 'light')
    expect(rawLight.app.dataTheme).toBe('light')
    expect(rawLight.raw?.lineNumberCount).toBe(rawDark.raw?.lineNumberCount)
    await page.screenshot({ path: path.join(BASELINE_ARTIFACT_DIR, 'editor-themes-phase-0-raw-light.png') })

    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)
    fs.writeFileSync(
      path.join(BASELINE_ARTIFACT_DIR, 'editor-themes-phase-0-observed.json'),
      `${JSON.stringify({ richLight, richDark, rawLight, rawDark }, null, 2)}\n`,
      'utf8',
    )
  })
})
