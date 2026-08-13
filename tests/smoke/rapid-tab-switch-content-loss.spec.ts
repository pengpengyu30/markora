import fs from 'fs'
import path from 'path'
import { test, expect, type Page } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVaultDesktopHarness,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'

let tempVaultDir: string

async function openNote(page: Page, title: string): Promise<void> {
  await page.getByTestId('note-list-container').getByText(title, { exact: true }).click()
  await expect(page.getByTestId('breadcrumb-filename-trigger')).toBeVisible({ timeout: 5_000 })
}

async function openRawMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open the raw editor' }).click()
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 5_000 })
}

async function setRawEditorContent(page: Page, content: string): Promise<void> {
  await page.evaluate((nextContent) => {
    const element = document.querySelector('.cm-content') as (Element & {
      cmTile?: { view?: { state: { doc: { length: number } }; dispatch: (transaction: unknown) => void } }
    }) | null
    const view = element?.cmTile?.view
    if (!view) throw new Error('CodeMirror view is missing')
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextContent },
    })
  }, content)
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000)
  tempVaultDir = createFixtureVaultCopy()
  await openFixtureVaultDesktopHarness(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

for (const delayMs of [200, 700, 1_400, 2_900]) {
  test(`typing survives a tab switch after ${delayMs}ms @smoke`, async ({ page }) => {
    const notePath = path.join(tempVaultDir, 'note', 'note-b.md')
    const appendedText = `Rapid switch draft ${delayMs} ${Date.now()}`

    await openNote(page, 'Note B')
    await openRawMode(page)
    const currentContent = await page.locator('.cm-content').textContent()
    await setRawEditorContent(page, `${currentContent ?? ''}\n\n${appendedText}`)
    await page.waitForTimeout(delayMs)

    await openNote(page, 'Alpha Project')
    await expect(page.getByTestId('breadcrumb-filename-trigger')).toContainText('alpha-project', { timeout: 5_000 })
    expect(fs.readFileSync(notePath, 'utf8')).toContain(appendedText)

    await openNote(page, 'Note B')
    await expect.poll(() => page.locator('.cm-content').textContent()).toContain(appendedText)
  })
}
