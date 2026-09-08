# Security

The threat model is blunt: **the workspace usually contains proprietary source
code, and the viewer is often published on a public HTTPS URL.** Everything below
follows from that.

## 1. Threat model

| Adversary | Capability | Mitigation |
|---|---|---|
| Anyone who learns the tunnel URL | Full HTTP access | Token auth on by default (§3) |
| A malicious `?path=` value | Path traversal, absolute paths, NUL bytes | `resolveInWorkspace()` (§2) |
| A symlink inside the workspace | Escape to `/etc`, `~/.ssh`, `/proc` | `realpath` containment (§2) |
| Secrets that legitimately live in the tree | `.env`, `id_rsa`, `*.pem` | Denylist, deny-before-read (§4) |
| A scraper enumerating the tree | Exfiltrate the whole repo, exhaust I/O | Rate limit + size/entry caps (§5) |
| A repository's own content | XSS via Markdown/filenames | `html: false`, no `v-html` of untrusted input, CSP (§7) |
| The viewer itself | Mutating a workspace an agent is editing | No write paths, `GIT_OPTIONAL_LOCKS=0` (§8) |

Out of scope: a hostile local user on the same box (they already have the files),
and Cloudflare itself.

## 2. The filesystem boundary

`src/server/workspace.mjs` is the **only** module permitted to convert a
client-supplied string into an absolute path. Every route receives an
already-validated absolute path. Reviewers: treat any `path.join`/`path.resolve` on
request data outside this module as a defect.

At startup the workspace root is resolved once:

```js
const root = await fs.realpath(path.resolve(argPath));
```

Then, for every request path:

```text
1. reject if it contains a NUL byte                      → 400
2. reject if longer than 4096 bytes                      → 400
3. decode, then normalise to POSIX separators
4. reject if path.isAbsolute() or starts with a drive letter
5. abs = path.resolve(root, normalisedRelative)
6. real = await fs.realpath(abs)          ← resolves EVERY symlink in the chain
7. require real === root || real.startsWith(root + path.sep)   → else 404
8. relative = path.relative(root, real)
9. run the denylist over relative's segments              → 404 if denied
10. return { abs: real, rel: relative }
```

Why this order matters:

- **`realpath` after `resolve`, not before.** Resolving first collapses `..`
  lexically; `realpath` then resolves every intermediate symlink, so a symlink
  `link → /etc` cannot be laundered through `link/passwd`. Checking containment on
  the *lexical* path would accept it.
- **Containment uses `root + path.sep`.** A bare `startsWith(root)` accepts
  `/home/me/project-secrets` when the root is `/home/me/project`. This is the
  classic off-by-one in this check and there is a test pinning it.
- **The denylist runs on the post-`realpath` relative path**, so a symlink named
  `notes.txt` pointing at `.env` inside the workspace is still denied.
- **`ENOENT` from `realpath` is a 404**, which is also what a denied path returns
  (§6), so probing cannot distinguish "absent" from "forbidden".

A dangling symlink, a socket, a FIFO, a device or a directory where a file was
expected all fail closed.

## 3. Authentication

**On by default.** A 256-bit token from `crypto.randomBytes(32)`, base64url-encoded,
is generated at startup and printed as part of the URL:

```text
  Local:   http://127.0.0.1:8765/?token=k7Qx…
  Tunnel:  https://polite-otter-1234.trycloudflare.com/?token=k7Qx…
```

Accepted, in order: `Authorization: Bearer <token>`, `?token=<token>`, then the
`rcv_token` cookie. On a successful query-string hit the server sets
`rcv_token` as `HttpOnly; SameSite=Strict; Path=/` (plus `Secure` when the request
arrived over HTTPS) and the client strips the token from the visible URL, so it
stops appearing in shared screenshots and in `Referer`.

Comparison is `crypto.timingSafeEqual` on equal-length buffers.

`/api/health` is the only unauthenticated route: it returns `{"ok":true}` and
nothing else, so `cloudflared` and uptime probes work without a credential.

`--no-token` disables auth and is refused unless the bind host is a loopback
address and `--tunnel` is not set. Publishing source code on a public URL by
forgetting a flag is not a failure mode we are willing to ship.

The token lives only in process memory. It is never written to disk, never logged.

## 4. Denylist

Deny is evaluated **before any read** and applies to every path segment of the
post-`realpath` relative path.

Denied outright (`404`), because these are credentials, not code:

```text
directories:  .ssh .gnupg .aws .azure .kube .docker .gcloud .config/gh
              .config/gcloud .password-store
files:        .netrc .npmrc .pypirc .git-credentials .htpasswd .dockercfg
              id_rsa id_dsa id_ecdsa id_ed25519 (and .pub-less variants)
patterns:     .env and .env.* (except .env.example/.sample/.template/.dist)
              *.pem *.key *.p12 *.pfx *.jks *.keystore *.ppk *.asc *.gpg *.kdbx
              *service-account*.json  *credentials*.json
```

`.git/` is denied as a *raw* path — its contents are exposed only through the
curated `/api/git/*` endpoints. Reading `.git/config` raw would leak remote URLs
with embedded tokens.

