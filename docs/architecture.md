# Architecture

> Build a window into the remote codebase, not another IDE.

## 1. Shape of the system

Remote Code Viewer is **one Node.js process** serving a **static Vue SPA** and a
**read-only JSON API** over the local filesystem, optionally published through
`cloudflared`.

```text
        Remote Linux dev box
        ────────────────────

  AI agent (Claude Code, …)
        │ writes
        ▼
  Workspace  ~/dev/my-project        ← the security boundary
        │ reads (read-only)
        ▼
  ┌──────────────────────────────────────────┐
  │ node process  (one, stateless)           │
  │                                          │
  │  bin/remote-code-viewer.mjs   CLI        │
  │  src/server/server.mjs        router     │
  │  src/server/workspace.mjs     BOUNDARY   │
  │  src/server/git.mjs           spawn git  │
  │  dist/web/                    SPA bundle │
  └───────────────┬──────────────────────────┘
                  │ 127.0.0.1:8765
                  ▼
           cloudflared  (optional child process)
                  │
                  ▼
      https://<random>.trycloudflare.com
                  │
                  ▼
            📱 mobile browser
```

There is no database, no cache server, no queue, no worker pool, no watcher, no
websocket. Adding any of those requires an ADR.

## 2. Non-negotiable properties

| Property | Enforced by |
|---|---|
| Read-only | No write syscall anywhere; HTTP verbs other than `GET`/`HEAD` return `405`; `GIT_OPTIONAL_LOCKS=0` so even `git status` never touches the index |
| Zero runtime dependencies | `dependencies: {}` in `package.json`, asserted by a test |
| Workspace is the filesystem boundary | Every path passes `resolveInWorkspace()` — see [security.md](./security.md) |
| Fast `npx` | Published tarball is the server sources + prebuilt SPA; nothing to compile or download on install |
| Stateless | No process holds user state; restart is free. The only in-memory state is the auth token, a rate-limit window and a bounded path index |

## 3. Runtime choice

Node.js, with **zero runtime dependencies**. `npx` is the mandated entry point,
so Node is the launcher regardless of what the server is written in; writing the
server in Go or Rust would only add per-platform binaries and cross-compile CI to
an application that is entirely I/O bound. Vue, Vite, Tailwind, highlight.js and
markdown-it are `devDependencies` — they are compiled into `dist/web/` at publish
time and never installed on the remote box.

See [ADR-0001](./adr/0001-nodejs-zero-dependency-backend.md).

## 4. Module map

### `bin/remote-code-viewer.mjs`
Shebang entry. Parses argv, resolves the workspace, starts the server, optionally
spawns the tunnel, prints the banner, wires `SIGINT`/`SIGTERM`. No business logic.

### `src/server/config.mjs`
Pure argv → config. Owns defaults and all limits. No I/O except `realpath` of the
workspace root.

### `src/server/workspace.mjs` — the security boundary
The only module allowed to turn a client-supplied string into an absolute path.
Everything else receives an already-validated path. See
[security.md](./security.md) for the algorithm.

### `src/server/server.mjs`
`node:http` server. A flat route table, `auth` in front of every `/api/*` route
except `/api/health`, then static assets with SPA fallback.

### `src/server/routes/*.mjs`
One module per resource (`tree`, `file`, `symbols`, `search`, `git`). Each exports
handlers that take `(ctx, params)` and return a plain object, which the router
serialises. Handlers never touch `req`/`res` directly, which keeps them trivially
unit-testable.

### `src/server/git.mjs`
`spawn('git', ['-C', root, …])` with `shell: false`, a subcommand **allowlist**, a
scrubbed environment, a timeout and an output cap. Git is context, never a client.

### `src/server/languages.mjs`
Pure data: extension → highlight.js language id, and language → symbol regexes.

### `src/web/`
Vue 3 SPA. No `vue-router`, no state library — a ~40-line hash router and
`reactive()` are enough for four views.

## 5. Request lifecycle

```text
GET /api/file?path=src/main.js
  │
  ├─ method guard          GET/HEAD only, else 405
  ├─ rate limit            per-IP sliding window
  ├─ auth                  Bearer | ?token= | rcv_token cookie
  ├─ resolveInWorkspace()  normalise → realpath → containment → denylist
  ├─ stat                  size guard
  ├─ read                  bounded read, binary sniff
  └─ 200 application/json  { path, lang, lines, content, … }
```

Any failure short-circuits to a JSON error with a generic message; the real cause
is logged server-side only, never returned (see [security.md](./security.md) §6).

## 6. Frontend architecture

Four views, one shell:

| View | Purpose |
|---|---|
| `tree` | Lazy per-directory file tree (drawer on mobile, rail ≥`md`) |
| `file` | Code with highlighting + line numbers, or rendered Markdown; symbol outline |
| `search` | Path and content search, full-screen on mobile |
| `git` | Branch, recent commits, working-tree status and diff |

Highlighting is client-side: the server ships plain text (small payload) and the
client lazily `import()`s only the highlight.js grammar for the language actually
opened. See [ADR-0003](./adr/0003-highlightjs-lazy-grammars.md).

Markdown is rendered with markdown-it configured `html: false`, so raw HTML inside
a repository's Markdown is escaped rather than executed. That removes the need for
a sanitiser dependency — see [ADR-0002](./adr/0002-vue-vite-tailwind-frontend.md).

## 7. What is deliberately absent

No editing, no terminal, no LSP, no debugger, no extensions, no git write
operations, no auth provider, no multi-user model, no telemetry, no database, no
file watcher, no server-side rendering, no service worker.

Read [design.md](./design.md) §6 before proposing a feature.
