type TokenKind =
  | 'blockquote'
  | 'code'
  | 'fence-close'
  | 'fence-open'
  | 'heading'
  | 'ordered-list'
  | 'text'
  | 'thematic'
  | 'unordered-list'

type SourceLineKind = 'blank' | 'code' | 'content'

interface MarkdownToken {
  fenceGroup?: number
  kind: TokenKind
  lineIndex: number
  payload: string
  prefix: string
  raw: string
  shape: string
  signature: string
  fenceIndent?: string
}

interface MarkdownScan {
  fenceGroups: FenceGroup[]
  hasTrailingNewline: boolean
  lineKinds: SourceLineKind[]
  lines: string[]
  newline: '\n' | '\r\n'
  tokenIndexByLine: Map<number, number>
  tokens: MarkdownToken[]
}

interface FenceState {
  group: number
  indent: string
  length: number
  marker: '`' | '~'
}

interface TokenMatch {
  exact: boolean
  sourceIndex: number
}

interface FenceGroup {
  closeTokenIndex: number
  codeTokenIndices: number[]
  language: string
  openTokenIndex: number
}

const FENCE_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/u
const HEADING_RE = /^([ \t]*)(#{1,6})([ \t]*)(.*)$/u
const ORDERED_LIST_RE = /^([ \t]*\d+[.)][ \t]+)(.*)$/u
const UNORDERED_LIST_RE = /^([ \t]*[-+*][ \t]+)(.*)$/u
const BLOCKQUOTE_RE = /^([ \t]*>+[ \t]?)(.*)$/u
const THEMATIC_BREAK_RE = /^[ \t]{0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*$/u

function splitMarkdownLines(markdown: string): {
  hasTrailingNewline: boolean
  lines: string[]
  newline: '\n' | '\r\n'
} {
  const hasTrailingNewline = /\r?\n$/u.test(markdown)
  const lines = markdown ? markdown.split(/\r?\n/u) : []
  if (hasTrailingNewline) lines.pop()
  return {
    hasTrailingNewline,
    lines,
    newline: markdown.includes('\r\n') ? '\r\n' : '\n',
  }
}

function normalizedFenceLanguage(info: string): string {
  return info.trim().split(/\s+/u)[0]?.toLowerCase() ?? ''
}

function closingFence(line: string, fence: FenceState): boolean {
  const match = /^([ \t]*)(`{3,}|~{3,})[ \t]*$/u.exec(line)
  if (!match) return false
  return match[2].charAt(0) === fence.marker && match[2].length >= fence.length
}

function stripFenceIndent(line: string, indent: string): string {
  if (line.startsWith(indent)) return line.slice(indent.length)
  return line.trim() ? line : ''
}

function tokenForContentLine(line: string, lineIndex: number): MarkdownToken {
  const heading = HEADING_RE.exec(line)
  if (heading) {
    const payload = heading[4]
    return {
      kind: 'heading',
      lineIndex,
      payload,
      prefix: `${heading[1]}${heading[2]}${heading[3]}`,
      raw: line,
      shape: `heading:${heading[2].length}`,
      signature: `heading:${heading[2].length}:${payload.trim()}`,
    }
  }

  const ordered = ORDERED_LIST_RE.exec(line)
  if (ordered) {
    return {
      kind: 'ordered-list',
      lineIndex,
      payload: ordered[2],
      prefix: ordered[1],
      raw: line,
      shape: 'ordered-list',
      signature: `ordered-list:${ordered[2].trim()}`,
    }
  }

  const unordered = UNORDERED_LIST_RE.exec(line)
  if (unordered) {
    return {
      kind: 'unordered-list',
      lineIndex,
      payload: unordered[2],
      prefix: unordered[1],
      raw: line,
      shape: 'unordered-list',
      signature: `unordered-list:${unordered[2].trim()}`,
    }
  }

  const blockquote = BLOCKQUOTE_RE.exec(line)
  if (blockquote) {
    return {
      kind: 'blockquote',
      lineIndex,
      payload: blockquote[2],
      prefix: blockquote[1],
      raw: line,
      shape: 'blockquote',
      signature: `blockquote:${blockquote[2].trim()}`,
    }
  }

  if (THEMATIC_BREAK_RE.test(line)) {
    return {
      kind: 'thematic',
      lineIndex,
      payload: '',
      prefix: '',
      raw: line,
      shape: 'thematic',
      signature: 'thematic',
    }
  }

  const prefix = /^[ \t]*/u.exec(line)?.[0] ?? ''
  const payload = line.slice(prefix.length)
  return {
    kind: 'text',
    lineIndex,
    payload,
    prefix,
    raw: line,
    shape: 'text',
    signature: `text:${payload.trim()}`,
  }
}

function scanMarkdown(markdown: string): MarkdownScan {
  const split = splitMarkdownLines(markdown)
  const lineKinds = split.lines.map(line => line.trim() ? 'content' : 'blank') as SourceLineKind[]
  const tokens: MarkdownToken[] = []
  const fenceGroups: FenceGroup[] = []
  let fence: FenceState | null = null

  split.lines.forEach((line, lineIndex) => {
    const opening = FENCE_RE.exec(line)
    if (fence) {
      lineKinds[lineIndex] = 'code'
      if (closingFence(line, fence)) {
        const fenceGroup = fenceGroups[fence.group]
        tokens.push({
          fenceGroup: fence.group,
          kind: 'fence-close',
          lineIndex,
          payload: '',
          prefix: '',
          raw: line,
          shape: 'fence-close',
          signature: 'fence-close',
        })
        if (fenceGroup) fenceGroup.closeTokenIndex = tokens.length - 1
        fence = null
      } else {
        const payload = stripFenceIndent(line, fence.indent)
        tokens.push({
          fenceGroup: fence.group,
          fenceIndent: fence.indent,
          kind: 'code',
          lineIndex,
          payload,
          prefix: fence.indent,
          raw: line,
          shape: 'code',
          signature: `code:${payload}`,
        })
        fenceGroups[fence.group]?.codeTokenIndices.push(tokens.length - 1)
      }
      return
    }

    if (opening) {
      const marker = opening[2].charAt(0) as '`' | '~'
      const group = fenceGroups.length
      const language = normalizedFenceLanguage(opening[3])
      fence = { group, indent: opening[1], length: opening[2].length, marker }
      tokens.push({
        fenceGroup: group,
        kind: 'fence-open',
        lineIndex,
        payload: opening[3].trim(),
        prefix: opening[1],
        raw: line,
        shape: 'fence-open',
        signature: `fence-open:${language}`,
      })
      fenceGroups.push({
        closeTokenIndex: -1,
        codeTokenIndices: [],
        language,
        openTokenIndex: tokens.length - 1,
      })
      return
    }

    if (!line.trim()) return
    tokens.push(tokenForContentLine(line, lineIndex))
  })

  return {
    ...split,
    fenceGroups,
    lineKinds,
    tokenIndexByLine: new Map(tokens.map((token, index) => [token.lineIndex, index])),
    tokens,
  }
}

