import { useCallback, useEffect, useState, type MutableRefObject } from 'react'
import { translate, type AppLocale } from '../lib/i18n'
import { notePdfExportFilename, printActiveNoteAsPdf, type NotePdfExportSource } from '../utils/notePdfExport'
import type { VaultEntry } from '../types'
import { isMarkdownEntry } from '../utils/typeDefinitions'

interface EditorPdfExportTab {
  entry: VaultEntry
}

interface UseEditorPdfExportParams {
  activeTab: EditorPdfExportTab | null
  handleToggleRawExclusive: () => void
  locale?: AppLocale
  onToast?: (message: string | null) => void
  pdfExportRef?: MutableRefObject<((source?: NotePdfExportSource) => void) | null>
  rawMode: boolean
}

interface PreparePdfExportModeParams {
  handleToggleRawExclusive: () => void
  rawMode: boolean
  setPendingSource: (source: NotePdfExportSource | null) => void
  source: NotePdfExportSource
}

interface PdfExportErrorParams {
  error: unknown
  locale: AppLocale
  onToast?: (message: string | null) => void
}

interface PendingPdfExportParams {
  activeTab: EditorPdfExportTab | null
  locale: AppLocale
  onToast?: (message: string | null) => void
  pendingSource: NotePdfExportSource | null
  rawMode: boolean
  setPendingSource: (source: NotePdfExportSource | null) => void
}

function isPdfExportableTab(activeTab: EditorPdfExportTab | null): activeTab is EditorPdfExportTab {
  return Boolean(activeTab && isMarkdownEntry(activeTab.entry))
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function reportPdfExportError({ error, locale, onToast }: PdfExportErrorParams): void {
  onToast?.(
    translate(locale, 'editor.exportPdf.failed', {
      error: errorMessage(error),
    }),
  )
}

async function preparePdfExportMode({
  handleToggleRawExclusive,
  rawMode,
  setPendingSource,
  source,
}: PreparePdfExportModeParams): Promise<void> {
  if (rawMode) handleToggleRawExclusive()
  setPendingSource(source)
}

function usePendingPdfExport({
  activeTab,
  locale,
  onToast,
  pendingSource,
  rawMode,
  setPendingSource,
}: PendingPdfExportParams): void {
  useEffect(() => {
    if (!pendingSource || rawMode || !isPdfExportableTab(activeTab)) return

    let cancelled = false
    const defaultFilename = notePdfExportFilename(activeTab.entry.filename)

    void printActiveNoteAsPdf({ defaultFilename, source: pendingSource })
      .catch((error: unknown) => {
        if (!cancelled) reportPdfExportError({ error, locale, onToast })
      })
      .finally(() => {
        if (!cancelled) setPendingSource(null)
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, locale, onToast, pendingSource, rawMode, setPendingSource])
}

function useRegisteredPdfExportHandler(
  pdfExportRef: MutableRefObject<((source?: NotePdfExportSource) => void) | null> | undefined,
  exportNoteAsPdf: (source?: NotePdfExportSource) => void,
): void {
  useEffect(() => {
    if (!pdfExportRef) return undefined

    pdfExportRef.current = exportNoteAsPdf
    return () => {
      if (pdfExportRef.current === exportNoteAsPdf) {
        pdfExportRef.current = null
      }
    }
  }, [exportNoteAsPdf, pdfExportRef])
}

export function useEditorPdfExport(options: UseEditorPdfExportParams): (source?: NotePdfExportSource) => void {
  const {
    activeTab,
    handleToggleRawExclusive,
    locale = 'en',
    onToast,
    pdfExportRef,
    rawMode,
  } = options
  const [pendingSource, setPendingSource] = useState<NotePdfExportSource | null>(null)

  const exportNoteAsPdf = useCallback(
    (source: NotePdfExportSource = 'breadcrumb') => {
    if (!isPdfExportableTab(activeTab)) {
      onToast?.(translate(locale, 'editor.exportPdf.unavailable'))
      return
    }

    void preparePdfExportMode({
      handleToggleRawExclusive,
      rawMode,
      setPendingSource,
      source,
      }).catch((error: unknown) => {
      reportPdfExportError({ error, locale, onToast })
    })
    },
    [activeTab, handleToggleRawExclusive, locale, onToast, rawMode],
  )

  usePendingPdfExport({
    activeTab,
    locale,
    onToast,
    pendingSource,
    rawMode,
    setPendingSource,
  })
  useRegisteredPdfExportHandler(pdfExportRef, exportNoteAsPdf)

  return exportNoteAsPdf
}
