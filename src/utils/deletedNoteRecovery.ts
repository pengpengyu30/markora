import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { DeletedNote, DeletedNotePreview, RestoredNote } from '../types'

async function invokeRecovery<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

export function listDeletedNotes(vaultPath: string): Promise<DeletedNote[]> {
  return invokeRecovery<DeletedNote[]>('list_deleted_notes', { vaultPath })
}

export function getDeletedNotePreview(vaultPath: string, relativePath: string): Promise<DeletedNotePreview> {
  return invokeRecovery<DeletedNotePreview>('get_deleted_note_preview', { vaultPath, relativePath })
}

export function restoreDeletedNote(vaultPath: string, relativePath: string): Promise<RestoredNote> {
  return invokeRecovery<RestoredNote>('restore_deleted_note', { vaultPath, relativePath })
}
