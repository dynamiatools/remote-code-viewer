# ADR-0002 — Vue 3 + Vite + Tailwind, build-time only

**Status:** Accepted · 2026-09-08

## Context

The client is a mobile-first reader with four views (tree, file, search, git). It
needs reactive state, a lazy tree, and a small bundle. It must not need a build step
on the remote machine.

## Decision

Vue 3 (`^3.5`) + Vite (`^8`) + Tailwind CSS (`^4`, via `@tailwindcss/vite`),
compiled to `dist/web/` and committed to the npm tarball, never to the runtime
dependency tree.

Deliberately excluded from the frontend as well:

- **`vue-router`** — a ~25-line hash router covers four views and gives Android's
  back button the right behaviour. A router library would be more code than the
  feature.
- **Pinia / any store** — `reactive()` in one module is the store. See design.md §5:
  there is intentionally no client cache.
- **A component library** — the whole UI is a top bar, a tree, a code pane, a sheet
  and a list. A component library would outweigh the application.
- **Web fonts** — 30–100 KB of payload for a tool whose selling point is size.
  System UI stack for chrome, `ui-monospace` for code.
- **A Markdown sanitiser** — markdown-it with `html: false` escapes raw HTML
  instead, so there is nothing to sanitise. One fewer dependency and one fewer
  bypass class to worry about.

Budget: **< 120 KB gzip** for the initial payload, enforced by a size check in the
build.

## Consequences

**Good**

- Runtime dependencies stay at zero (ADR-0001).
- Vue SFCs keep the mobile shell (drawer, bottom sheet, overlay) readable; Tailwind
  keeps the responsive rules next to the markup, which matters when the phone layout
  is the primary one rather than an afterthought.
- Vite gives per-language code splitting for free, which is what makes ADR-0003
  work.

**Bad / accepted**

- Contributors need `npm install` and a build to work on the UI; the published
  package does not.
- Tailwind v4 is CSS-first configured (`@theme` in CSS, no `tailwind.config.js`),
  which is different from most existing examples.
- `dist/web/` is a build artifact that must be regenerated before publish. Handled
  by `prepublishOnly`, so a hand-run `npm publish` cannot ship a stale bundle.

## Alternatives considered

**Vanilla JS + template strings.** Would reach zero *dev* dependencies too. Rejected:
the tree, drawer and outline are genuinely stateful, and hand-rolled DOM updates for
them would be more code and more bugs than Vue's 34 KB gzip.

**Svelte.** Smaller runtime and an excellent fit. Rejected on ecosystem familiarity
within Dynamia, where Vue is the established frontend stack — a real constraint for
long-term maintenance, and the size difference here is a few KB.

**Server-rendered HTML, no SPA.** Smallest possible client. Rejected because every
tap becomes a round trip and a full repaint; on a phone over a tunnel that is the
worst part of the experience.
