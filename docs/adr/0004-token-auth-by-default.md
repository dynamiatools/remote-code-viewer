# ADR-0004 — Token authentication enabled by default

**Status:** Accepted · 2026-09-08

## Context

The flagship flow publishes the viewer on a Cloudflare quick tunnel:

```text
https://polite-otter-1234.trycloudflare.com
```

That URL is public. It is resolvable by anyone, it lands in Cloudflare's logs, and
`*.trycloudflare.com` hostnames are enumerable in practice via certificate
transparency logs. Behind it sits a complete, readable copy of proprietary source
code.

A viewer that is unauthenticated by default would leak source code whenever a user
forgot a flag. That is not an acceptable default for this product.

## Decision

Authentication is **on by default**, using the Jupyter model:

- `crypto.randomBytes(32)`, base64url — 256 bits, generated per process start.
- Printed as part of the URL the user is told to open, so there is no separate step.
- Accepted via `Authorization: Bearer`, `?token=`, or the `rcv_token` cookie.
- On a successful query-string hit, the server sets `rcv_token` as `HttpOnly;
  SameSite=Strict; Path=/` (+ `Secure` over HTTPS) and the client strips the token
  from the visible URL — so it stops leaking into screenshots and `Referer`.
- Compared with `crypto.timingSafeEqual`.
- Held in memory only. Never written to disk, never logged.
- `/api/health` is the sole exception, returning `{"ok":true}` and nothing else.

`--no-token` exists but is **refused** unless the bind host is loopback and
`--tunnel` is not set.

## Consequences

**Good**

- The default is safe. There is no flag to forget.
- Zero configuration: no accounts, no password prompt, no config file, no state. The
  token dies with the process.
- Composes with Cloudflare Access rather than competing with it: Access is the front
  door for a long-lived named tunnel, the token remains a second factor.

**Bad / accepted**

- The URL is 43 characters longer, which is hostile to typing on a phone. Mitigated
  by copy/paste and, in roadmap v0.3, by `--qr`.
- Restarting the process invalidates open tabs. Correct behaviour, occasionally
  annoying; a `--token <value>` flag exists for users who want stability.
- A token in a query string is visible in the browser's history and in Cloudflare's
  access logs. This is why it is exchanged for a cookie on first hit. Users who care
  should use a named tunnel with Access.
- It is bearer auth: whoever has the token has read access. There is no revocation
  short of a restart. Proportionate for a single-developer tool.

## Alternatives considered

**No auth, loopback bind, opt-in token.** Simplest, and fine for local use.
Rejected: it makes the tunnel flow — the reason the product exists — insecure by
default.

**Cloudflare Access only.** The right answer for a long-lived deployment, and
documented as such. Rejected as the *only* mechanism because it does not exist for a
quick tunnel, and quick tunnels are the `npx`-and-go path.

**HTTP Basic auth with a generated password.** Equivalent security, worse UX: a
browser credential prompt on a phone instead of a link that just opens.

**mTLS / SSH tunnel only.** Both are stronger and both require the user to configure
infrastructure, which the brief explicitly rules out.
