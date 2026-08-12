---
type: ADR
id: "0176"
title: "Tokenized full-text search with bounded result reporting"
status: active
date: 2026-08-12
---

## Context

ADR-0009 established keyword-only search as a case-insensitive substring match
against note titles and content. That contract was intentionally simple, but it
made multi-word queries brittle: the exact phrase had to occur contiguously,
and a filename match was not searchable. The renderer also capped each search
request at 20 results without telling the user that the list was incomplete.

## Decision

Keep search keyword-only and scan Markdown files directly with `walkdir`, but
match queries as Unicode-whitespace-delimited tokens. Every token must occur in
at least one of the filename stem, derived title, or searchable content. Token
matching remains case-insensitive. The filename stem participates in relevance
scoring at least as strongly as a content match, while content snippets are
centered on the first query token found in searchable content.

The native search command defaults to a maximum of 200 returned results and
reports the total number of matches before truncation. The renderer combines
vault responses, keeps the same 200-result display cap, and shows a localized
footer only when the displayed list is truncated.

## Options considered

- **Chosen:** tokenized AND matching with filename-aware scoring and an explicit
  result total. This improves multi-word and filename discovery without adding
  an index or changing the keyword-only architecture.
- **Retain whole-query substring matching:** rejected because terms split across
  lines or separated by punctuation/whitespace cannot be found reliably.
- **Add fuzzy or semantic indexing:** rejected because it would reintroduce the
  operational and packaging costs removed by ADR-0009.

## Consequences

- Queries containing multiple terms find notes when each term is present, even
  when the terms are not adjacent.
- Empty or whitespace-only queries produce no results.
- Filename-only matches can be discovered and ranked, but have no content
  snippet.
- Search remains bounded for the UI while users can distinguish a complete
  result list from a truncated one.
- The matching contract in ADR-0009 is superseded; its keyword-only,
  no-semantic-indexing decision remains the architectural constraint.

## Re-evaluation trigger

Revisit this decision if vaults large enough to make direct scans consistently
slow, or user feedback shows tokenized keyword search is insufficient for
cross-note discovery. Any replacement should preserve the explicit truncation
signal and avoid silently restoring semantic indexing.
