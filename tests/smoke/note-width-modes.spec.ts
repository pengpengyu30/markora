import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { EDITOR_THEME_IDS, type EditorThemeId } from '../../src/editorThemes/editorThemeCatalog'
import { createFixtureVaultCopy, openFixtureVault, removeFixtureVaultCopy } from '../helpers/fixtureVault'
import { executeCommand, openCommandPalette } from './helpers'

let tempVaultDir: string

const THEME_WIDTHS: Record<EditorThemeId, number> = {
  default: 820,
  code: 900,
  editorial: 720,
  canvas: 1040,
}

const THEME_COMMAND_LABELS: Record<EditorThemeId, string> = {
  default: 'Editor Theme: Default',
  code: 'Editor Theme: Code',
  editorial: 'Editor Theme: Editorial',
  canvas: 'Editor Theme: Canvas',
}

const APPEARANCES = ['light', 'dark'] as const

function alphaProjectPath(vaultPath: string): string {
  return path.join(vaultPath, 'project', 'alpha-project.md')
}

function plainNotePath(vaultPath: string): string {
  return path.join(vaultPath, 'plain-width-note.md')
}

async function openNote(page: Page, title: string) {
  await page.getByTestId('note-list-container').getByText(title, { exact: true }).click()
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
}

async function executePaletteCommand(page: Page, label: string) {
  await openCommandPalette(page)
  await executeCommand(page, label)
}

async function setEditorTheme(page: Page, theme: EditorThemeId) {
  await executePaletteCommand(page, THEME_COMMAND_LABELS[theme])
  await expect(page.locator('[data-editor-theme-scope="true"]')).toHaveAttribute('data-editor-theme', theme)
}

async function setAppearance(page: Page, appearance: typeof APPEARANCES[number]) {
  const current = await page.locator('html').getAttribute('data-theme')
  if (current === appearance) return

  await page.getByTestId('status-theme-mode').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', appearance)
}

async function openSettingsPanel(page: Page) {
  await executePaletteCommand(page, 'Open Settings')
  const panel = page.getByTestId('settings-panel')
  await expect(panel).toBeVisible({ timeout: 5_000 })
  return panel
}

async function setGlobalWidth(page: Page, label: 'Theme default' | 'Normal' | 'Wide') {
  const panel = await openSettingsPanel(page)
  const control = panel.getByTestId('settings-default-note-width')
  await control.click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await panel.getByTestId('settings-save').click()
  await expect(panel).toHaveCount(0)
}

async function readWidthMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.editor-content-width--normal, .editor-content-width--wide')
    const wrapper = document.querySelector<HTMLElement>('.editor-content-wrapper')
    const editor = document.querySelector<HTMLElement>('.bn-editor')
    if (!root || !wrapper || !editor) throw new Error('Editor width layout is missing')

    const wrapperStyle = getComputedStyle(wrapper)
    const editorStyle = getComputedStyle(editor)
    const wrapperRect = wrapper.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()
    const wrapperPaddingLeft = Number.parseFloat(wrapperStyle.paddingLeft)
    const wrapperPaddingRight = Number.parseFloat(wrapperStyle.paddingRight)

    return {
      mode: root.classList.contains('editor-content-width--wide') ? 'wide' : 'normal',
      wrapperMaxWidth: wrapperStyle.maxWidth,
      editorMaxWidth: editorStyle.maxWidth,
      wrapperPaddingLeft,
      wrapperPaddingRight,
      editorPaddingLeft: Number.parseFloat(editorStyle.paddingLeft),
      editorPaddingRight: Number.parseFloat(editorStyle.paddingRight),
      editorWidth: editorRect.width,
      wrapperContentWidth: wrapperRect.width - wrapperPaddingLeft - wrapperPaddingRight,
      viewportWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    }
  })
}

