# Architecture Decision Records

Significant, hard-to-reverse decisions only. Routine choices live in
[../architecture.md](../architecture.md); rejected features live in
[../roadmap.md](../roadmap.md).

| # | Decision | Status |
|---|---|---|
| [0001](./0001-nodejs-zero-dependency-backend.md) | Node.js backend with zero runtime dependencies | Accepted |
| [0002](./0002-vue-vite-tailwind-frontend.md) | Vue 3 + Vite + Tailwind, build-time only | Accepted |
| [0003](./0003-highlightjs-lazy-grammars.md) | highlight.js with lazily imported grammars | Accepted |
| [0004](./0004-token-auth-by-default.md) | Token authentication enabled by default | Accepted |
| [0005](./0005-regex-symbol-outline.md) | Regex symbol outline instead of a language server | Accepted |
| [0006](./0006-cloudflared-child-process.md) | Cloudflare tunnel by spawning `cloudflared` | Accepted |

Template: Context → Decision → Consequences → Alternatives considered.
