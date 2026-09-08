# Design

## 1. The one-liner that defines the product

```bash
cd ~/dev/my-project
npx @dynamia-tools/remote-code-viewer
```

Everything else is negotiable. That is not. If a change makes this command slower,
noisier, or dependent on configuration, the change is wrong.

Concretely, the budget for that command is:

| Budget | Target |
|---|---|
| Download on cold `npx` | < 1 MB tarball |
| Time to "open this URL" | < 3 s cold, < 1 s warm |
| Resident memory, idle | < 60 MB |
| Initial SPA payload | < 120 KB gzip |
| Config required | zero |

## 2. Who is looking at this

One developer, on a phone, standing up, with an agent working on a remote box.
They want to answer three questions fast:

1. **What does this file look like?**
2. **What changed?**
3. **Where is this thing defined?**

They are not going to type. They are going to tap, scroll and read. Every design
decision resolves in favour of that person.

## 3. Mobile-first, concretely

"Mobile-first" here means the phone layout is the *primary* layout, not a
breakpoint that degrades the desktop one.

- **Layout.** Single column below `md` (768px). The file tree is a slide-over
  drawer, the symbol outline is a bottom sheet, search is a full-screen overlay.
  At `md` and up the drawer becomes a fixed left rail and the outline a right rail.
- **Touch targets.** Minimum 44×44 px for anything tappable, including tree rows.
  Tree rows are full-width taps, not chevron-only.
- **Back button.** Every navigation step is a hash-route entry, so Android back
  closes the drawer / leaves the file / exits search instead of killing the app.
- **Code reading.** Code scrolls horizontally *inside its own container*; the page
  body never scrolls sideways. Line numbers are a non-selectable gutter so
  copy-paste picks up code only. Soft-wrap is a toggle, off by default, remembered
  in `localStorage`.
- **Font size.** 13px/1.55 monospace default with an A−/A+ control. `text-size-adjust`
  is pinned so iOS Safari does not reflow code on rotation.
- **Bandwidth.** Payloads are plain text, not pre-highlighted HTML: highlighting on
  the client is roughly 3–5× smaller over the wire than server-rendered `<span>`
  soup. Tree listings are lazy, one directory at a time.
- **Safe areas.** `env(safe-area-inset-*)` respected on the bottom bar so the notch
  and the home indicator do not eat controls.

## 4. Visual language

Dark by default — this is a code-reading tool, usually opened in the evening, and
the agent's output is what should carry the colour. `prefers-color-scheme` is
honoured, with an explicit override persisted locally.

- Type: system UI stack for chrome, `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` for code. No web fonts: a font file is 30–100 KB of payload for a tool whose whole point is being small.
- Colour: one neutral ramp plus a single accent. Syntax colours come from a
  hand-trimmed highlight.js theme shipped as ~1.5 KB of CSS variables rather than
  one of the full upstream themes.
- Chrome: a 44px top bar and nothing else. No breadcrumbs bar, no status bar, no
  tab strip. The file path lives in the top bar, truncated from the left so the
  file name always stays visible.
- Motion: 150ms ease-out on drawer/sheet transforms only. Nothing else animates.
  `prefers-reduced-motion` disables even that.

## 5. State model

The client holds four things: current route, current file payload, tree expansion
set, and preferences. There is no store library and no cache invalidation problem
because there is no cache: a pull-to-refresh (or the refresh control) refetches.

This is deliberate. The workspace is being mutated by an agent underneath us, so
any client-side cache is a correctness hazard dressed as a performance win. The
server is on the same machine as the files; refetching a file is sub-millisecond.

## 6. The No IDE Creep test

Before adding anything, it must pass all four:

1. **Does it answer one of the three questions in §2?** If it needs a paragraph of
   justification, no.
2. **Is it read-only?** Any mutation of the workspace, the git repo, or the process
   is out. No exceptions — that is the safety property users rely on when pointing
   this at a directory an agent is actively editing.
3. **What does it cost the cold `npx`?** A runtime dependency is a very high bar. A
   frontend dependency must earn its gzip.
4. **Does an IDE already exist for this?** If the honest answer is "you would use
   VS Code for that", the answer is no. Ship a link to the repo instead.

Features that have already failed this test, recorded so they are not re-litigated:
editing, terminal, LSP/tree-sitter navigation, git write operations, extensions,
debugger, multi-user/collaboration, project management, a database, a file watcher
with live push.

## 7. Error and empty states

The tool is often pointed at something unexpected (an empty dir, a non-repo, a
2 GB log, a binary). Every one of those has a designed state, not a stack trace:

| Situation | What the user sees |
|---|---|
| Not a git repo | Git view shows "Not a git repository" and the tab is dimmed, not hidden |
| Binary file | File type, size, and "Binary file — not shown" |
| File over the size limit | Size, and "Too large to display (limit 2 MB)" |
| Directory over the entry limit | First 2 000 entries plus "…and N more" |
| Denied path (secret) | Treated as not found, uniformly — see security.md §6 |
| Empty search | The query, and which engine ran it (`git grep` or `scan`) |
