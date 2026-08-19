import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import {
  createFixtureVaultCopy,
  openFixtureVaultDesktopHarness,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

const FIND_SHORTCUT = process.platform === 'darwin' ? 'Meta+F' : 'Control+F'

let tempVaultDir: string

async function getRawEditorDoc(page: Page): Promise<string> {
  return page.evaluate(() => {
    const host = document.querySelector('[data-testid="raw-editor-codemirror"]') as (HTMLElement & {
      __cmView?: { state: { doc: { toString(): string } } }
    }) | null
    if (!host?.__cmView) {
      throw new Error('Raw editor CodeMirror view is not mounted')
    }
    return host.__cmView.state.doc.toString()
  })
}

test.describe('editor find and replace', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(60_000)
    tempVaultDir = createFixtureVaultCopy()
    await openFixtureVaultDesktopHarness(page, tempVaultDir)
    await page.setViewportSize({ width: 1600, height: 900 })
  })

  test.afterEach(() => {
    removeFixtureVaultCopy(tempVaultDir)
  })

  test('Cmd+F opens current-note find and supports regex replacement @smoke', async ({ page }) => {
    await page.getByText('Note B', { exact: true }).first().click()
    await page.getByRole('button', { name: 'Open the raw editor' }).click()
    await page.getByTestId('raw-editor-codemirror').click()

    await page.keyboard.press(FIND_SHORTCUT)

    await expect(page.getByTestId('raw-editor-codemirror')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('raw-editor-find-input')).toBeFocused()

    await page.getByRole('button', { name: 'Show replace' }).click()
    await page.getByRole('button', { name: 'Use regular expression' }).click()
    const findInput = page.getByTestId('raw-editor-find-input')
    await findInput.pressSequentially('Note ([BC])')
    await expect(findInput).toBeFocused()
    await expect(findInput).toHaveValue('Note ([BC])')
    await expect(page.getByTestId('raw-editor-find-count')).toContainText('1 / 3')

    await page.getByTestId('raw-editor-replace-input').fill('Entry $1')
    await page.getByRole('button', { name: 'Replace', exact: true }).click()

    await expect.poll(() => getRawEditorDoc(page)).toContain('# Entry B')

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('raw-editor-find-bar')).toHaveCount(0)
    await expect(page.locator('.cm-content')).toBeFocused()
  })

  test('Cmd+F cycles rendered matches with Enter and keeps the active match highlighted @smoke', async ({ page }) => {
    await page.getByText('Note B', { exact: true }).first().click()
    await page.locator('.bn-editor').click()

    await page.keyboard.press(FIND_SHORTCUT)

    const findInput = page.getByTestId('rich-editor-find-input')
    await expect(findInput).toBeFocused()
    await findInput.fill('Note')
    await expect(page.getByTestId('rich-editor-find-count')).toHaveText('1 / 2')

    const activeMatchIndex = () => page.evaluate(() => {
      const matches = [...document.querySelectorAll('[class*="markora-rich-editor-find-match"]')]
      const active = document.querySelector('.markora-rich-editor-find-match-active')
      return active ? matches.indexOf(active) : -1
    })

    await expect.poll(activeMatchIndex).toBe(0)

    await findInput.press('Enter')

    await expect(page.getByTestId('rich-editor-find-count')).toHaveText('2 / 2')
    await expect(page.getByTestId('rich-editor-find-bar')).toBeVisible()
    await expect.poll(activeMatchIndex).toBe(1)

    await page.getByRole('button', { name: 'Next match' }).click()
    await expect(page.getByTestId('rich-editor-find-count')).toHaveText('1 / 2')
    await expect(page.getByTestId('rich-editor-find-bar')).toBeVisible()

    await page.locator('.bn-editor').click()
    await expect(page.getByTestId('rich-editor-find-bar')).toBeVisible()
    await findInput.focus()
    await findInput.press('Escape')
    await expect(page.getByTestId('rich-editor-find-bar')).toHaveCount(0)
  })

  test('centers the active rendered match after Enter navigates to a distant result @smoke', async ({ page }) => {
    const notePath = path.join(tempVaultDir, 'note', 'note-b.md')
    fs.appendFileSync(
      notePath,
      `\nCENTER-ME\n${Array.from({ length: 80 }, (_, index) => `Filler paragraph ${index + 1}`).join('\n')}\nCENTER-ME\n`,
      'utf-8',
    )

    await openFixtureVaultDesktopHarness(page, tempVaultDir)
    await page.getByText('Note B', { exact: true }).first().click()
    await page.locator('.bn-editor').click()
    await page.keyboard.press(FIND_SHORTCUT)

    const findInput = page.getByTestId('rich-editor-find-input')
    await findInput.fill('CENTER-ME')
    await expect(page.getByTestId('rich-editor-find-count')).toHaveText('1 / 2')

    await findInput.press('Enter')

    await expect(page.getByTestId('rich-editor-find-count')).toHaveText('2 / 2')
    await expect.poll(() => page.evaluate(() => {
      const scrollArea = document.querySelector('.editor-scroll-area')
      const findBar = document.querySelector('[data-testid="rich-editor-find-bar"]')
      if (!(scrollArea instanceof HTMLElement) || !(findBar instanceof HTMLElement)) return null

      return findBar.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top
    })).toBeGreaterThanOrEqual(-1)
    await expect.poll(() => page.evaluate(() => {
      const scrollArea = document.querySelector('.editor-scroll-area')
      const activeMatch = document.querySelector('.markora-rich-editor-find-match-active')
      if (!(scrollArea instanceof HTMLElement) || !(activeMatch instanceof HTMLElement)) return null

      const scrollAreaRect = scrollArea.getBoundingClientRect()
      const activeMatchRect = activeMatch.getBoundingClientRect()
      const scrollAreaCenter = scrollAreaRect.top + scrollAreaRect.height / 2
      const activeMatchCenter = activeMatchRect.top + activeMatchRect.height / 2
      return Math.abs(activeMatchCenter - scrollAreaCenter)
    })).toBeLessThan(80)
  })
})
