# ADR-0003 — highlight.js with lazily imported grammars

**Status:** Accepted · 2026-09-08

## Context

Syntax highlighting is the feature users judge the tool on, and also the easiest
place to accidentally ship a megabyte to a phone on a mobile connection.

Two axes: which library, and where highlighting runs.

## Decision

**Library:** highlight.js `^11`, with **no** auto-detection and **no** `import
'highlight.js'` barrel. The registry starts empty; opening a file triggers
`import('highlight.js/lib/languages/<id>')` for that language only, and the result
is cached for the session. The server tells the client the language id (derived from
the extension in `languages.mjs`), so detection never runs.

**Where:** on the client. The server sends plain text.

**Theme:** a hand-trimmed theme expressed as ~1.5 KB of CSS custom properties rather
than one of the upstream themes, so light/dark is a variable swap.

## Consequences

**Good**

- Initial cost is highlight.js core only, ~22 KB gzip. Each grammar is 2–6 KB gzip,
  fetched once, only if used. A session that opens JS and Markdown never downloads
  the Java grammar.
- Plain-text payloads are roughly 3–5× smaller over the wire than server-rendered
  `<span>` markup — the difference is very visible over a tunnel.
- Highlighting cost lands on the phone's idle CPU, not the box the agent is
  compiling on.
- Files that are too large or binary skip highlighting entirely with no special case.

**Bad / accepted**

- Highlighting quality is below Shiki/VS Code: highlight.js grammars are regex-based
  and get confused by heavily nested template literals, JSX in `.js`, and Vue SFCs
  (a `.vue` file is highlighted as XML, so its `<script>` body is under-coloured).
  Acceptable for reading; noted in the roadmap.
- A per-language `import()` is one extra request on first open of a new language.
  Mitigated by the session cache and by Vite emitting each grammar as its own hashed
  chunk.
- Large files still need virtualised rendering to be smooth on a phone. That is a
  rendering problem, not a highlighting one — roadmap v0.2.

## Alternatives considered

**Shiki.** Best highlighting available, same grammars as VS Code. Rejected: even
with a fine-grained bundle it needs oniguruma WASM (~200 KB) plus multi-hundred-KB
TextMate grammar JSON. Wrong shape for the primary client.

**CodeMirror 6, read-only.** Would hand us virtual scrolling — the one thing we
actually lack. Rejected on two counts: ~150–250 KB for an editor whose editing we
discard, and it is the most likely on-ramp to IDE creep (once CodeMirror is in the
bundle, "just enable editing" is a one-line diff).

**Prism.** Comparable size, but a thinner maintenance story and worse language
coverage for the JVM languages Dynamia works in.

**Server-side highlighting.** Would let us cache highlighted output and drop the
client library. Rejected: inflates payloads 3–5×, burns CPU on the dev box, and
couples the render to a server restart.
