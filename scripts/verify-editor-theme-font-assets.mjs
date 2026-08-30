import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REQUIRED_EDITOR_THEME_FONT_FACES = Object.freeze([
  { family: 'Tolaria Inter', style: 'normal', fileStem: 'inter-latin-var' },
  { family: 'Tolaria Source Serif', style: 'normal', fileStem: 'source-serif-latin-var' },
  { family: 'Tolaria Source Serif', style: 'italic', fileStem: 'source-serif-latin-italic-var' },
  { family: 'Tolaria JetBrains Mono', style: 'normal', fileStem: 'jetbrains-mono-latin-var' },
  { family: 'Tolaria JetBrains Mono', style: 'italic', fileStem: 'jetbrains-mono-latin-italic-var' },
])

const FONT_FACE_BLOCK_PATTERN = /@font-face\s*\{([^{}]*)\}/giu

function readDeclaration(block, property) {
  const declarationPattern = new RegExp(`(?:^|;)${property}:([^;]+)`, 'iu')
  return declarationPattern.exec(block)?.[1]?.trim() ?? null
}

function unquote(value) {
  return value.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, '$1$2')
}

function readFontFaces(css, cssFile) {
  return [...css.matchAll(FONT_FACE_BLOCK_PATTERN)].flatMap((match) => {
    const block = match[1]
    if (!block) return []

    const familyValue = readDeclaration(block, 'font-family')
    const style = readDeclaration(block, 'font-style')
    const src = readDeclaration(block, 'src')
    const urlMatch = src?.match(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^\)]+))\s*\)/iu)
    const url = urlMatch?.[1] ?? urlMatch?.[2] ?? urlMatch?.[3]
    if (!familyValue || !style || !url) return []

    return [{
      family: unquote(familyValue),
      style,
      url: url.trim(),
      cssFile,
    }]
  })
}

async function listCssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listCssFiles(entryPath))
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(entryPath)
    }
  }
  return files
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

async function resolveLocalFontAsset(url, cssFile, distDirectory) {
  const normalizedUrl = url.trim()
  if (/^(?:https?:|data:|\/\/)/iu.test(normalizedUrl)) {
    throw new Error(`Editor theme font uses a remote URL: ${normalizedUrl}`)
  }

  const pathOnly = normalizedUrl.split(/[?#]/u, 1)[0]
  const assetPath = pathOnly.startsWith('/')
    ? pathOnly.slice(1)
    : path.relative(distDirectory, path.dirname(cssFile)) + path.sep + pathOnly
  const candidate = path.resolve(distDirectory, assetPath)
  if (!isInside(distDirectory, candidate)) {
    throw new Error(`Editor theme font URL escapes the production directory: ${normalizedUrl}`)
  }
  if (!candidate.endsWith('.woff2')) {
    throw new Error(`Editor theme font is not a WOFF2 asset: ${normalizedUrl}`)
  }

  let fileStats
  try {
    fileStats = await stat(candidate)
  } catch {
    throw new Error(`Editor theme font asset is missing: ${candidate}`)
  }
  if (!fileStats.isFile() || fileStats.size <= 1024) {
    throw new Error(`Editor theme font asset is not a valid local file: ${candidate}`)
  }
  const header = await readFile(candidate, { encoding: null })
  if (header.subarray(0, 4).toString('ascii') !== 'wOF2') {
    throw new Error(`Editor theme font asset is not a WOFF2 file: ${candidate}`)
  }

  return candidate
}

export async function verifyEditorThemeFontAssets(distDirectory) {
  const resolvedDistDirectory = path.resolve(distDirectory)
  const cssFiles = await listCssFiles(resolvedDistDirectory)
  if (cssFiles.length === 0) {
    throw new Error(`No production CSS files found under ${resolvedDistDirectory}`)
  }

  const fontFaces = []
  for (const cssFile of cssFiles) {
    fontFaces.push(...readFontFaces(await readFile(cssFile, 'utf8'), cssFile))
  }

  for (const requiredFace of REQUIRED_EDITOR_THEME_FONT_FACES) {
    const matches = fontFaces.filter(face => (
      face.family === requiredFace.family && face.style === requiredFace.style
    ))
    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one ${requiredFace.family} ${requiredFace.style} font face, found ${matches.length}`,
      )
    }

    const [face] = matches
    const assetPath = await resolveLocalFontAsset(face.url, face.cssFile, resolvedDistDirectory)
    const assetName = path.basename(assetPath)
    if (!assetName.startsWith(`${requiredFace.fileStem}-`)) {
      throw new Error(
        `Unexpected ${requiredFace.family} ${requiredFace.style} asset: ${assetName}`,
      )
    }
  }

  return {
    facesChecked: REQUIRED_EDITOR_THEME_FONT_FACES.length,
    families: [...new Set(REQUIRED_EDITOR_THEME_FONT_FACES.map(face => face.family))],
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const distDirectory = process.argv[2] ?? path.resolve(process.cwd(), 'dist')
  try {
    const result = await verifyEditorThemeFontAssets(distDirectory)
    console.log(
      `Verified ${result.facesChecked} local editor-theme font faces for ${result.families.join(', ')}.`,
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
