import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { verifyEditorThemeFontAssets } from './verify-editor-theme-font-assets.mjs'

const validFontFaces = [
  ['Tolaria Inter', 'normal', 'inter-latin-var-abc123.woff2'],
  ['Tolaria Source Serif', 'normal', 'source-serif-latin-var-def456.woff2'],
  ['Tolaria Source Serif', 'italic', 'source-serif-latin-italic-var-ghi789.woff2'],
  ['Tolaria JetBrains Mono', 'normal', 'jetbrains-mono-latin-var-jkl012.woff2'],
  ['Tolaria JetBrains Mono', 'italic', 'jetbrains-mono-latin-italic-var-mno345.woff2'],
]

async function withFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tolaria-editor-font-assets-'))
  try {
    await mkdir(path.join(root, 'assets'))
    for (const [, , fileName] of validFontFaces) {
      await writeFile(
        path.join(root, 'assets', fileName),
        Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(2044, 1)]),
      )
    }

    const css = validFontFaces.map(([family, style, fileName]) => (
      `@font-face{font-family:"${family}";font-style:${style};font-weight:100 900;src:url(/assets/${fileName}) format("woff2")}`
    )).join('')
    await writeFile(path.join(root, 'assets', 'index.css'), css)
    return await run(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('accepts all isolated editor font faces when production URLs resolve locally', async () => {
  await withFixture(async (root) => {
    const result = await verifyEditorThemeFontAssets(root)
    assert.equal(result.facesChecked, validFontFaces.length)
    assert.deepEqual(result.families, [
      'Tolaria Inter',
      'Tolaria Source Serif',
      'Tolaria JetBrains Mono',
    ])
  })
})

test('rejects a remote or missing production font URL', async () => {
  await withFixture(async (root) => {
    await writeFile(
      path.join(root, 'assets', 'index.css'),
      '@font-face{font-family:"Tolaria Inter";font-style:normal;src:url(https://fonts.example.test/inter.woff2)}',
    )

    await assert.rejects(
      verifyEditorThemeFontAssets(root),
      /local WOFF2 asset|remote URL|missing/u,
    )
  })
})
