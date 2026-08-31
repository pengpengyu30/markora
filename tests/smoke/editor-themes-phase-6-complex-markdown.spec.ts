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

const FIXTURE_TITLE = 'Editor Themes Phase 0'
const FIXTURE_RELATIVE_PATH = path.join('note', 'editor-themes-phase-0.md')
const APPEARANCES = ['light', 'dark'] as const
const THEME_IDS = EDITOR_THEME_IDS

const CALLOUT_FAMILY_BY_TYPE = {
  info: 'info',
  tip: 'success',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  example: 'example',
  quote: 'quote',
} as const

type Appearance = typeof APPEARANCES[number]

function cssRgb(hex: string): string {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgb(${red}, ${green}, ${blue})`
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

async function readComplexMarkdownSnapshot(page: Page) {
  return page.evaluate(() => {
    const scope = document.querySelector<HTMLElement>('[data-editor-theme-scope="true"]')
    const editor = document.querySelector<HTMLElement>('.bn-editor')
    if (!scope || !editor) throw new Error('Rich editor theme scope is missing')

    const readStyle = (element: Element | null, property: string) => (
      element ? getComputedStyle(element).getPropertyValue(property) : ''
    )
    const codeBlocks = Array.from(scope.querySelectorAll<HTMLElement>('[data-content-type="codeBlock"]'))
    const firstCodeBlock = codeBlocks[0]
    const firstMermaidViewport = scope.querySelector<HTMLElement>('.mermaid-diagram__viewport')
    const firstMermaidNode = firstMermaidViewport?.querySelector<SVGElement>('.node rect, .node circle, .node ellipse, .node polygon')
    const firstMermaidText = firstMermaidViewport?.querySelector<SVGElement>('.node .label text, .node text')
    const firstMermaidEdge = firstMermaidViewport?.querySelector<SVGElement>('.flowchart-link, .edgePath .path')
    const previousEditor = (window as Window & { __phase6EditorProbe?: HTMLElement }).__phase6EditorProbe

    return {
      theme: scope.dataset.editorTheme ?? null,
      appearance: document.documentElement.dataset.theme ?? null,
      editorIsStable: previousEditor === undefined || previousEditor === editor,
      code: {
        blockCount: codeBlocks.length,
        visibleLineNumberCount: codeBlocks.reduce((total, block) => total + Array.from(
          block.querySelectorAll<HTMLElement>('[data-code-line-number]'),
        ).filter(marker => getComputedStyle(marker).display !== 'none').length, 0),
        background: readStyle(firstCodeBlock, 'background-color'),
        tokenColors: Array.from(firstCodeBlock?.querySelectorAll<HTMLElement>('.shiki') ?? [])
          .map(token => readStyle(token, 'color'))
          .filter(Boolean),
      },
      callouts: Array.from(scope.querySelectorAll<HTMLElement>('.markora-callout')).map((callout) => ({
        type: callout.dataset.calloutType ?? '',
        background: readStyle(callout, 'background-color'),
        border: readStyle(callout, 'border-inline-start-color'),
        header: readStyle(callout.querySelector('.markora-callout__header'), 'color'),
      })),
      highlights: Array.from(scope.querySelectorAll<HTMLElement>('mark.markdown-highlight')).map((highlight) => ({
        text: highlight.textContent ?? '',
        background: readStyle(highlight, 'background-color'),
      })),
      math: Array.from(scope.querySelectorAll<HTMLElement>('.math')).map((math) => ({
        latex: math.dataset.latex ?? '',
        color: readStyle(math.querySelector('.katex'), 'color'),
      })),
      mermaid: firstMermaidViewport ? {
        background: readStyle(firstMermaidViewport, 'background-color'),
        svg: Boolean(firstMermaidViewport.querySelector('svg')),
        nodeFill: readStyle(firstMermaidNode, 'fill'),
        nodeBorder: readStyle(firstMermaidNode, 'stroke'),
        text: readStyle(firstMermaidText, 'fill'),
        edge: readStyle(firstMermaidEdge, 'stroke'),
      } : null,
    }
  })
}

test.describe('Editor theme Phase 6 complex Markdown', () => {
  test.setTimeout(120_000)

  let tempVaultDir = ''

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 })
    tempVaultDir = createFixtureVaultCopy()
    await openFixtureVault(page, tempVaultDir, { expectedReadyTitle: FIXTURE_TITLE })
    await page.getByTestId('note-list-container').getByText(FIXTURE_TITLE, { exact: true }).click()
    await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('.markora-callout')).toHaveCount(7)
    await expect(page.locator('.math')).toHaveCount(1)
    await expect(page.locator('.mermaid-diagram__viewport svg')).toBeVisible({ timeout: 10_000 })
    await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>('.bn-editor')
      if (!editor) throw new Error('Rich editor is missing')
      ;(window as Window & { __phase6EditorProbe?: HTMLElement }).__phase6EditorProbe = editor
    })
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('themes complex Markdown presentation across every family and variant without changing the note @smoke', async ({ page }) => {
    const notePath = path.join(tempVaultDir, FIXTURE_RELATIVE_PATH)
    const originalContent = fs.readFileSync(notePath, 'utf8')
    const observedSnapshots: string[] = []

    for (const appearance of APPEARANCES) {
      await setAppearance(page, appearance)

      for (const themeId of THEME_IDS) {
        await setEditorTheme(page, themeId)
        const theme = EDITOR_THEME_CATALOG.find(candidate => candidate.id === themeId)
        if (!theme) throw new Error(`Unknown editor theme ${themeId}`)
        const variant = theme.variants[appearance]

        await expect.poll(async () => {
          const mermaid = (await readComplexMarkdownSnapshot(page)).mermaid
          return mermaid ? {
            background: mermaid.background,
            svg: mermaid.svg,
            nodeFill: mermaid.nodeFill,
            nodeBorder: mermaid.nodeBorder,
            text: mermaid.text,
            edge: mermaid.edge,
          } : null
        }, { timeout: 30_000 }).toEqual({
          background: cssRgb(variant.mermaid.background),
          svg: true,
          nodeFill: cssRgb(variant.mermaid.nodeBackground),
          nodeBorder: cssRgb(variant.mermaid.nodeBorder),
          text: cssRgb(variant.mermaid.text),
          edge: cssRgb(variant.mermaid.edge),
        })

        const snapshot = await readComplexMarkdownSnapshot(page)

        expect(snapshot.theme).toBe(themeId)
        expect(snapshot.appearance).toBe(appearance)
        expect(snapshot.editorIsStable).toBe(true)
        expect(snapshot.code.blockCount).toBe(2)
        expect(snapshot.code.visibleLineNumberCount > 0).toBe(themeId === 'code')
        expect(snapshot.code.background).toBe(cssRgb(variant.compatibility.editorCodeBlockBackground))
        expect(new Set(snapshot.code.tokenColors).size).toBeGreaterThan(1)

        expect(snapshot.callouts).toHaveLength(7)
        for (const callout of snapshot.callouts) {
          const family = CALLOUT_FAMILY_BY_TYPE[callout.type as keyof typeof CALLOUT_FAMILY_BY_TYPE]
          if (!family) throw new Error(`Unknown callout type ${callout.type}`)
          const feedback = variant.feedback[family]
          expect(callout.background).toBe(cssRgb(feedback.background))
          expect(callout.border).toBe(cssRgb(feedback.border))
          expect(callout.header).toBe(cssRgb(feedback.text))
        }

        expect(snapshot.highlights).toHaveLength(5)
        expect(snapshot.highlights.every(highlight => highlight.background !== 'rgba(0, 0, 0, 0)')).toBe(true)
        expect(new Set(snapshot.highlights.slice(0, 4).map(highlight => highlight.background)).size).toBeGreaterThan(1)

        expect(snapshot.math).toEqual([{ latex: 'E=mc^2', color: cssRgb(variant.text.primary) }])
        expect(snapshot.mermaid).toEqual({
          background: cssRgb(variant.mermaid.background),
          svg: true,
          nodeFill: cssRgb(variant.mermaid.nodeBackground),
          nodeBorder: cssRgb(variant.mermaid.nodeBorder),
          text: cssRgb(variant.mermaid.text),
          edge: cssRgb(variant.mermaid.edge),
        })
        expect(page.getByTestId('unsaved-indicator')).toHaveCount(0)
        observedSnapshots.push(`${appearance}/${themeId}:${snapshot.code.background}:${snapshot.mermaid.background}`)
      }
    }

    expect(new Set(observedSnapshots).size).toBe(THEME_IDS.length * APPEARANCES.length)
    expect(fs.readFileSync(notePath, 'utf8')).toBe(originalContent)
  })
})
