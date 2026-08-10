import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createTranslator, type AppLocale } from '../lib/i18n'
import type { DeletedNote, DeletedNotePreview } from '../types'
import {
  getDeletedNotePreview,
  listDeletedNotes,
  restoreDeletedNote,
} from '../utils/deletedNoteRecovery'

interface RestoreDeletedNoteDialogProps {
  open: boolean
  managed: boolean
  vaultPath: string
  locale?: AppLocale
  onClose: () => void
  onRestored?: (relativePath: string) => void | Promise<void>
  onToast?: (message: string) => void
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function formatDeletedAt(value: string, locale: AppLocale): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale)
}

export function RestoreDeletedNoteDialog({
  open,
  managed,
  vaultPath,
  locale = 'en',
  onClose,
  onRestored,
  onToast,
}: RestoreDeletedNoteDialogProps) {
  const t = createTranslator(locale)
  const [notes, setNotes] = useState<DeletedNote[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [preview, setPreview] = useState<DeletedNotePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !managed || !vaultPath) {
      setNotes([])
      setSelectedPath(null)
      setPreview(null)
      setLoading(false)
      setPreviewLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void listDeletedNotes(vaultPath)
      .then((nextNotes) => {
        if (cancelled) return
        setNotes(nextNotes)
        setSelectedPath(nextNotes[0]?.relativePath ?? null)
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(errorMessage(nextError))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [managed, open, vaultPath])

  useEffect(() => {
    if (!open || !managed || !vaultPath || !selectedPath) {
      setPreview(null)
      setPreviewLoading(false)
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setError(null)
    void getDeletedNotePreview(vaultPath, selectedPath)
      .then((nextPreview) => {
        if (!cancelled) setPreview(nextPreview)
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(errorMessage(nextError))
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [managed, open, selectedPath, vaultPath])

  const handleRestore = async () => {
    if (!selectedPath || restoring) return

    setRestoring(true)
    setError(null)
    try {
      const result = await restoreDeletedNote(vaultPath, selectedPath)
      await onRestored?.(result.relativePath)
      onToast?.(
        result.snapshotCreated
          ? t('recovery.restored', { path: result.relativePath })
          : t('recovery.restoredPendingSnapshot', { path: result.relativePath }),
      )
      onClose()
    } catch (nextError) {
      setError(t('recovery.error', { error: errorMessage(nextError) }))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent data-testid="restore-deleted-note-dialog" className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('recovery.title')}</DialogTitle>
          <DialogDescription>{t('recovery.description')}</DialogDescription>
        </DialogHeader>

        {!managed && (
          <div role="alert" data-testid="restore-deleted-note-unavailable" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {t('recovery.unavailable')}
          </div>
        )}

        {managed && loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">{t('recovery.loading')}</div>
        )}

        {managed && !loading && notes.length === 0 && !error && (
          <div className="py-8 text-center text-sm text-muted-foreground">{t('recovery.empty')}</div>
        )}

        {managed && !loading && notes.length > 0 && (
          <div className="grid min-h-0 gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
            <ScrollArea className="h-72 rounded-md border border-border">
              <div className="space-y-1 p-2" role="listbox" aria-label={t('recovery.title')}>
                {notes.map((note) => {
                  const selected = note.relativePath === selectedPath
                  return (
                    <Button
                      key={note.relativePath}
                      type="button"
                      variant={selected ? 'secondary' : 'ghost'}
                      className="h-auto w-full justify-between gap-3 px-3 py-2 text-left"
                      aria-selected={selected}
                      data-testid="restore-deleted-note-item"
                      onClick={() => setSelectedPath(note.relativePath)}
                    >
                      <span className="min-w-0 truncate">{note.relativePath}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatDeletedAt(note.deletedAt, locale)}</span>
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="min-h-0 rounded-md border border-border">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">{t('recovery.preview')}</div>
              <ScrollArea className="h-64">
                {previewLoading && <div className="p-3 text-sm text-muted-foreground">{t('recovery.loading')}</div>}
                {!previewLoading && preview && (
                  <pre data-testid="restore-deleted-note-preview" className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-5 text-foreground">
                    {preview.content}
                  </pre>
                )}
                {!previewLoading && !preview && <div className="p-3 text-sm text-muted-foreground">{t('recovery.noPreview')}</div>}
              </ScrollArea>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t('recovery.error', { error })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t('recovery.cancel')}</Button>
          <Button
            type="button"
            data-testid="restore-deleted-note-submit"
            disabled={!managed || !selectedPath || loading || previewLoading || restoring}
            onClick={() => { void handleRestore() }}
          >
            {t('recovery.restore')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
