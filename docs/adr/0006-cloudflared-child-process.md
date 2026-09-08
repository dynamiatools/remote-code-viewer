# ADR-0006 — Cloudflare tunnel by spawning `cloudflared`

**Status:** Accepted · 2026-09-08

## Context

The viewer runs on a remote Linux box, usually without an inbound port that is safe
to open, and the client is a phone on a mobile network. Something has to bridge
them. The brief is explicit: use Cloudflare Tunnel, do not implement a custom
tunnel, and do not make the user configure infrastructure.

## Decision

Optional but first-class, implemented as a **child process**:

```js
spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`])
```

- Enabled with `--tunnel`. Off by default: a local-only run must not phone home.
- `cloudflared` is located on `PATH`; if it is absent the CLI prints install
  instructions and continues serving locally rather than failing.
- The public URL is parsed from `cloudflared`'s stderr (`https://<sub>.trycloudflare.com`)
  and printed with the auth token appended (ADR-0004).
- Its output is otherwise suppressed unless `--verbose`.
- The child is killed on `SIGINT`/`SIGTERM`/`exit`; the parent exits non-zero if the
  tunnel dies while `--tunnel` was requested.
- Named tunnels (`--tunnel-name`) and Cloudflare Access are roadmap v0.3; the quick
  tunnel is what makes the zero-config path work.

## Consequences

**Good**

- HTTPS with a valid certificate, an outbound-only connection, no inbound firewall
  change, no DNS, no reverse proxy, no account required for a quick tunnel.
- Zero added dependencies: no Cloudflare SDK, no HTTP client.
- The tunnel is completely optional and completely separable — the viewer is a plain
  local HTTP server, so it works over SSH port-forwarding, Tailscale, or anything
  else the user prefers.

**Bad / accepted**

- Parsing a URL out of another program's stderr is a contract we do not own. If
  Cloudflare changes the banner, detection breaks. Mitigated by a permissive regex
  and by a clear failure message that tells the user the local URL still works.
- `cloudflared` must be installed. It is not an npm dependency and will not be
  auto-downloaded in v0.1 — pulling a ~70 MB binary during `npx` would destroy the
  startup budget. v0.3 may offer a prompted download.
- Quick tunnel URLs are public, random, and rate-limited by Cloudflare, and they
  change on every restart. The public-URL exposure is precisely what ADR-0004
  addresses.
- Traffic terminates TLS at Cloudflare. Users for whom that is unacceptable should
  not use `--tunnel`; SSH forwarding is documented as the alternative.

## Alternatives considered

**A custom tunnel (reverse WebSocket to a relay we host).** Rejected by the brief,
and correctly: it means operating a relay, and being the trusted man-in-the-middle
for other people's source code.

**ngrok / localtunnel / bore.** Equivalent shape. Rejected: `cloudflared` was
specified, is free without an account for quick tunnels, and has the Access story
for the long-lived case.

**`cloudflared` as a library (Go).** Would remove the stderr parsing. Impossible
without abandoning ADR-0001.

**Document SSH port-forwarding and ship no tunnel support.** Zero code, and it is
still supported. Rejected as the only option: it is a per-connection manual step on
a phone, which is the device this tool is for.