function sameCodeContent(
  sourceGroup: FenceGroup,
  serializedGroup: FenceGroup,
  source: MarkdownScan,
  serialized: MarkdownScan,
): boolean {
  if (sourceGroup.codeTokenIndices.length !== serializedGroup.codeTokenIndices.length) return false
  return sourceGroup.codeTokenIndices.every((sourceIndex, codeIndex) => (
    source.tokens[sourceIndex]?.signature
      === serialized.tokens[serializedGroup.codeTokenIndices[codeIndex] ?? -1]?.signature
  ))
}

function buildFenceGroupMatches(source: MarkdownScan, serialized: MarkdownScan): Map<number, number> {
  if (source.fenceGroups.length === serialized.fenceGroups.length
    && source.fenceGroups.every((group, index) => group.language === serialized.fenceGroups[index]?.language)) {
    return new Map(source.fenceGroups.map((_, index) => [index, index]))
  }

  const sourceByLanguage = new Map<string, number[]>()
  source.fenceGroups.forEach((group, index) => {
    const groups = sourceByLanguage.get(group.language) ?? []
    groups.push(index)
    sourceByLanguage.set(group.language, groups)
  })
  const serializedByLanguage = new Map<string, number[]>()
  serialized.fenceGroups.forEach((group, index) => {
    const groups = serializedByLanguage.get(group.language) ?? []
    groups.push(index)
    serializedByLanguage.set(group.language, groups)
  })

  const matches = new Map<number, number>()
  const usedSourceGroups = new Set<number>()
  for (const [language, serializedGroups] of serializedByLanguage) {
    const sourceGroups = sourceByLanguage.get(language) ?? []
    let lastMatchedSourceGroup = -1
    for (const serializedGroupIndex of serializedGroups) {
      const serializedGroup = serialized.fenceGroups[serializedGroupIndex]
      const sourceGroupIndex = sourceGroups.find((candidate) => {
        const sourceGroup = source.fenceGroups[candidate]
        return sourceGroup !== undefined
          && serializedGroup !== undefined
          && !usedSourceGroups.has(candidate)
          && candidate > lastMatchedSourceGroup
          && sameCodeContent(sourceGroup, serializedGroup, source, serialized)
      })
      if (sourceGroupIndex === undefined) continue
      matches.set(serializedGroupIndex, sourceGroupIndex)
      usedSourceGroups.add(sourceGroupIndex)
      lastMatchedSourceGroup = sourceGroupIndex
    }

    // A one-to-one language set with entirely changed code can still be
    // matched by position. Never use this fallback when a code block was
    // inserted or deleted, because repeated languages would misalign groups.
    if (serializedGroups.length !== sourceGroups.length) continue
    for (const serializedGroupIndex of serializedGroups) {
      if (matches.has(serializedGroupIndex)) continue
      const sourceGroupIndex = sourceGroups.find(candidate => !usedSourceGroups.has(candidate))
      if (sourceGroupIndex === undefined) continue
      matches.set(serializedGroupIndex, sourceGroupIndex)
      usedSourceGroups.add(sourceGroupIndex)
    }
  }
  return matches
}

