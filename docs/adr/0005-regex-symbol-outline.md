# ADR-0005 — Regex symbol outline instead of a language server

**Status:** Accepted · 2026-09-08

## Context

The brief asks for "lightweight code navigation". That phrase spans everything from
a file outline to full go-to-definition across a monorepo. The cost difference
between those endpoints is three orders of magnitude.

On a phone, the realistic navigation need is: *this file is 800 lines, take me to
the method I care about.*

## Decision

A per-language table of conservative single-line regexes in
`src/server/languages.mjs`, run server-side over the file already being read,
returning `{ name, kind, line }[]`. Presented as an outline panel (bottom sheet on
mobile, right rail on desktop).

Constraints on the patterns: anchored with `^[ \t]*`, no lookbehind, capture group 1
is the name, `gm` flags, and the result set is capped and deduplicated by
`line:name`.

Unsupported language → `symbols: []`, never an error.

No cross-file resolution: no go-to-definition, no find-references, no import graph.

## Consequences

**Good**

- ~100 lines of code, zero dependencies, no index, no cache, no warm-up, and it
  works on the first file opened in a repository of any size or language.
- Adding a language is a table entry, contributable without understanding the
  codebase.
- Cost is bounded by the file being viewed, which is already bounded by the read
  limit. There is no repository-wide indexing pass to make a large monorepo unusable.

**Bad / accepted**

- It is heuristic. It will miss symbols behind unusual formatting (multi-line
  signatures, decorators, generics spanning lines) and will occasionally report a
  false positive. The outline is a table of contents, not an index — the UI must not
  imply otherwise.
- No nesting: the outline is flat, so a class and its methods appear as siblings.
  Acceptable, and honest about the underlying mechanism.
- Cross-file navigation is covered by search (`/api/search`), not by symbol
  resolution. Tapping a symbol name to "find usages" is really a text search, and it
  will be labelled as one.

## Alternatives considered

**tree-sitter (WASM).** Real ASTs, accurate outlines, and a plausible path to
definitions. Rejected: one WASM grammar per language, hundreds of KB each, plus
build complexity — for a viewer whose entire budget is 120 KB. It also invites the
follow-on features (references, rename) that the No IDE Creep test exists to stop.

**A real language server (LSP).** Correct navigation. Rejected outright: it means
running a language toolchain per project on the box, minutes of indexing, hundreds
of MB of RSS, and process supervision. That is an IDE.

**ctags / universal-ctags.** Cheap and good, and would give cross-file definitions.
Rejected because it is an external binary the user must install, which breaks the
"only Node needed" property of ADR-0001. Worth reconsidering as an *optional*
enhancement if it is present.

**Client-side regex.** Same patterns, run in the browser. Rejected: it duplicates
the language table on both sides, and the server has already read the file.
