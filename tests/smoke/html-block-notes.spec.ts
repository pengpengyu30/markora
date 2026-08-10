import { expect, test, type Page } from '@playwright/test'
import {
  createFixtureVaultCopy,
  openFixtureVault,
  removeFixtureVaultCopy,
} from '../helpers/fixtureVault'
import { APP_COMMAND_IDS } from '../../src/hooks/appCommandCatalog'
import { triggerShortcutCommand } from './testBridge'

let tempVaultDir: string

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000)
  tempVaultDir = createFixtureVaultCopy()
  await openFixtureVault(page, tempVaultDir)
})

test.afterEach(() => {
  removeFixtureVaultCopy(tempVaultDir)
})

async function openNote(page: Page, title: string) {
  await page.locator('[data-testid="note-list-container"]').getByText(title, { exact: true }).click()
  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
}

async function openRawMode(page: Page) {
  await triggerShortcutCommand(page, APP_COMMAND_IDS.editToggleRawEditor)
  await expect(page.locator('.cm-content')).toBeVisible({ timeout: 5_000 })
}

async function getRawEditorContent(page: Page): Promise<string> {
  return page.evaluate(() => {
    type CodeMirrorHost = Element & {
      cmTile?: {
        view?: {
          state: {
            doc: {
              toString(): string
            }
          }
        }
      }
    }

    const el = document.querySelector('.cm-content')
    const view = el ? (el as CodeMirrorHost).cmTile?.view : null
    return view?.state.doc.toString() ?? el?.textContent ?? ''
  })
}

async function setRawEditorContent(page: Page, content: string): Promise<void> {
  await page.evaluate((nextContent) => {
    type CodeMirrorHost = Element & {
      cmTile?: {
        view?: {
          state: {
            doc: {
              length: number
            }
          }
          dispatch(update: {
            changes: {
              from: number
              to: number
              insert: string
            }
          }): void
        }
      }
    }

    const el = document.querySelector('.cm-content') as CodeMirrorHost | null
    const view = el?.cmTile?.view
    if (!view) {
      throw new Error('CodeMirror view is missing')
    }

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextContent },
    })
  }, content)
}

function withHtmlBlockSource(raw: string, fencedHtml: string): string {
  const emptyHtmlFence = /```html[^\n]*\n\s*```/u
  if (emptyHtmlFence.test(raw)) return raw.replace(emptyHtmlFence, fencedHtml)
  return `${raw.trimEnd()}\n\n${fencedHtml}\n`
}

test('fenced HTML remains an ordinary Markdown code block without an in-app preview', async ({ page }) => {
  await openNote(page, 'Note B')
  await openRawMode(page)

  const fencedHtml = '```html height="344"\n<button>Static button</button>\n```'
  await setRawEditorContent(page, withHtmlBlockSource(await getRawEditorContent(page), fencedHtml))
  await page.waitForTimeout(600)
  await triggerShortcutCommand(page, APP_COMMAND_IDS.editToggleRawEditor)

  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('file-preview-fallback')).toHaveCount(0)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('.bn-editor')).toContainText('<button>Static button</button>')

  await openRawMode(page)

  const raw = await getRawEditorContent(page)
  expect(raw).toContain('```html height="344"')
  expect(raw).toContain('<button>Static button</button>')
})

test('fenced HTML code never executes scripts in the editor surface', async ({ page }) => {
  await openNote(page, 'Note B')
  await openRawMode(page)

  const fencedHtml = [
    '```html height="150" scripts="sandboxed"',
    '<div id="status">loading</div>',
    '<script>document.getElementById("status").textContent = "script running"</script>',
    '```',
  ].join('\n')
  await setRawEditorContent(page, withHtmlBlockSource(await getRawEditorContent(page), fencedHtml))
  await page.waitForTimeout(600)
  await triggerShortcutCommand(page, APP_COMMAND_IDS.editToggleRawEditor)

  await expect(page.locator('.bn-editor')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('file-preview-fallback')).toHaveCount(0)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('#status')).toHaveCount(0)
  expect(await page.evaluate(() => (window as Window & { __shouldNotRun?: boolean }).__shouldNotRun)).toBeUndefined()

  await openRawMode(page)
  const raw = await getRawEditorContent(page)
  expect(raw).toContain('document.getElementById("status").textContent = "script running"')
})