function canPairByShape(
  canonical: MarkdownToken,
  source: MarkdownToken,
  fenceGroupMatches: Map<number, number>,
): boolean {
  if (canonical.shape !== source.shape) return false
  if (canonical.kind === 'fence-open' || canonical.kind === 'fence-close') return false
  if (canonical.kind === 'code') {
    return canonical.fenceGroup !== undefined
      && source.fenceGroup !== undefined
      && fenceGroupMatches.get(canonical.fenceGroup) === source.fenceGroup
  }
  return true
}

function buildTokenMatches(source: MarkdownScan, serialized: MarkdownScan): Map<number, TokenMatch> {
  const fenceGroupMatches = buildFenceGroupMatches(source, serialized)
  const sourcePositions = new Map<string, number[]>()
  source.tokens.forEach((token, index) => {
    if (token.kind === 'code' || token.kind === 'fence-open' || token.kind === 'fence-close') return
    const positions = sourcePositions.get(token.signature) ?? []
    positions.push(index)
    sourcePositions.set(token.signature, positions)
  })

  const nextPositionBySignature = new Map<string, number>()
  const matches = new Map<number, TokenMatch>()
  const usedSourceIndices = new Set<number>()
  let sourceCursor = -1

  serialized.tokens.forEach((token, serializedIndex) => {
    if (token.kind === 'code' || token.kind === 'fence-open' || token.kind === 'fence-close') return
    const positions = sourcePositions.get(token.signature) ?? []
    let positionIndex = nextPositionBySignature.get(token.signature) ?? 0
    while (positionIndex < positions.length && (positions[positionIndex] ?? -1) <= sourceCursor) {
      positionIndex += 1
    }
    const sourceIndex = positions[positionIndex]
    if (sourceIndex === undefined) return
    matches.set(serializedIndex, { exact: true, sourceIndex })
    usedSourceIndices.add(sourceIndex)
    sourceCursor = sourceIndex
    nextPositionBySignature.set(token.signature, positionIndex + 1)
  })

  for (const [serializedGroupIndex, sourceGroupIndex] of fenceGroupMatches) {
    const serializedGroup = serialized.fenceGroups[serializedGroupIndex]
    const sourceGroup = source.fenceGroups[sourceGroupIndex]
    if (!serializedGroup || !sourceGroup) continue

    matches.set(serializedGroup.openTokenIndex, { exact: true, sourceIndex: sourceGroup.openTokenIndex })
    usedSourceIndices.add(sourceGroup.openTokenIndex)
    if (serializedGroup.closeTokenIndex >= 0 && sourceGroup.closeTokenIndex >= 0) {
      matches.set(serializedGroup.closeTokenIndex, { exact: true, sourceIndex: sourceGroup.closeTokenIndex })
      usedSourceIndices.add(sourceGroup.closeTokenIndex)
    }

    const sourceCodePositions = new Map<string, number[]>()
    sourceGroup.codeTokenIndices.forEach((index) => {
      const token = source.tokens[index]
      if (!token) return
      const positions = sourceCodePositions.get(token.signature) ?? []
      positions.push(index)
      sourceCodePositions.set(token.signature, positions)
    })
    const nextCodePositionBySignature = new Map<string, number>()
    for (const serializedIndex of serializedGroup.codeTokenIndices) {
      const token = serialized.tokens[serializedIndex]
      if (!token) continue
      const positions = sourceCodePositions.get(token.signature) ?? []
      let positionIndex = nextCodePositionBySignature.get(token.signature) ?? 0
      while (positionIndex < positions.length && usedSourceIndices.has(positions[positionIndex]!)) {
        positionIndex += 1
      }
      const sourceIndex = positions[positionIndex]
      if (sourceIndex === undefined) continue
      matches.set(serializedIndex, { exact: true, sourceIndex })
      usedSourceIndices.add(sourceIndex)
      nextCodePositionBySignature.set(token.signature, positionIndex + 1)
    }
  }

  const exactAnchors = [...matches.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([serializedIndex, match]) => [serializedIndex, match.sourceIndex] as const)
  const anchors = [...exactAnchors, [serialized.tokens.length, source.tokens.length] as const]
  let previousSerialized = -1
  let previousSource = -1

  for (const [nextSerialized, nextSource] of anchors) {
    const availableSource = []
    for (let index = previousSource + 1; index < nextSource; index += 1) {
      if (!usedSourceIndices.has(index)) availableSource.push(index)
    }

    for (let index = previousSerialized + 1; index < nextSerialized; index += 1) {
      if (matches.has(index)) continue
      const canonicalToken = serialized.tokens[index]
      if (!canonicalToken) continue
      const sourcePosition = availableSource.findIndex((sourceIndex) => {
        const sourceToken = source.tokens[sourceIndex]
        return sourceToken !== undefined && canPairByShape(canonicalToken, sourceToken, fenceGroupMatches)
      })
      if (sourcePosition === -1) continue
      const sourceIndex = availableSource.splice(sourcePosition, 1)[0]
      if (sourceIndex === undefined) continue
      matches.set(index, { exact: false, sourceIndex })
      usedSourceIndices.add(sourceIndex)
    }

    previousSerialized = nextSerialized
    previousSource = nextSource
  }

  return matches
}

