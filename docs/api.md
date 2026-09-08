# HTTP API

Read-only JSON API. Base path `/api`. `GET` (and `HEAD`) only — every other method
returns `405`.

## Conventions

- **Auth.** Every route except `/api/health` requires the token: `Authorization:
  Bearer <token>`, `?token=<token>`, or the `rcv_token` cookie. Missing or wrong →
  `401 {"error":"unauthorized"}`.
- **Paths.** The `path` parameter is always **relative to the workspace root**,
  POSIX-separated, no leading slash. `path` omitted or empty means the root.
  Rejected paths return `404` — indistinguishable from missing (security.md §6).
- **Errors.** `{"error":"<generic message>"}`. No paths, no errnos, no stacks.
- **Caching.** `Cache-Control: no-store` on all `/api/*`. The workspace changes
  under us; stale is worse than slow.
- **Encoding.** UTF-8 JSON. File content is sent as a JSON string with lone
  surrogates replaced.

---

## `GET /api/health`

Unauthenticated liveness probe.

```json
{ "ok": true }
```

---

## `GET /api/meta`

Everything the client needs at boot.

```json
{
  "version": "0.1.0",
  "workspace": { "name": "my-project" },
  "git": { "isRepo": true, "branch": "feat/payments" },
  "limits": { "maxFileSize": 2097152, "maxTreeEntries": 2000, "maxSearchResults": 300 },
  "readOnly": true
}
```

`workspace.name` is the **basename** only. The absolute path is never exposed.

---

## `GET /api/tree`

One directory listing. The tree is lazy: the client requests each directory as it
is expanded.

| Param | Type | Default | Notes |
|---|---|---|---|
| `path` | string | `""` | Directory relative to root |
| `hidden` | `0`\|`1` | `0` | `1` also returns the noise dirs (`node_modules`, `.git`, …) |

```json
{
  "path": "src/server",
  "entries": [
    { "name": "routes",       "type": "dir" },
    { "name": "server.mjs",   "type": "file", "size": 4821, "mtime": 1757280000000, "lang": "javascript" },
    { "name": "workspace.mjs","type": "file", "size": 3140, "mtime": 1757280000000, "lang": "javascript" }
  ],
  "truncated": false
}
```

Directories sort before files, then case-insensitive by name. Symlinks that resolve
outside the workspace are omitted entirely — they are not reported as entries.
`truncated: true` means the listing hit `maxTreeEntries`.

Errors: `404` (missing, denied, or not a directory).

---

## `GET /api/file`

| Param | Type | Default | Notes |
|---|---|---|---|
| `path` | string | — | Required |

```json
{
  "path": "src/server/server.mjs",
  "name": "server.mjs",
  "size": 4821,
  "mtime": 1757280000000,
  "lang": "javascript",
  "lines": 187,
  "binary": false,
  "truncated": false,
  "content": "import http from 'node:http';\n…"
}
```

- `binary: true` → `content` is `null`. Detected by a NUL byte in the first 8 KiB.
- `size > maxFileSize` → `413 {"error":"file too large"}` with the metadata still
  present, so the UI can show the size it refused.
- `truncated: true` → content was cut at the byte cap on a file whose size grew
  mid-read.
- `lang` is a highlight.js language id, or `"plaintext"`.

Errors: `400` (no path), `404`, `413`.

---

## `GET /api/symbols`

Regex-derived outline. Deliberately heuristic: this is a table of contents, not a
language server (ADR-0005).

| Param | Type | Notes |
|---|---|---|
| `path` | string | Required |

```json
{
  "path": "src/server/git.mjs",
  "lang": "javascript",
  "symbols": [
    { "name": "ALLOWED", "kind": "constant", "line": 12 },
    { "name": "runGit",  "kind": "function", "line": 31 },
    { "name": "branch",  "kind": "function", "line": 78 }
  ]
}
```

An unsupported language returns `symbols: []`, not an error.

---

## `GET /api/search`

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Required, 2–200 chars |
| `kind` | `text`\|`path` | `text` | |
| `path` | string | `""` | Restrict to a subtree |
| `max` | int | `300` | Capped at `maxSearchResults` |
| `case` | `0`\|`1` | `0` | `1` = case-sensitive |

`kind=text`:

```json
{
  "query": "resolveInWorkspace",
  "kind": "text",
  "engine": "git-grep",
  "results": [
    { "path": "src/server/routes/file.mjs", "line": 14, "text": "  const { abs } = await resolveInWorkspace(ctx, params.path);" }
  ],
  "truncated": false
}
```

`engine` is `"git-grep"` inside a git repository (respects `.gitignore`, skips
binaries) or `"scan"` for the bounded native walker. The client shows which ran,
because the result sets genuinely differ.

`kind=path`:

```json
{ "query": "workspace", "kind": "path", "engine": "index",
  "results": [ { "path": "src/server/workspace.mjs", "score": 12 } ],
  "truncated": false }
```

Errors: `400` (missing/short/long `q`). A search that times out returns `200` with
`truncated: true` and whatever was found.

---

## `GET /api/git/branch`

```json
{ "isRepo": true, "branch": "feat/payments", "detached": false,
  "head": "a82c1f2", "ahead": 2, "behind": 0, "dirty": true }
```

Non-repo: `{ "isRepo": false }` with `200`. Not an error — plenty of workspaces are
not repositories.

## `GET /api/git/commits`

| Param | Default | Max |
|---|---|---|
| `limit` | 20 | 100 |

```json
{ "isRepo": true, "commits": [
  { "hash": "a82c1f2e…", "short": "a82c1f2", "author": "Mario Serrano",
    "date": "2026-09-07T18:20:11Z", "relative": "18 hours ago",
    "subject": "Refactor payment service" }
] }
```

## `GET /api/git/status`

```json
{ "isRepo": true, "files": [
  { "path": "src/server/git.mjs", "index": "M", "worktree": " ", "staged": true },
  { "path": "docs/api.md",        "index": "?", "worktree": "?", "staged": false }
] }
```

`index`/`worktree` are raw `git status --porcelain=v1` XY codes. Renames expose an
extra `from`.

## `GET /api/git/diff`

| Param | Type | Default | Notes |
|---|---|---|---|
| `path` | string | `""` | Empty = whole working tree |
| `staged` | `0`\|`1` | `0` | `1` = `--cached` |
| `context` | int | `3` | 0–10 |

```json
{ "isRepo": true, "path": "src/server/git.mjs", "staged": false,
  "diff": "diff --git a/src/server/git.mjs …", "truncated": false }
```

Unified diff as raw text; the client parses it for the side-by-side/inline view.
`truncated: true` when the output hit the git output cap.

---

## Non-API routes

| Route | Behaviour |
|---|---|
| `/` and any unknown non-`/api` path | `index.html` (SPA fallback), with the CSP and hardening headers of security.md §7 |
| `/assets/*` | Hashed bundle assets, `Cache-Control: public, max-age=31536000, immutable` |

## Status codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `400` | Malformed parameter |
| `401` | Missing or invalid token |
| `404` | Not found, not a directory/file, **or denied** |
| `405` | Method other than GET/HEAD |
| `413` | File exceeds the read limit |
| `429` | Rate limit exceeded (`Retry-After` set) |
| `500` | Unexpected server error (cause logged locally only) |
