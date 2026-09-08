# CLAUDE.md — Remote Code Viewer

## The one principle

> **Build a window into the remote codebase, not another IDE.**

An ultra-light, mobile-first, **read-only** viewer that lets a developer inspect a
remote workspace from a phone while an AI agent works in it. If a change makes the
tool bigger, slower, or writable, it is wrong.

## The command that defines the product

```bash
cd ~/dev/my-project
npx @dynamia-tools/remote-code-viewer          # cwd as workspace
npx @dynamia-tools/remote-code-viewer /path    # explicit workspace
npx @dynamia-tools/remote-code-viewer --tunnel # + public HTTPS URL
```

Never regress this. Budgets: < 1 MB tarball, < 3 s cold start, < 60 MB RSS,
< 120 KB gzip initial SPA payload, **zero configuration**.

## Stack

| Layer | Choice | Note |
|---|---|---|
| Server | Node.js ≥ 20.10, ESM `.mjs`, **only `node:` builtins** | `dependencies` must stay `{}` |
| Frontend | Vue 3 + Vite 8 + Tailwind 4 | `devDependencies` only, built to `dist/web/` |
| Highlighting | highlight.js, grammar imported lazily per language | no auto-detection |
| Markdown | markdown-it with `html: false` | no sanitiser needed |
| Git | `spawn('git', …)`, read-only allowlist | context, not a client |
| Tunnel | `spawn('cloudflared', …)` | optional, off by default |
| Persistence | none | no database, no cache, no watcher |

Rejected and settled — do not re-propose: Go/Bun/Deno backends, Monaco, CodeMirror,
Shiki, tree-sitter, LSP, `vue-router`, Pinia, a component library, web fonts, any
database. Reasons in `docs/adr/` and `docs/roadmap.md`.

## Layout

```text
bin/remote-code-viewer.mjs   CLI entry: argv → server → tunnel → banner
src/server/
  config.mjs                 argv, defaults, ALL limits
  workspace.mjs              ★ THE SECURITY BOUNDARY
  server.mjs                 node:http router, auth, static, headers
  auth.mjs                   token generation + timing-safe compare
  git.mjs                    spawn wrapper, subcommand allowlist
  languages.mjs              ext → hljs id, lang → symbol regexes
  routes/                    tree, file, symbols, search, git
src/web/                     Vue SPA (built to dist/web/)
docs/                        architecture, design, security, api, roadmap, adr/
test/                        node:test
```

## Security rules — non-negotiable

Full detail in `docs/security.md`. The rules that get changes rejected:

1. **`workspace.mjs` is the only place a client string becomes a path.** Any
   `path.join`/`path.resolve` on request data anywhere else is a defect.
2. **`realpath` after `resolve`, then containment against `root + path.sep`.** Not
   `startsWith(root)` — that accepts `/home/me/project-secrets` for root
   `/home/me/project`. There is a test pinning this.
3. **Denied and non-existent both return `404` with an identical body.** Different
   responses turn the denylist into a filesystem-mapping oracle.
4. **No write syscall in `src/server/`.** No `writeFile`, `mkdir`, `unlink`,
   `rename`, `chmod`, `open('w')`. A test greps for them.
5. **Non-`GET`/`HEAD` → `405`** before routing.
6. **Git env is scrubbed and `GIT_OPTIONAL_LOCKS=0`** so even `git status` never
   writes the index. New subcommands go in the allowlist with a read-only
   justification. Client-derived values go after `--`.
7. **Token auth on by default.** `--no-token` only for loopback without `--tunnel`.
8. **Never send an absolute server path to the client.** `/api/meta` returns the
   workspace basename.
9. **`v-html` only for highlight.js and markdown-it output.** A third use is a
   review blocker.
10. **Every limit lives in `config.mjs`**, never hardcoded at a call site.

## Conventions

- ESM everywhere, `.mjs` on the server, `node:` prefix on builtins.
- Server route handlers take `(ctx, params)` and **return a plain object**; the
  router serialises. Handlers never touch `req`/`res` — that is what makes them
  testable without a socket.
- `ctx` carries `{ root, config, git }`. No module-level mutable state.
- Throw `HttpError(status, message)` for expected failures; the router maps it. The
  message reaching the client must be generic.
- No comments restating code. Comment only non-obvious *why* — especially in
  `workspace.mjs`, where every step of the algorithm has a reason.
- 2-space indent, single quotes, semicolons, no default exports on the server.
- Vue: `<script setup>`, composition API, Tailwind utilities in the template. No
  scoped-CSS-heavy components; if a rule cannot be a utility, it belongs in the one
  global stylesheet.
- Mobile-first: write the phone layout first, add `md:` for desktop. Never the
  reverse. 44px minimum touch targets.

## Testing

```bash
npm test              # node:test, server + boundary
npm run test:watch
npm run build         # build the SPA into dist/web
npm run dev           # server + vite dev server with API proxy
npm start             # run against the repo itself
```

The suite that must never go red:

- **Boundary tests** (`test/workspace.test.mjs`) — traversal (`../`, encoded,
  absolute, NUL), symlink escape, the `root + sep` off-by-one, denylist, sibling-dir
  prefix, dangling symlinks.
- **Read-only tests** — no write API imported in `src/server/`; non-GET → 405.
- **Zero-dependency test** — `package.json` `dependencies` is empty.
- **Language table test** — every id in `languages.mjs` is a real highlight.js
  grammar (the table is easy to get subtly wrong; this catches invented ids).
- **Smoke test** — boot the server on an ephemeral port against a fixture workspace
  and hit every route.

When touching `workspace.mjs`, add the failing test **first**. That file is the
product's safety property.

## No IDE Creep

Before adding anything, all four must pass (`docs/design.md` §6):

1. Does it answer *what does this file look like / what changed / where is this
   defined*?
2. Is it read-only?
3. What does it cost the cold `npx`? A runtime dependency is a very high bar.
4. Would you honestly just use VS Code for this?

Already rejected, with reasons in `docs/roadmap.md` — **do not implement, do not
"just add a small version of"**: editing, saving, a terminal, extensions, a
debugger, git write operations (commit/push/pull/merge/branch/stash/reset), LSP,
project management, collaboration/presence, user accounts, telemetry, a database, a
custom tunnel.

Git answers exactly three questions: *Where am I? What changed? What happened
recently?* Nothing more.

## Working in this repo

- GitHub Issues are the source of truth. Branch as `feat/<issue>-<slug>`, reference
  the issue in commits and the PR.
- Durable knowledge goes in `docs/`; a significant architectural decision gets an
  ADR in `docs/adr/`. Task status stays in the Issue.
- Before proposing a stack change, read the relevant ADR. They exist so decisions
  are not re-litigated from scratch.
