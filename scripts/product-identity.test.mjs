import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const readProjectFile = (relativePath) =>
  readFile(path.join(projectRoot, relativePath), 'utf8')

test('local manifests expose the Markora product identity', async () => {
  const [tauriConfig, devConfig, packageJson, cargoToml, mainRs, indexHtml, mainTsx, menuRs, commitRs, buildScript, runScript] =
    await Promise.all([
      readProjectFile('src-tauri/tauri.conf.json').then(JSON.parse),
      readProjectFile('src-tauri/tauri.dev.conf.json').then(JSON.parse),
      readProjectFile('package.json').then(JSON.parse),
      readProjectFile('src-tauri/Cargo.toml'),
      readProjectFile('src-tauri/src/main.rs'),
      readProjectFile('index.html'),
      readProjectFile('src/main.tsx'),
      readProjectFile('src-tauri/src/menu.rs'),
      readProjectFile('src-tauri/src/git/commit.rs'),
      readProjectFile('scripts/build-macos-arm64.local'),
      readProjectFile('scripts/run-macos-arm64.local'),
    ])

  assert.equal(tauriConfig.productName, 'Markora')
  assert.equal(tauriConfig.identifier, 'io.github.pengpengyu30.markora')
  assert.equal(tauriConfig.app.windows[0].title, 'Markora')
  assert.equal(devConfig.productName, 'Markora Dev')
  assert.equal(devConfig.identifier, 'io.github.pengpengyu30.markora.dev')
  assert.equal(packageJson.name, 'markora')

  assert.match(cargoToml, /^name = "markora"$/m)
  assert.match(cargoToml, /^description = "A local Markdown notebook\. Plain files, no account, no telemetry\."$/m)
  assert.match(cargoToml, /^authors = \["pengpengyu30"\]$/m)
  assert.match(cargoToml, /^repository = "https:\/\/github\.com\/pengpengyu30\/markora"$/m)
  assert.match(cargoToml, /^name = "markora_lib"$/m)

  assert.match(mainRs, /markora_lib::run\(\)/)
  assert.match(indexHtml, /<title>Markora<\/title>/)
  assert.doesNotMatch(indexHtml, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
  assert.match(mainTsx, /@blocknote\/core\/fonts\/inter\.css/)
  assert.doesNotMatch(JSON.stringify(tauriConfig.app.security.csp), /fonts\.googleapis\.com|fonts\.gstatic\.com/)
  assert.doesNotMatch(tauriConfig.app.security.devCsp, /fonts\.googleapis\.com|fonts\.gstatic\.com/)
  assert.match(menuRs, /SubmenuBuilder::new\(app, "Markora"\)/)
  assert.match(commitRs, /user\.name=Markora/)

  assert.match(buildScript, /release\/bundle\/macos\/Markora Dev\.app/)
  assert.match(buildScript, /Contents\/MacOS\/markora/)
  assert.match(runScript, /release\/bundle\/macos\/Markora Dev\.app/)
  assert.match(buildScript, /\.markora-build\.local/)
  assert.match(runScript, /\.markora-build\.local/)
})
