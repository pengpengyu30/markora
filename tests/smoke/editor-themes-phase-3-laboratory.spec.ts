import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const ARTIFACT_DIR = path.resolve('docs/editor-themes-baseline')
const THEME_IDS = ['default', 'code', 'editorial', 'canvas'] as const
const VARIANTS = ['light', 'dark'] as const
const WIDTH_MODES = ['theme', 'normal', 'wide'] as const

type LaboratoryState = {
  viewport: { name: 'desktop' | 'narrow'; width: number; height: number }
  variant: (typeof VARIANTS)[number]
  widthMode: (typeof WIDTH_MODES)[number]
  rootTheme: string | null
  previewCount: number
  pageScrollWidth: number
  previews: Array<{
    theme: (typeof THEME_IDS)[number]
    variant: string | null
    widthMode: string | null
    canvas: string
    fontFamily: string
    fontSize: string
    previewWidth: number
    editorWidth: number
    content: {
      callouts: number
      highlights: number
      tables: number
      math: number
      mermaid: number
      image: number
      mixedCjk: boolean
    }
  }>
  fonts: { inter: boolean; serif: boolean; mono: boolean }
  alerts: number
}

async function selectLaboratoryControls(
  page: import('@playwright/test').Page,
  variant: (typeof VARIANTS)[number],
  widthMode: (typeof WIDTH_MODES)[number],
): Promise<void> {
  await page.getByRole('combobox', { name: 'Appearance' }).selectOption(variant)
  await page.getByRole('combobox', { name: 'Width' }).selectOption(widthMode)
  await page.waitForTimeout(120)
}

async function readLaboratoryState(
  page: import('@playwright/test').Page,
  viewport: LaboratoryState['viewport'],
  variant: LaboratoryState['variant'],
  widthMode: LaboratoryState['widthMode'],
): Promise<LaboratoryState> {
  return page.evaluate(({ viewport, variant, widthMode }) => {
    const previews = [...document.querySelectorAll<HTMLElement>('[data-editor-theme-preview]')]
    return {
      viewport,
      variant,
      widthMode,
      rootTheme: document.documentElement.getAttribute('data-theme'),
      previewCount: previews.length,
      pageScrollWidth: document.documentElement.scrollWidth,
      previews: previews.map((preview) => {
        const editor = preview.querySelector<HTMLElement>('.bn-editor')
        const previewRect = preview.getBoundingClientRect()
        const editorRect = editor?.getBoundingClientRect()
        const editorStyle = editor ? getComputedStyle(editor) : null
        return {
          theme: preview.dataset.editorThemePreview as (typeof THEME_IDS)[number],
          variant: preview.dataset.editorThemeVariant ?? null,
          widthMode: preview.dataset.editorThemeWidth ?? null,
          canvas: getComputedStyle(preview).backgroundColor,
          fontFamily: editorStyle?.fontFamily ?? '',
          fontSize: editorStyle?.fontSize ?? '',
          previewWidth: previewRect.width,
          editorWidth: editorRect?.width ?? 0,
          content: {
            callouts: preview.querySelectorAll('.markora-callout').length,
            highlights: preview.querySelectorAll('mark.markdown-highlight').length,
            tables: preview.querySelectorAll('table').length,
            math: preview.querySelectorAll('.math').length,
            mermaid: preview.querySelectorAll('[data-testid="mermaid-diagram"]').length,
            image: preview.querySelectorAll('img[alt="Fixture image"]').length,
            mixedCjk: editor?.textContent?.includes('中文混合') ?? false,
          },
        }
      }),
      fonts: {
        inter: document.fonts.check('14px "Tolaria Inter"'),
        serif: document.fonts.check('16px "Tolaria Source Serif"'),
        mono: document.fonts.check('13px "Tolaria JetBrains Mono"'),
      },
      alerts: document.querySelectorAll('[role="alert"]').length,
    }
  }, { viewport, variant, widthMode })
}

test.describe('Editor theme Phase 3 laboratory', () => {
  test.setTimeout(120_000)

  test('renders the complete theme matrix with local fonts and responsive safety @smoke', async ({ page }) => {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true })
    const states: LaboratoryState[] = []

    for (const viewport of [
      { name: 'desktop' as const, width: 1440, height: 1000 },
      { name: 'narrow' as const, width: 390, height: 900 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/?editor-theme-lab=1')
      await expect(page.getByTestId('editor-theme-laboratory')).toBeVisible()
      await expect(page.locator('[data-editor-theme-preview]')).toHaveCount(4)

      for (const variant of VARIANTS) {
        for (const widthMode of WIDTH_MODES) {
          await selectLaboratoryControls(page, variant, widthMode)
          const state = await readLaboratoryState(page, viewport, variant, widthMode)
          states.push(state)

          expect(state.rootTheme).toBe(variant)
          expect(state.previewCount).toBe(THEME_IDS.length)
          expect(state.pageScrollWidth).toBeLessThanOrEqual(viewport.width + 1)
          expect(state.fonts).toEqual({ inter: true, serif: true, mono: true })
          expect(state.alerts).toBe(0)
          for (const preview of state.previews) {
            expect(preview.variant).toBe(variant)
            expect(preview.widthMode).toBe(widthMode)
            expect(preview.previewWidth).toBeGreaterThan(0)
            expect(preview.editorWidth).toBeGreaterThan(0)
            expect(preview.editorWidth).toBeLessThanOrEqual(preview.previewWidth)
            expect(preview.content).toEqual({
              callouts: 7,
              highlights: 5,
              tables: 1,
              math: 1,
              mermaid: 1,
              image: 1,
              mixedCjk: true,
            })
          }
        }
      }

      await selectLaboratoryControls(page, 'light', 'theme')
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `editor-themes-phase-3-laboratory-${viewport.name}-light.png`),
      })
      await selectLaboratoryControls(page, 'dark', 'theme')
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `editor-themes-phase-3-laboratory-${viewport.name}-dark.png`),
      })
    }

    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'editor-themes-phase-3-laboratory-observed.json'),
      `${JSON.stringify(states, null, 2)}\n`,
      'utf8',
    )
  })
})
