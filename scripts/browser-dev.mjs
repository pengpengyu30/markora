import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

export const REQUIRED_PNPM_VERSION = '10.33.0'
export const DEFAULT_BROWSER_HOST = '127.0.0.1'
export const DEFAULT_BROWSER_PORT = 5202
export const BROWSER_STARTUP_SELECTOR = '[data-testid="sidebar-top-nav"]'

export function playwrightBrowserInstallCommand() {
  return 'pnpm exec playwright install chromium'
}

const repoRoot = path.resolve(import.meta.dirname, '..')

export function parseBrowserDevArgs(args = []) {
  const options = {
    host: DEFAULT_BROWSER_HOST,
    mode: 'vite',
    check: false,
    open: false,
    port: DEFAULT_BROWSER_PORT,
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--check') {
      options.check = true
      continue
    }
    if (arg === '--mode') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) throw new Error('--mode requires a value')
      options.mode = parseBrowserMode(value)
      index += 1
      continue
    }
    if (arg.startsWith('--mode=')) {
      options.mode = parseBrowserMode(arg.slice('--mode='.length))
      continue
    }
    if (arg === '--vite' || arg === '--server') {
      options.mode = 'vite'
      continue
    }
    if (arg === '--tauri') {
      options.mode = 'tauri'
      continue
    }
    if (arg === '--open') {
      options.open = true
      continue
    }
    if (arg === '--host' || arg === '--port') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`)
      index += 1
      if (arg === '--host') {
        options.host = value
      } else {
        options.port = parsePort(value)
      }
      continue
    }
    if (arg.startsWith('--host=')) {
      options.host = arg.slice('--host='.length)
      continue
    }
    if (arg.startsWith('--port=')) {
      options.port = parsePort(arg.slice('--port='.length))
      continue
    }
    throw new Error(`Unknown browser-dev option: ${arg}`)
  }

  if (options.check && options.open) {
    throw new Error('--open cannot be combined with --check')
  }
  if (options.mode === 'tauri' && options.port !== DEFAULT_BROWSER_PORT) {
    throw new Error(`Tauri mode uses port ${DEFAULT_BROWSER_PORT} from tauri.conf.json`)
  }
  if (options.mode === 'tauri' && !['localhost', DEFAULT_BROWSER_HOST].includes(options.host)) {
    throw new Error('Tauri mode uses the configured localhost host')
  }

  return options
}

function parseBrowserMode(value) {
  if (value === 'vite' || value === 'tauri') return value
  throw new Error(`Invalid browser-dev mode: ${value}. Choose vite or tauri`)
}

function parsePort(value) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid browser-dev port: ${value}`)
  }
  return port
}

export function browserServerArgs({ host, port }) {
  return [
    'dev',
    '--host',
    host,
    '--port',
    String(port),
    '--strictPort',
  ]
}

export function tauriDevArgs() {
  return ['tauri', 'dev']
}

export function browserCommandArgs(options) {
  return options.mode === 'tauri' ? tauriDevArgs() : browserServerArgs(options)
}

export function dependencyInstallArgs() {
  return [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--prefer-offline',
  ]
}

export function dependencyInstallEnv(env = process.env) {
  return {
    ...env,
    CI: 'true',
  }
}

export function resolveLocalPnpmCli(rootDir = repoRoot) {
  const candidates = [
    path.join(rootDir, '.tools', 'pnpm', 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
    path.join(
      rootDir,
      '.markora-build.local',
      'toolchains',
      `pnpm-${REQUIRED_PNPM_VERSION}`,
      'node_modules',
      'pnpm',
      'bin',
      'pnpm.cjs',
    ),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

export function resolvePnpmInvocation(rootDir = repoRoot, args = []) {
  const localPnpmCli = resolveLocalPnpmCli(rootDir)
  if (localPnpmCli) {
    return {
      command: process.execPath,
      args: [localPnpmCli, ...args],
    }
  }

  const versionProbe = spawnSync('pnpm', ['--version'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (versionProbe.status === 0 && versionProbe.stdout.trim() === REQUIRED_PNPM_VERSION) {
    return { command: 'pnpm', args }
  }

  throw new Error(
    `A project-local pnpm ${REQUIRED_PNPM_VERSION} runtime is unavailable. `
    + 'Install or enable the repository-pinned pnpm runtime before starting browser mode.',
  )
}

export function resolveLocalPnpmBinDir(rootDir = repoRoot) {
  const localPnpmCli = resolveLocalPnpmCli(rootDir)
  if (!localPnpmCli) return null

  const pnpmNodeModulesDir = path.dirname(path.dirname(path.dirname(localPnpmCli)))
  return path.join(pnpmNodeModulesDir, '.bin')
}

export function browserProcessEnv(options, rootDir = repoRoot, env = process.env) {
  const browserEnv = {
    ...env,
    MARKORA_VITE_CACHE_DIR: env.MARKORA_VITE_CACHE_DIR
      ?? env.TOLARIA_VITE_CACHE_DIR
      ?? path.join(tmpdir(), `markora-vite-browser-${options.port}`),
  }
  if (options.mode !== 'tauri') return browserEnv

  const localPnpmBinDir = resolveLocalPnpmBinDir(rootDir)
  if (!localPnpmBinDir) return browserEnv

  return {
    ...browserEnv,
    PATH: [localPnpmBinDir, env.PATH].filter(Boolean).join(path.delimiter),
  }
}

function spawnPnpm(rootDir, args, env, stdio = 'inherit') {
  const invocation = resolvePnpmInvocation(rootDir, args)
  return spawn(invocation.command, invocation.args, {
    cwd: rootDir,
    detached: process.platform !== 'win32',
    env,
    stdio,
  })
}

function waitForChild(child) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode ?? 1)
  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 1))
  })
}

