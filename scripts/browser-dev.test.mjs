import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  browserServerArgs,
  browserProcessEnv,
  dependencyInstallArgs,
  dependencyInstallEnv,
  parseBrowserDevArgs,
  playwrightBrowserInstallCommand,
  resolveLocalPnpmBinDir,
  resolveLocalPnpmCli,
  runBrowserStartupCheck,
  tauriDevArgs,
} from './browser-dev.mjs'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')
const DIRECT_LAUNCHERS = [
  { file: 'browser-vite.local', mode: 'vite' },
  { file: 'browser-tauri.local', mode: 'tauri' },
]

test('browser development defaults to Vite mode and its fixed port', () => {
  assert.deepEqual(parseBrowserDevArgs([]), {
    host: '127.0.0.1',
    mode: 'vite',
    check: false,
    open: false,
    port: 5202,
  })
  assert.deepEqual(browserServerArgs(parseBrowserDevArgs([])), [
    'dev',
    '--host',
    '127.0.0.1',
    '--port',
    '5202',
    '--strictPort',
  ])
})

test('browser server accepts an explicit host, port, and open mode', () => {
  const options = parseBrowserDevArgs([
    '--host',
    'localhost',
    '--port',
    '5201',
    '--open',
  ])

  assert.deepEqual(options, {
    host: 'localhost',
    mode: 'vite',
    check: false,
    open: true,
    port: 5201,
  })
  assert.deepEqual(browserServerArgs(options), [
    'dev',
    '--host',
    'localhost',
    '--port',
    '5201',
    '--strictPort',
  ])
})

test('browser mode selects Vite or the full Tauri development process', () => {
  assert.deepEqual(parseBrowserDevArgs(['--mode', 'vite', '--check']), {
    host: '127.0.0.1',
    mode: 'vite',
    check: true,
    open: false,
    port: 5202,
  })
  assert.deepEqual(parseBrowserDevArgs(['--mode=tauri']), {
    host: '127.0.0.1',
    mode: 'tauri',
    check: false,
    open: false,
    port: 5202,
  })
  assert.deepEqual(tauriDevArgs(), ['tauri', 'dev'])
})

test('Tauri mode rejects settings that its fixed dev URL cannot honor', () => {
  assert.throws(
    () => parseBrowserDevArgs(['--mode', 'tauri', '--port', '5201']),
    /Tauri mode uses port 5202/,
  )
  assert.throws(
    () => parseBrowserDevArgs(['--mode', 'tauri', '--host', '0.0.0.0']),
    /Tauri mode uses the configured localhost host/,
  )
})

test('dependency preflight is frozen and non-interactive', () => {
  assert.deepEqual(dependencyInstallArgs(), [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--prefer-offline',
  ])
  assert.equal(dependencyInstallEnv({ CI: 'false', PATH: '/bin' }).CI, 'true')
})

test('dependency preflight resolves the project-local pnpm entrypoint', () => {
  assert.equal(
    resolveLocalPnpmCli(ROOT_DIR),
    path.join(ROOT_DIR, '.tools', 'pnpm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  )
  assert.equal(
    resolveLocalPnpmBinDir(ROOT_DIR),
    path.join(ROOT_DIR, '.tools', 'pnpm', 'node_modules', '.bin'),
  )
})

test('Tauri browser mode puts the project pnpm shim first in PATH', () => {
  const env = browserProcessEnv(
    { mode: 'tauri', host: '127.0.0.1', port: 5202 },
    ROOT_DIR,
    { PATH: '/usr/bin', TOLARIA_VITE_CACHE_DIR: '/tmp/browser-cache' },
  )
  assert.equal(
    env.PATH,
    `${path.join(ROOT_DIR, '.tools', 'pnpm', 'node_modules', '.bin')}${path.delimiter}/usr/bin`,
  )
  assert.equal(env.TOLARIA_VITE_CACHE_DIR, '/tmp/browser-cache')
})

test('browser startup reports the explicit Chromium installation command', () => {
  assert.equal(
    playwrightBrowserInstallCommand(),
    'pnpm exec playwright install chromium',
  )
})

test('browser startup converts a missing Chromium executable into an actionable error', async () => {
  await assert.rejects(
    () => runBrowserStartupCheck('http://127.0.0.1:5202', {
      launch: async () => {
        throw new Error("Executable doesn't exist at the Playwright cache path")
      },
    }),
    /pnpm exec playwright install chromium/,
  )
})

test('direct browser launchers are executable and select their documented mode', () => {
  for (const launcher of DIRECT_LAUNCHERS) {
    const launcherPath = path.join(ROOT_DIR, 'scripts', launcher.file)
    const source = readFileSync(launcherPath, 'utf8')
    assert.match(source, /^#!\/usr\/bin\/env bash/)
    assert.match(source, new RegExp(`--mode ${launcher.mode}`))
    assert.notEqual(statSync(launcherPath).mode & 0o111, 0)
  }
})
