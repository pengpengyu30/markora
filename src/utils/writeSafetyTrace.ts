interface WriteSafetyTraceDetails {
  path?: string | null
  operationSeq?: number
  outcome?: string
  error?: unknown
}

let traceSeq = 0

function traceEnabled(): boolean {
  return Reflect.get(globalThis, '__TOLARIA_WRITE_SAFETY_DEBUG__') === true
}

function formatTraceValue(value: unknown): string {
  if (value === undefined || value === null) return 'none'
  return String(value).replace(/\s+/g, '_')
}

/** Diagnostic-only write timeline. Disabled unless explicitly enabled in DevTools. */
export function logWriteSafetyTrace(
  event: string,
  details: WriteSafetyTraceDetails = {},
): void {
  if (!traceEnabled()) return

  traceSeq += 1
  const fields = [
    `seq=${traceSeq}`,
    `event=${event}`,
    `path=${formatTraceValue(details.path)}`,
    `operationSeq=${formatTraceValue(details.operationSeq)}`,
    `outcome=${formatTraceValue(details.outcome)}`,
  ]
  if (details.error !== undefined) fields.push(`error=${formatTraceValue(details.error)}`)
  console.debug(`[write-safety] ${fields.join(' ')}`)
}
