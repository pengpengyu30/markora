import type { NoteWidthMode } from '../types'
import { detectFrontmatterState } from './frontmatter'

export const DEFAULT_NOTE_WIDTH_MODE: NoteWidthMode = 'normal'
export const DEFAULT_NOTE_WIDTH_PX = 820

export type NoteWidthSource = 'note' | 'global' | 'theme' | 'fallback'

export interface ResolvedNoteWidth {
  mode: NoteWidthMode
  source: NoteWidthSource
  maxWidth: number | null
}

export function normalizeNoteWidthMode(value: unknown): NoteWidthMode | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  return normalized === 'normal' || normalized === 'wide' ? normalized : null
}

function normalizedPositiveWidth(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null
  return Math.round(value)
}

export function resolveNoteWidth(
  noteWidth: unknown,
  defaultWidth: unknown,
  themeRecommendedWidth: unknown,
): ResolvedNoteWidth {
  const noteMode = normalizeNoteWidthMode(noteWidth)
  if (noteMode) {
    return {
      mode: noteMode,
      source: 'note',
      maxWidth: noteMode === 'wide' ? null : DEFAULT_NOTE_WIDTH_PX,
    }
  }

  const defaultMode = normalizeNoteWidthMode(defaultWidth)
  if (defaultMode) {
    return {
      mode: defaultMode,
      source: 'global',
      maxWidth: defaultMode === 'wide' ? null : DEFAULT_NOTE_WIDTH_PX,
    }
  }

  const themeWidth = normalizedPositiveWidth(themeRecommendedWidth)
  if (themeWidth) {
    return {
      mode: 'normal',
      source: 'theme',
      maxWidth: themeWidth,
    }
  }

  return {
    mode: DEFAULT_NOTE_WIDTH_MODE,
    source: 'fallback',
    maxWidth: DEFAULT_NOTE_WIDTH_PX,
  }
}

export function resolveNoteWidthMode(noteWidth: unknown, defaultWidth: unknown): NoteWidthMode {
  return resolveNoteWidth(noteWidth, defaultWidth, null).mode
}

export function toggleNoteWidthMode(width: unknown): NoteWidthMode {
  return resolveNoteWidthMode(width, DEFAULT_NOTE_WIDTH_MODE) === 'wide' ? 'normal' : 'wide'
}

export function canPersistNoteWidthMode(content: string | null): boolean {
  const frontmatterState = detectFrontmatterState(content)
  return frontmatterState === 'valid' || frontmatterState === 'empty'
}