function renderToken(canonical: MarkdownToken, source: MarkdownToken, exact: boolean): string {
  if (exact) {
    if (canonical.kind !== 'fence-open' || canonical.payload === source.payload) return source.raw

    const sourceOpening = FENCE_RE.exec(source.raw)
    const canonicalOpening = FENCE_RE.exec(canonical.raw)
    if (!sourceOpening || !canonicalOpening) return canonical.raw
    return `${sourceOpening[1]}${sourceOpening[2]}${canonicalOpening[3]}`
  }
  if (canonical.shape !== source.shape) return canonical.raw

  if (canonical.kind === 'code') {
    return `${source.fenceIndent ?? ''}${canonical.payload}`
  }
  if (canonical.kind === 'heading'
    || canonical.kind === 'ordered-list'
    || canonical.kind === 'unordered-list'
    || canonical.kind === 'blockquote'
    || canonical.kind === 'text') {
    return `${source.prefix}${canonical.payload}`
  }
  return canonical.raw
}

function blankLinesInRange(scan: MarkdownScan, from: number, to: number): string[] {
  const start = Math.max(0, from)
  const end = Math.min(to, scan.lines.length)
  for (let index = start; index < end; index += 1) {
    if (scan.lineKinds[index] !== 'blank') return []
  }
  return scan.lines.slice(start, end)
}