async function openWidthMenu(page: Page) {
  await page.getByRole('button', { name: 'More note actions' }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  return menu
}

async function selectNoteWidth(page: Page, label: 'Use theme default note width' | 'Normal' | 'Wide') {
  const menu = await openWidthMenu(page)
  await menu.getByRole('menuitemradio', { name: label, exact: true }).click()
  await expect(menu).toHaveCount(0)
}

async function expectEffectiveWidth(page: Page, label: string) {
  const menu = await openWidthMenu(page)
  await expect(menu.getByText(label, { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
}

async function expectWideModeHasUnboundedWidth(page: Page) {
  const metrics = await page.locator('.editor-content-width--wide').evaluate((root) => {
    const wrapper = root.querySelector<HTMLElement>('.editor-content-wrapper')
    const editor = root.querySelector<HTMLElement>('.bn-editor')
    if (!wrapper || !editor) throw new Error('Wide editor layout was not rendered')

    const wrapperStyle = window.getComputedStyle(wrapper)
    const editorStyle = window.getComputedStyle(editor)
    const wrapperRect = wrapper.getBoundingClientRect()
    const editorRect = editor.getBoundingClientRect()
    const wrapperPaddingLeft = Number.parseFloat(wrapperStyle.paddingLeft)
    const wrapperPaddingRight = Number.parseFloat(wrapperStyle.paddingRight)

    return {
      wrapperMaxWidth: wrapperStyle.maxWidth,
      wrapperPaddingLeft,
      wrapperPaddingRight,
      editorMaxWidth: editorStyle.maxWidth,
      editorPaddingLeft: Number.parseFloat(editorStyle.paddingLeft),
      editorPaddingRight: Number.parseFloat(editorStyle.paddingRight),
      editorWidth: editorRect.width,
      wrapperContentWidth: wrapperRect.width - wrapperPaddingLeft - wrapperPaddingRight,
    }
  })

  expect(metrics.wrapperMaxWidth).toBe('none')
  expect(metrics.wrapperPaddingLeft).toBeGreaterThanOrEqual(16)
  expect(metrics.wrapperPaddingRight).toBeGreaterThanOrEqual(16)
  expect(metrics.editorMaxWidth).toBe('none')
  expect(metrics.editorPaddingLeft).toBe(0)
  expect(metrics.editorPaddingRight).toBe(0)
  expect(metrics.editorWidth).toBeGreaterThan(900)
  expect(Math.abs(metrics.editorWidth - metrics.wrapperContentWidth)).toBeLessThan(2)
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000)
  await page.setViewportSize({ width: 1920, height: 1080 })
  tempVaultDir = createFixtureVaultCopy()
  fs.writeFileSync(plainNotePath(tempVaultDir), '# Plain Width Note\n\nNo frontmatter here.\n')
  await openFixtureVault(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

test('note width modes persist only when frontmatter already exists @smoke', async ({ page }) => {
  await openNote(page, 'Alpha Project')

  await expect(page.locator('.editor-content-width--normal')).toBeVisible({ timeout: 5_000 })
  await page.getByRole('button', { name: 'Switch to wide note width' }).click()
  await expect(page.locator('.editor-content-width--wide')).toBeVisible({ timeout: 5_000 })
  await expectWideModeHasUnboundedWidth(page)
  await expect.poll(() => fs.readFileSync(alphaProjectPath(tempVaultDir), 'utf8')).toMatch(/_width:\s+"?wide"?/)

  await executePaletteCommand(page, 'Use Normal Note Width')
  await expect(page.locator('.editor-content-width--normal')).toBeVisible({ timeout: 5_000 })
  await expect.poll(() => fs.readFileSync(alphaProjectPath(tempVaultDir), 'utf8')).toMatch(/_width:\s+"?normal"?/)

  await openNote(page, 'Plain Width Note')
  await page.getByRole('button', { name: 'Switch to wide note width' }).click()
  await expect(page.locator('.editor-content-width--wide')).toBeVisible({ timeout: 5_000 })
  expect(fs.readFileSync(plainNotePath(tempVaultDir), 'utf8')).toBe('# Plain Width Note\n\nNo frontmatter here.\n')
})

test('theme default width follows every editor theme and appearance @smoke', async ({ page }) => {
  await openNote(page, 'Alpha Project')
  const alphaPath = alphaProjectPath(tempVaultDir)
  const originalAlpha = fs.readFileSync(alphaPath, 'utf8')
  await setGlobalWidth(page, 'Theme default')

  for (const appearance of APPEARANCES) {
    await setAppearance(page, appearance)

    for (const theme of EDITOR_THEME_IDS) {
      await setEditorTheme(page, theme)
      const metrics = await readWidthMetrics(page)

      expect(metrics.mode).toBe('normal')
      expect(metrics.wrapperMaxWidth).toBe(`${THEME_WIDTHS[theme]}px`)
      expect(metrics.editorMaxWidth).toBe(`${THEME_WIDTHS[theme]}px`)
      await expectEffectiveWidth(page, `Effective width: ${THEME_WIDTHS[theme]}px (Theme default)`)
    }
  }

  expect(fs.readFileSync(alphaPath, 'utf8')).toBe(originalAlpha)
})

test('explicit global widths and the nullable command remain distinct from theme inheritance @smoke', async ({ page }) => {
  await openNote(page, 'Alpha Project')
  await setEditorTheme(page, 'code')

  await setGlobalWidth(page, 'Normal')
  let metrics = await readWidthMetrics(page)
  expect(metrics.mode).toBe('normal')
  expect(metrics.wrapperMaxWidth).toBe('820px')
  await expectEffectiveWidth(page, 'Effective width: 820px (Global default)')

  await setGlobalWidth(page, 'Wide')
  metrics = await readWidthMetrics(page)
  expect(metrics.mode).toBe('wide')
  expect(metrics.wrapperMaxWidth).toBe('none')
  expect(metrics.editorMaxWidth).toBe('none')
  await expectEffectiveWidth(page, 'Effective width: Wide (Global default)')

  await executePaletteCommand(page, 'Use Theme Default Note Width by Default')
  await expect(page.locator('.editor-content-width--normal')).toBeVisible({ timeout: 5_000 })
  metrics = await readWidthMetrics(page)
  expect(metrics.wrapperMaxWidth).toBe('900px')
  await expectEffectiveWidth(page, 'Effective width: 900px (Theme default)')

  const panel = await openSettingsPanel(page)
  await expect(panel.getByTestId('settings-default-note-width')).toHaveAttribute('data-value', 'theme')
})

test('per-note reset removes only _width and unsafe notes remain unchanged @smoke', async ({ page }) => {
  await openNote(page, 'Alpha Project')
  await setEditorTheme(page, 'code')
  const alphaPath = alphaProjectPath(tempVaultDir)
  const originalAlpha = fs.readFileSync(alphaPath, 'utf8')

  await page.getByRole('button', { name: 'Switch to wide note width' }).click()
  await expect(page.locator('.editor-content-width--wide')).toBeVisible({ timeout: 5_000 })
  await expect.poll(() => fs.readFileSync(alphaPath, 'utf8')).toMatch(/_width:\s+"?wide"?/)
  await expectEffectiveWidth(page, 'Effective width: Wide (Note override)')

  await selectNoteWidth(page, 'Use theme default note width')
  await expect.poll(() => fs.readFileSync(alphaPath, 'utf8')).toBe(originalAlpha)
  await expect(page.locator('.editor-content-width--normal')).toBeVisible({ timeout: 5_000 })
  await expectEffectiveWidth(page, 'Effective width: 900px (Theme default)')

  await openNote(page, 'Plain Width Note')
  const plainPath = plainNotePath(tempVaultDir)
  const originalPlain = fs.readFileSync(plainPath, 'utf8')
  await page.getByRole('button', { name: 'Switch to wide note width' }).click()
  await expect(page.locator('.editor-content-width--wide')).toBeVisible({ timeout: 5_000 })
  expect(fs.readFileSync(plainPath, 'utf8')).toBe(originalPlain)
})

test('inherited and wide layouts stay inside a narrow viewport @smoke', async ({ page }) => {
  await openNote(page, 'Alpha Project')
  await setEditorTheme(page, 'canvas')
  await page.setViewportSize({ width: 390, height: 900 })

  let metrics = await readWidthMetrics(page)
  expect(metrics.mode).toBe('normal')
  expect(metrics.pageScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  expect(metrics.wrapperPaddingLeft).toBeGreaterThanOrEqual(16)
  expect(metrics.wrapperPaddingRight).toBeGreaterThanOrEqual(16)
  expect(metrics.editorPaddingLeft).toBe(0)
  expect(metrics.editorPaddingRight).toBe(0)

  await page.getByRole('button', { name: 'Switch to wide note width' }).click()
  await expect(page.locator('.editor-content-width--wide')).toBeVisible({ timeout: 5_000 })
  metrics = await readWidthMetrics(page)
  expect(metrics.pageScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  expect(metrics.wrapperPaddingLeft).toBeGreaterThanOrEqual(16)
  expect(metrics.wrapperPaddingRight).toBeGreaterThanOrEqual(16)
  expect(metrics.editorPaddingLeft).toBe(0)
  expect(metrics.editorPaddingRight).toBe(0)
})
