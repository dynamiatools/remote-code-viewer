# ADR-0001 — Node.js backend with zero runtime dependencies

**Status:** Accepted · 2026-09-08

## Context

The product is defined by one command:

```bash
npx @dynamia-tools/remote-code-viewer
```

`npx` implies npm, which implies Node is already present on the remote box. So Node
is the launcher no matter what language the server is written in. The remaining
question is whether the *server* is Node, or a compiled binary that a thin Node
wrapper executes.

The workload is entirely I/O bound: `readdir`, bounded `read`, and spawning `git`.
There is no computation to speed up.

## Decision

Write the server in Node.js (ESM, `.mjs`) using only `node:` builtins, and keep
`dependencies` **empty**. Everything the frontend needs — Vue, Vite, Tailwind,
highlight.js, markdown-it — is a `devDependency` compiled into `dist/web/` before
publish. A test asserts `dependencies` is empty.

Minimum supported Node: **20.10** (`Object.hasOwn`, stable `node:test`, `fs.cp`).

## Consequences

**Good**

- A cold `npx` downloads one small tarball and runs. No postinstall, no binary
  download, no compile step, no platform matrix.
- Nothing to audit: zero transitive supply-chain surface on a tool that reads
  proprietary source code. This matters more here than in a typical app.
- One release artifact for every OS and CPU.
- Contributors need only Node.

**Bad / accepted**

- ~45 MB RSS instead of ~10 MB, and ~60 ms startup instead of ~5 ms. Irrelevant at
  this scale; a dev box running an AI agent has the headroom.
- We hand-write things a framework would give us: routing, query parsing, cookie
  parsing, rate limiting, static file serving with ranges. That is a few hundred
  lines, and it is the code most worth owning outright because it is the code the
  security boundary lives in.
- No mature middleware ecosystem to lean on. Deliberate.

## Alternatives considered

**Go, shipped as per-platform binaries via npm `optionalDependencies`.** Genuinely
faster and smaller at runtime. Rejected because it costs a cross-compile CI
pipeline, six platform packages to keep version-locked, a Node wrapper anyway, and
a much worse contributor story — all to optimise a process that spends its life
blocked on the filesystem.

**Bun.** `Bun.serve`/`Bun.file` are pleasant and startup is excellent, but it
requires the remote box to have Bun. That breaks the one command that defines the
product.

**Deno.** Its permission model (`--allow-read=<workspace>`) would be a real
kernel-level backstop for the security boundary, which is attractive. Rejected for
the same distribution reason as Bun. If a future version ships a standalone binary,
this is worth revisiting.

**Express/Fastify on Node.** Would violate the zero-dependency property for
functionality we need very little of.
