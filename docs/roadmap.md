# Roadmap

Ordered by whether it serves the three questions in [design.md](./design.md) §2.
Anything not listed here has either not been considered or has already been
rejected (§ Rejected).

## v0.1 — Foundation (issue #1)

The smallest thing for which `npx @dynamia-tools/remote-code-viewer` is genuinely
useful.

- [x] Architecture, design, security, API docs and ADRs
- [x] `CLAUDE.md`
- [x] `workspace.mjs` filesystem boundary + boundary tests
- [x] `config.mjs`: argv, defaults, limits
- [x] Token auth, rate limit, hardening headers
- [x] `GET /api/{health,meta,tree,file,symbols,search}`
- [x] `GET /api/git/{branch,commits,status,diff}`
- [x] Read-only git wrapper with subcommand allowlist
- [x] Vue 3 SPA: tree, viewer + highlighting, outline, search, Markdown, git panel
- [x] Mobile-first shell (drawer / bottom sheet / hash router)
- [x] `--tunnel` via `cloudflared` with binary detection
- [x] `npm publish` pipeline: build SPA on `prepublishOnly`, ship zero runtime deps

**Done when:** on a clean remote box with only Node installed,
`cd ~/dev/x && npx @dynamia-tools/remote-code-viewer --tunnel` prints an HTTPS URL
that opens a usable viewer on a phone.

## v0.2 — Sharper reading

- [x] `.gitignore`-aware tree — shipped as a dim/italic visual cue via a batched
      `git check-ignore -- <paths>` per listed directory (not `--stdin` + a cache,
      the simpler form was enough); still shows the entries, doesn't filter them,
      so the static hidden-dir list stays in place too
- [ ] Virtualised code rendering, so a 50 000-line file scrolls on a phone
- [ ] Soft-wrap toggle, font-size control, theme override — persisted
- [ ] Deep links to a line (`#/file/src/x.js:120`) and line-range selection
- [ ] Diff view: per-file collapse, inline/split toggle, jump to hunk
- [ ] Recent files list (client-side only)

## v0.3 — Remote access polish

- [ ] Named Cloudflare tunnel support (`--tunnel-name`), documented Access setup
- [ ] `cloudflared` auto-download prompt when the binary is absent
- [ ] `--qr` — print a QR code of the URL to the terminal, since the target device
      is a phone and the URL contains a 43-character token
- [ ] Graceful tunnel reconnect with the URL preserved

## v0.4 — Selective additions

- [x] Image preview (`png/jpg/gif/webp/bmp/ico/avif`) — shipped as base64 inside
      the existing `/api/file` response, rendered via a `data:` URI (CSP already
      allows it), so no new route was needed; `svg` stays text, shown highlighted
      rather than rendered as an image
- [ ] `.rcvignore` for per-project hide/deny rules
- [ ] Multiple workspaces in one process (`--workspace name=path`)
- [ ] Project stats: language breakdown, file count, repo size

## Under consideration — not committed

Each needs an ADR and must pass the No IDE Creep test in design.md §6.

- **Live updates.** An SSE channel pushing "file changed" so the agent's edits
  appear without a refresh. Tempting and on-brand, but it means a file watcher,
  which means `fs.watch` reliability across platforms, debouncing and per-client
  state. Would have to prove it beats pull-to-refresh.
- **PWA install / offline shell.** Nice on a phone. A service worker caching a
  workspace that a live agent is rewriting is a correctness hazard; shell-only
  caching might be acceptable.
- **Agent-facing endpoint.** A `/api/context` that returns a compact repo summary
  for an agent to consume. Interesting, and adjacent to the product's reason for
  existing, but it is a different product.

## Rejected

Recorded so they are not proposed again. See design.md §6 for the test they fail.

| Rejected | Why |
|---|---|
| Code editing / save | Breaks the read-only guarantee this tool is trusted for |
| Web terminal | It is a remote shell with extra steps; use SSH |
| Git write operations (commit/push/branch) | Git is context, not a client |
| Monaco editor | ~2 MB of an editor for a viewer with no editing |
| CodeMirror 6 | ~200 KB of editor, and the natural on-ramp to IDE creep |
| Shiki | Best-in-class highlighting, but oniguruma WASM + TextMate grammars are the wrong shape for a phone |
| tree-sitter navigation | One WASM per language; regex outline is 5% of the cost for 80% of the value |
| Extensions / plugin API | A plugin API is a promise to stay small forever, broken |
| Debugger | Not a debugger |
| Any database | There is no state worth persisting |
| Auth provider / user accounts | One token, or Cloudflare Access. Not an identity system |
| Collaboration / presence | One developer looking at their own agent's work |
| Telemetry | Points at proprietary source; sends nothing, ever |
| Custom tunnel implementation | `cloudflared` exists and is better than what we would write |
