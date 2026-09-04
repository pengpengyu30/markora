import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const EDITOR_THEME_FONT_LICENSE_FILES = Object.freeze([
  'OFL-Inter.txt',
  'OFL-Source-Serif-4.txt',
  'OFL-JetBrains-Mono.txt',
])

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultSourceDirectory = path.join(projectRoot, 'src', 'editorThemes', 'fonts')

export async function copyEditorThemeFontLicenses(
  distDirectory,
  sourceDirectory = defaultSourceDirectory,
) {
  const destinationDirectory = path.join(path.resolve(distDirectory), 'editor-theme-fonts', 'licenses')
  await mkdir(destinationDirectory, { recursive: true })

  for (const fileName of EDITOR_THEME_FONT_LICENSE_FILES) {
    await copyFile(
      path.join(path.resolve(sourceDirectory), fileName),
      path.join(destinationDirectory, fileName),
    )
  }

  return { files: [...EDITOR_THEME_FONT_LICENSE_FILES] }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const distDirectory = process.argv[2] ?? path.resolve(process.cwd(), 'dist')
  try {
    const result = await copyEditorThemeFontLicenses(distDirectory)
    console.log(`Copied ${result.files.length} editor-theme font license files.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