function preservedBlankLines(sourceLines: string[], serializedCount: number): string[] {
  // Source blank lines are authoritative. At most one serializer separator is
  // allowed around newly inserted content; generated blank runs are never
  // copied into an existing source document.
  if (sourceLines.length > 0) return sourceLines
  return serializedCount > 0 ? [''] : []
}

function appendBlankLines(lines: string[], count: number): void {
  if (count > 0) lines.push('')
}

interface SourceLineAnchor {
  exact: boolean
  sourceIndex: number
}

function matchingLineSignature(line: string): string {
  const normalized = line.trim()
  if (!normalized) return ''

  return normalized
    .replace(/\\([\\`*_{}\x5b\x5d()#!~>|])/gu, '$1')
    .replace(/\[([^\x5d\n]+)\]\((?:<([^>\n]+)>|([^)\n]+))\)/gu, (match, label: string, angle: string | undefined, plain: string | undefined) => {
      const destination = angle ?? plain
      return label === destination ? label : match
    })
    .replace(/(`{3,}|~{3,})/u, '~~~')
    .replace(/^\d+[.)](?=[ \t]+)/u, '1.')
    .replace(/^[*+](?=[ \t]+)/u, '-')
    .replace(/&#x([0-9a-fA-F]+);/gu, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .trimEnd()
}

function matchingLineShape(line: string): string {
  if (!line.trim()) return 'blank'
  if (FENCE_RE.test(line)) return 'fence'
  if (HEADING_RE.test(line)) return 'heading'
  if (ORDERED_LIST_RE.test(line)) return 'ordered-list'
  if (UNORDERED_LIST_RE.test(line)) return 'unordered-list'
  if (BLOCKQUOTE_RE.test(line)) return 'blockquote'
  return 'text'
}

function buildSourceLineAnchors(source: MarkdownScan, serialized: MarkdownScan): Map<number, SourceLineAnchor> {
  const sourcePositions = new Map<string, number[]>()
  source.lines.forEach((line, index) => {
    const signature = matchingLineSignature(line)
    const positions = sourcePositions.get(signature) ?? []
    positions.push(index)
    sourcePositions.set(signature, positions)
  })

  const anchors = new Map<number, SourceLineAnchor>()
  const nextPositionBySignature = new Map<string, number>()
  let sourceCursor = -1
  serialized.lines.forEach((line, serializedIndex) => {
    const signature = matchingLineSignature(line)
    const positions = sourcePositions.get(signature) ?? []
    let positionIndex = nextPositionBySignature.get(signature) ?? 0
    while (positionIndex < positions.length && (positions[positionIndex] ?? -1) <= sourceCursor) {
      positionIndex += 1
    }
    const sourceIndex = positions[positionIndex]
    if (sourceIndex === undefined) return
    anchors.set(serializedIndex, { exact: true, sourceIndex })
    sourceCursor = sourceIndex
    nextPositionBySignature.set(signature, positionIndex + 1)
  })

  const exactSourceIndices = new Set(
    [...anchors.values()].map(anchor => anchor.sourceIndex),
  )
  const usedSourceIndices = new Set(exactSourceIndices)
  const exactAnchors = [...anchors.entries()].sort((left, right) => left[0] - right[0])
  const boundaries = [
    ...exactAnchors.map(([serializedIndex, anchor]) => [serializedIndex, anchor.sourceIndex] as const),
    [serialized.lines.length, source.lines.length] as const,
  ]
  let previousSerialized = -1
  let previousSource = -1

  for (const [nextSerialized, nextSource] of boundaries) {
    const availableSource: number[] = []
    for (let index = previousSource + 1; index < nextSource; index += 1) {
      if (!usedSourceIndices.has(index)) availableSource.push(index)
    }

    for (let index = previousSerialized + 1; index < nextSerialized; index += 1) {
      if (anchors.has(index)) continue
      const canonicalLine = serialized.lines[index]
      if (canonicalLine === undefined || matchingLineShape(canonicalLine) === 'blank') continue

      const sourcePosition = availableSource.findIndex((sourceIndex) => {
        const sourceLine = source.lines[sourceIndex]
        return sourceLine !== undefined
          && matchingLineShape(sourceLine) === matchingLineShape(canonicalLine)
      })
      if (sourcePosition === -1) continue
      const sourceIndex = availableSource.splice(sourcePosition, 1)[0]
      if (sourceIndex === undefined) continue
      anchors.set(index, { exact: false, sourceIndex })
      usedSourceIndices.add(sourceIndex)
    }

    previousSerialized = nextSerialized
    previousSource = nextSource
  }

  return anchors
}

function shouldUseSourceLineAnchors(
  source: MarkdownScan,
  serialized: MarkdownScan,
  anchors: Map<number, SourceLineAnchor>,
): boolean {
  const sourceContentLines = source.lines.filter(line => matchingLineSignature(line) !== '').length
  const serializedContentLines = serialized.lines.filter(line => matchingLineSignature(line) !== '').length
  const minimumContentLines = Math.min(sourceContentLines, serializedContentLines)
  if (minimumContentLines === 0) return false

  const matchedContentLines = [...anchors.entries()].filter(([serializedIndex, anchor]) => (
    matchingLineSignature(serialized.lines[serializedIndex] ?? '') !== ''
      && anchor.exact
  )).length
  if (matchedContentLines === 0) return false

  const coverage = matchedContentLines / Math.max(sourceContentLines, serializedContentLines)
  return coverage >= 0.75
    || (Math.max(sourceContentLines, serializedContentLines) <= 3
      && matchedContentLines >= Math.max(1, minimumContentLines - 1))
}

function renderAnchoredLine(canonical: string, source: string, exact: boolean): string {
  if (exact) return source

  const sourceFence = FENCE_RE.exec(source)
  const canonicalFence = FENCE_RE.exec(canonical)
  if (sourceFence && canonicalFence) {
    return `${sourceFence[1]}${sourceFence[2]}${canonicalFence[3]}`
  }

  const sourceHeading = HEADING_RE.exec(source)
  const canonicalHeading = HEADING_RE.exec(canonical)
  if (sourceHeading && canonicalHeading) {
    return `${sourceHeading[1]}${canonicalHeading[2]}${canonicalHeading[3]}${canonicalHeading[4]}`
  }

  const sourceOrdered = ORDERED_LIST_RE.exec(source)
  const canonicalOrdered = ORDERED_LIST_RE.exec(canonical)
  if (sourceOrdered && canonicalOrdered) return `${sourceOrdered[1]}${canonicalOrdered[2]}`

  const sourceUnordered = UNORDERED_LIST_RE.exec(source)
  const canonicalUnordered = UNORDERED_LIST_RE.exec(canonical)
  if (sourceUnordered && canonicalUnordered) return `${sourceUnordered[1]}${canonicalUnordered[2]}`

  const sourceBlockquote = BLOCKQUOTE_RE.exec(source)
  const canonicalBlockquote = BLOCKQUOTE_RE.exec(canonical)
  if (sourceBlockquote && canonicalBlockquote) {
    return `${sourceBlockquote[1]}${canonicalBlockquote[2]}`
  }

  const sourceIndent = /^[ \t]*/u.exec(source)?.[0] ?? ''
  return `${sourceIndent}${canonical.trimStart()}`
}

function mergeSourceLineAnchors(
  source: MarkdownScan,
  serialized: MarkdownScan,
  anchors: Map<number, SourceLineAnchor>,
): string {
  const merged: string[] = []
  let sourceLineCursor = -1
  let canonicalBlankLines = 0
  let canonicalContentSinceAnchor = false

  serialized.lines.forEach((line, lineIndex) => {
    const anchor = anchors.get(lineIndex)
    if (!anchor) {
      if (matchingLineShape(line) === 'blank') {
        canonicalBlankLines += 1
        return
      }
      appendBlankLines(merged, canonicalBlankLines)
      merged.push(line)
      canonicalBlankLines = 0
      canonicalContentSinceAnchor = true
      return
    }

    const sourceLine = source.lines[anchor.sourceIndex]
    if (sourceLine === undefined) return
    const sourceBlankLines = blankLinesInRange(source, sourceLineCursor + 1, anchor.sourceIndex)
    merged.push(...preservedBlankLines(
      sourceBlankLines,
      canonicalContentSinceAnchor ? canonicalBlankLines : 0,
    ))
    merged.push(renderAnchoredLine(line, sourceLine, anchor.exact))
    sourceLineCursor = anchor.sourceIndex
    canonicalBlankLines = 0
    canonicalContentSinceAnchor = false
  })

  const sourceTrailingBlankLines = blankLinesInRange(source, sourceLineCursor + 1, source.lines.length)
  merged.push(...preservedBlankLines(
    sourceTrailingBlankLines,
    canonicalContentSinceAnchor ? canonicalBlankLines : 0,
  ))
  const text = merged.join(source.newline)
  return source.hasTrailingNewline && text ? `${text}${source.newline}` : text
}

function mergeScans(source: MarkdownScan, serialized: MarkdownScan): string {
  const matches = buildTokenMatches(source, serialized)
  const merged: string[] = []
  let sourceLineCursor = -1
  let canonicalBlankLines = 0
  let canonicalContentSinceAnchor = false

  serialized.lines.forEach((line, lineIndex) => {
    const tokenIndex = serialized.tokenIndexByLine.get(lineIndex)
    if (tokenIndex === undefined) {
      if (serialized.lineKinds[lineIndex] === 'blank') canonicalBlankLines += 1
      return
    }

    const canonicalToken = serialized.tokens[tokenIndex]
    const match = matches.get(tokenIndex)
    if (!match) {
      appendBlankLines(merged, canonicalBlankLines)
      merged.push(line)
      canonicalBlankLines = 0
      canonicalContentSinceAnchor = true
      return
    }

    const sourceToken = source.tokens[match.sourceIndex]
    if (!sourceToken) {
      appendBlankLines(merged, canonicalBlankLines)
      merged.push(line)
      canonicalBlankLines = 0
      canonicalContentSinceAnchor = true
      return
    }

    const sourceBlankLines = blankLinesInRange(source, sourceLineCursor + 1, sourceToken.lineIndex)
    merged.push(...preservedBlankLines(
      sourceBlankLines,
      canonicalContentSinceAnchor ? canonicalBlankLines : 0,
    ))
    merged.push(renderToken(canonicalToken, sourceToken, match.exact))
    sourceLineCursor = sourceToken.lineIndex
    canonicalBlankLines = 0
    canonicalContentSinceAnchor = false
  })

  const sourceTrailingBlankLines = blankLinesInRange(source, sourceLineCursor + 1, source.lines.length)
  merged.push(...preservedBlankLines(
    sourceTrailingBlankLines,
    canonicalContentSinceAnchor ? canonicalBlankLines : 0,
  ))

  const text = merged.join(source.newline)
  return source.hasTrailingNewline && text ? `${text}${source.newline}` : text
}

/**
 * Merge a rich-editor serialization into the original Markdown layout.
 *
 * BlockNote necessarily serializes a normalized representation. This helper
 * keeps unchanged source lines and structural syntax, while applying changed
 * line payloads and intentional new lines from the editor result.
 */
export function preserveMarkdownSourceFormatting(source: string, serialized: string): string {
  if (source === serialized) return source
  const sourceScan = scanMarkdown(source)
  const serializedScan = scanMarkdown(serialized)
  if (sourceScan.tokens.length === 0 || serializedScan.tokens.length === 0) return serialized
  const sourceLineAnchors = buildSourceLineAnchors(sourceScan, serializedScan)
  if (shouldUseSourceLineAnchors(sourceScan, serializedScan, sourceLineAnchors)) {
    return mergeSourceLineAnchors(sourceScan, serializedScan, sourceLineAnchors)
  }
  return mergeScans(sourceScan, serializedScan)
}