Hidden from tree listings but still readable when requested explicitly, because
they are noise rather than secrets: `node_modules`, `.git`, `.svn`, `.hg`,
`__pycache__`, `.venv`, `venv`, `.mypy_cache`, `.pytest_cache`, `.ruff_cache`,
`.gradle`, `.tox`, `.idea`, `.DS_Store`.

The denylist is a **defence in depth**, not the boundary. The boundary is §2. A
project that keeps secrets in an unusual filename is still exposed, which is why
the README tells users not to point this at a directory holding credentials.

## 5. Resource limits

Every limit is a constant in `config.mjs`, overridable by flag, and enforced
server-side:

| Limit | Default | Why |
|---|---|---|
| File read size | 2 MiB | A 2 GB log must not be buffered into memory |
| Directory entries | 2 000 | `node_modules` listings would otherwise stall a phone |
| Search results | 300 | Bounded response |
| Search duration | 2 s | `git grep` and the fallback scan both get killed |
| Search scan files | 20 000 | Fallback scan cannot walk a monorepo forever |
| Path index size | 50 000 | Bounded memory for path search |
| Git output | 4 MiB | A huge diff must not OOM the process |
| Git duration | 5 s | No hung child processes |
| Requests per IP | 240 / min | Slows bulk exfiltration to something noticeable |
| Query string length | 4 KB | Cheap parser guard |

Reads are streamed with an explicit byte cap rather than `readFile`, so an
adversarially large file is never fully buffered.

## 6. Uniform errors

Responses are `{"error":"<generic message>"}` with a status of `400`, `401`, `404`,
`405`, `413`, `429` or `500`. They never include an absolute path, an `errno`, a
stack trace, or a hint about *why* a path was rejected.

**Denied and non-existent paths both return `404` with the identical body.** This
is intentional: distinguishable responses turn the denylist into an oracle for
mapping the filesystem.

The absolute workspace path is never sent to the client. `/api/meta` returns only
the workspace **basename**.

## 7. Client-side

- markdown-it runs with `html: false` and `linkify: true`, so raw HTML in a
  repository's Markdown is escaped. No sanitiser dependency, no
  `dangerouslySetInnerHTML`-shaped hole.
- `v-html` is used in exactly two places — highlighted code and rendered Markdown —
  and both inputs are produced by highlight.js / markdown-it, which escape their
  input. Any third use is a review blocker.
- Markdown links get `rel="noopener noreferrer"`; `javascript:` and `data:` schemes
  are stripped. Relative image sources are not resolved in v0.1 — they render as
  broken rather than as a path-probing side channel.
- A CSP header is sent with the SPA: `default-src 'self'; img-src 'self' data:;
  style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self';
  frame-ancestors 'none'; base-uri 'none'`. Plus `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`.
- Static assets are served with an extension→MIME allowlist. An unknown extension
  is `application/octet-stream` with `Content-Disposition: attachment`.

## 8. Read-only enforcement

Three independent layers:

1. **HTTP.** Anything other than `GET` or `HEAD` returns `405` before routing.
2. **Code.** The server imports no write API. There is no `writeFile`, `mkdir`,
   `unlink`, `rename`, `chmod` or `open('w')` anywhere in `src/server/`, and a test
   greps for them.
3. **Git.** Subcommands are allowlisted to `rev-parse`, `symbolic-ref`, `log`,
   `status`, `diff`, `show`, `ls-files`, `grep`, `for-each-ref`, `describe`. The
   environment is scrubbed to `PATH`/`HOME`/`LANG` plus:
   - `GIT_OPTIONAL_LOCKS=0` — so `git status` never refreshes (writes) the index
   - `GIT_TERMINAL_PROMPT=0` and `GIT_ASKPASS=true` — never block on credentials
   - `GIT_CONFIG_NOSYSTEM=1` — ignore system config, including aliases
   - `GIT_PAGER=cat`, `--no-pager`
   Arguments are passed as an array with `shell: false`. Any client-derived value
   is passed after `--` so it can never be read as a flag.

## 9. Deployment guidance

- Default bind is `127.0.0.1`. `--host 0.0.0.0` prints a warning.
- The intended remote path is a Cloudflare tunnel, not an inbound firewall hole.
- A quick tunnel URL is public and appears in logs. For anything long-lived, front
  a named tunnel with **Cloudflare Access** and keep the token as a second factor.
- Do not point the viewer at `$HOME` or `/`. The startup path refuses `/` and warns
  on `$HOME`.
- Ctrl-C tears down the tunnel child process; nothing is left listening.

## 10. Reviewer checklist

- [ ] No `path.join`/`path.resolve` on request data outside `workspace.mjs`
- [ ] No new write syscall in `src/server/`
- [ ] New git subcommand added to the allowlist *and* justified as read-only
- [ ] New route registered behind `auth`
- [ ] New response field does not leak an absolute path
- [ ] New limit added to `config.mjs`, not hardcoded at the call site
- [ ] Errors still uniform: denied and missing are indistinguishable
- [ ] `npm test` passes, including the boundary tests
