import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'
import { registerFocusOwnershipScope, type FocusOwnershipScopeHandle } from './focusOwnershipGuard'

const editorFocusGuards = new Set<FocusOwnershipScopeHandle>()
let editorFocusSuspended = false

export function canEditorClaimFocus(): boolean {
  return !editorFocusSuspended
}

export function resumeEditorFocus(): void {
  editorFocusSuspended = false
  for (const guard of editorFocusGuards) {
    guard.rememberOutsideTarget(null)
  }
}

export function suspendEditorFocus(target?: EventTarget | null): void {
  editorFocusSuspended = true
  for (const guard of editorFocusGuards) {
    guard.rememberOutsideTarget(target ?? null)
  }
}

export function useEditorFocusScope(scopeRef: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const scope = scopeRef.current
    if (!scope) return

    const guard = registerFocusOwnershipScope(scope, {
      canClaimFocus: canEditorClaimFocus,
      onInsidePointerDown: resumeEditorFocus,
    })
    editorFocusGuards.add(guard)
    return () => {
      editorFocusGuards.delete(guard)
      guard.unregister()
    }
  }, [scopeRef])
}