function signalChild(child, signal) {
  if (child.exitCode !== null) return
  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, signal)
      return
    } catch {
      // Fall back to signaling the direct child when a process group is unavailable.
    }
  }
  child.kill(signal)
}

export async function stopBrowserServer(child) {
  if (child.exitCode !== null) return

  const exited = waitForChild(child).catch(() => 1)
  signalChild(child, 'SIGTERM')
  await Promise.race([exited, delay(5_000)])
  if (child.exitCode === null) {
    signalChild(child, 'SIGKILL')
    await Promise.race([exited, delay(1_000)])
  }
}

export async function ensureBrowserDependencies(rootDir = repoRoot) {
  const child = spawnPnpm(
    rootDir,
    dependencyInstallArgs(),
    dependencyInstallEnv(),
  )
  const exitCode = await waitForChild(child)
  if (exitCode !== 0) {
    throw new Error(`Browser dependency preflight failed with exit code ${exitCode}`)
  }
}

function browserUrl({ host, port }) {
  const urlHost = host === '0.0.0.0' ? '127.0.0.1' : host
  return `http://${urlHost}:${port}`
}

async function waitForServer(child, url, timeoutMs = 30_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) {
      throw new Error(`Browser dev server exited with code ${child.exitCode ?? 1}`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling while Vite is starting.
    }
    await delay(100)
  }

  throw new Error(`Browser dev server did not become ready at ${url}`)
}

export async function startBrowserServer(
  options,
  rootDir = repoRoot,
  { dependenciesReady = false } = {},
) {
  if (!dependenciesReady) await ensureBrowserDependencies(rootDir)
  const child = spawnPnpm(
    rootDir,
    browserCommandArgs(options),
    browserProcessEnv(options, rootDir),
  )
  const url = browserUrl(options)
  try {
    await waitForServer(child, url, options.mode === 'tauri' ? 120_000 : 30_000)
  } catch (error) {
    await stopBrowserServer(child)
    throw error
  }
  return { child, url }
}

function openBrowser(url) {
  const opener = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(opener, args, { detached: true, stdio: 'ignore' })
  child.unref()
}

export async function runBrowserStartupCheck(url, chromiumOverride) {
  const chromium = chromiumOverride ?? await ensurePlaywrightChromium()
  const browser = await launchPlaywrightChromium(chromium)
  const pageErrors = []
  const page = await browser.newPage()
  page.on('pageerror', (error) => pageErrors.push(error))

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' })
    if (!response?.ok()) {
      throw new Error(`Browser startup returned HTTP ${response?.status() ?? 'no response'}`)
    }
    await page.locator(BROWSER_STARTUP_SELECTOR).waitFor({
      state: 'visible',
      timeout: 30_000,
    })
    if (pageErrors.length > 0) {
      throw new Error(`Browser startup raised ${pageErrors.length} page error(s)`)
    }
  } finally {
    await browser.close()
  }
}

function isMissingPlaywrightExecutable(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("Executable doesn't exist") || message.includes('executablePath')
}

function missingPlaywrightChromiumError() {
  return new Error(
    'Playwright Chromium is not installed. '
    + `Run \`${playwrightBrowserInstallCommand()}\` and retry.`,
  )
}

async function launchPlaywrightChromium(chromium) {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (isMissingPlaywrightExecutable(error)) throw missingPlaywrightChromiumError()
    throw error
  }
}

export async function ensurePlaywrightChromium() {
  const { chromium } = await import('@playwright/test')
  const executablePath = chromium.executablePath()
  if (!existsSync(executablePath)) {
    throw missingPlaywrightChromiumError()
  }
  return chromium
}

export async function checkPlaywrightChromium() {
  const chromium = await ensurePlaywrightChromium()
  const browser = await launchPlaywrightChromium(chromium)
  await browser.close()
  return chromium
}

async function runServerMode(options, rootDir) {
  const { child, url } = await startBrowserServer(options, rootDir)
  const runtime = options.mode === 'tauri' ? 'Tauri dev backend and Vite renderer' : 'Vite renderer'
  console.log(`${runtime} ready at ${url}`)
  if (options.open) openBrowser(url)

  const forwardSignal = (signal) => signalChild(child, signal)
  process.once('SIGINT', forwardSignal)
  process.once('SIGTERM', forwardSignal)
  try {
    return await waitForChild(child)
  } finally {
    process.off('SIGINT', forwardSignal)
    process.off('SIGTERM', forwardSignal)
  }
}

export async function runBrowserDevCli(args = process.argv.slice(2), rootDir = repoRoot) {
  const options = parseBrowserDevArgs(args)
  if (!options.check) return runServerMode(options, rootDir)

  await ensureBrowserDependencies(rootDir)
  const chromium = await checkPlaywrightChromium()
  const { child, url } = await startBrowserServer(options, rootDir, { dependenciesReady: true })
  try {
    await runBrowserStartupCheck(url, chromium)
    console.log(`BROWSER STARTUP PASSED: ${url}`)
    return 0
  } finally {
    await stopBrowserServer(child)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runBrowserDevCli()
    .then((exitCode) => {
      process.exitCode = exitCode
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
