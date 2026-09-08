# Remote Code Viewer

[![npm version](https://img.shields.io/npm/v/@dynamia-tools/remote-code-viewer.svg)](https://www.npmjs.com/package/@dynamia-tools/remote-code-viewer)
[![npm downloads](https://img.shields.io/npm/dm/@dynamia-tools/remote-code-viewer.svg)](https://www.npmjs.com/package/@dynamia-tools/remote-code-viewer)
[![Publish to npm](https://github.com/dynamiatools/remote-code-viewer/actions/workflows/publish.yml/badge.svg)](https://github.com/dynamiatools/remote-code-viewer/actions/workflows/publish.yml)
[![node](https://img.shields.io/node/v/@dynamia-tools/remote-code-viewer.svg)](https://www.npmjs.com/package/@dynamia-tools/remote-code-viewer)
[![dependencies](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen.svg)](./package.json)
[![license](https://img.shields.io/npm/l/@dynamia-tools/remote-code-viewer.svg)](./LICENSE)

**Ultra-light, mobile-first remote code viewer with automatic Cloudflare Tunnel support, designed for AI agents working in remote development environments.**

Remote Code Viewer provides a simple way to inspect a project running on a remote development server from any browser, including mobile devices.

It is intentionally **not an IDE**.

No terminal.
No extensions.
No Git client.
No project management.
No unnecessary features.

Just a fast window into the code an AI agent is currently working on.

## ✨ Features

* 📱 **Mobile-first UI** — designed primarily for phones and tablets
* ⚡ **Ultra-lightweight** — minimal runtime and resource usage
* 🌐 **Remote access** — inspect projects from any browser
* ☁️ **Cloudflare Tunnel** — automatic remote access through Cloudflare Tunnel
* 🔒 **Read-only** — designed for safely inspecting remote workspaces
* 🌳 **File tree** — browse the project structure
* 🎨 **Syntax highlighting** — readable source code across common languages
* 🔍 **Code finder** — search files and code quickly
* 🧭 **Code navigation** — navigate through source code and project structure
* 📝 **Markdown rendering** — render README files and project documentation
* 🌿 **Current branch** — display the active Git branch
* 📜 **Last commits** — display recent commit history
* 🔀 **Git diff** — inspect current working-tree changes

## 🚀 How To Use

No install step, no config file:

```bash
cd ~/dev/my-project
npx @dynamia-tools/remote-code-viewer            # serves the current directory
npx @dynamia-tools/remote-code-viewer /path      # serves an explicit workspace
npx @dynamia-tools/remote-code-viewer --tunnel   # + a public HTTPS URL via Cloudflare
```

It prints a local URL — with a token baked in — that you open in a browser to start
browsing the workspace. Add `--tunnel` when the browser isn't on the same machine or
network as the server (the common case: the agent runs on a remote box, you're on
your phone). Run `npx @dynamia-tools/remote-code-viewer --help` for the rest of the
flags (port, host, token control, max file size).

### Letting an agent launch it for you

Because the whole premise is "the agent is remote, you are not," it's worth turning
the command above into a skill/tool your AI agent can call on its own: have it run
`remote-code-viewer --tunnel` in the environment it's already working in, read the
tunnel URL that command prints to stdout, and hand that URL back to you in chat.
That way you never SSH in or open a terminal on the remote box yourself — you just
ask the agent to show you what it's doing and get a clickable link back.

## 🎯 Why?

AI coding agents are increasingly running in remote development environments.

An agent may be working on a powerful Linux server while the developer is using a phone, tablet, laptop, or another computer.

Traditional browser IDEs provide a complete development environment, but sometimes that is unnecessary.

Remote Code Viewer focuses on a much smaller problem:

> **Give the developer a fast, mobile-friendly window into the remote codebase.**

The AI agent does the development work.

Remote Code Viewer lets you see what is happening.

## 🧠 Designed for AI Agents

Remote Code Viewer is designed to work alongside AI coding agents such as Claude Code and other agentic development tools.

A typical environment looks like this:

```text
                     Remote Development Server
                     ─────────────────────────

                     ┌─────────────────────┐
                     │      AI Agent       │
                     │                     │
                     │    Claude Code      │
                     └──────────┬──────────┘
                                │
                                │ modifies
                                ▼
                     ┌─────────────────────┐
                     │   Project Workspace │
                     │                     │
                     │ ~/dev/my-project    │
                     └──────────┬──────────┘
                                │
                                │ reads
                                ▼
                     ┌─────────────────────┐
                     │ Remote Code Viewer  │
                     └──────────┬──────────┘
                                │
                         Cloudflare Tunnel
                                │
                                ▼
                          🌐 Browser
                          📱 Mobile
```

This makes it possible to work with an AI agent remotely without keeping a development machine running locally.

## 💡 Example

Start the viewer against a project:

```bash
remote-code-viewer ~/dev/dynamia-tools
```

The viewer starts a local HTTP service and can automatically establish a Cloudflare Tunnel.

The generated URL can then be opened from any supported browser:

```text
https://code.example.com/...
```

The viewer reads the project directly from the remote filesystem.

If the AI agent modifies a file, the viewer can show the updated contents and Git diff immediately.

There is no need to:

```text
commit → push → GitHub → pull
```

The remote working directory is the source being viewed.

## 🌳 File Explorer

The file explorer provides a lightweight view of the project structure.

Example:

```text
dynamia-tools/
├── src/
│   ├── main/
│   └── test/
├── docs/
├── README.md
├── build.gradle.kts
└── settings.gradle.kts
```

The viewer should make navigating large projects fast and comfortable, especially on mobile devices.

## 🎨 Code Highlighting

Source files are displayed with syntax highlighting appropriate for their language.

Initial language support should focus on common development languages and formats, including:

* Java
* Kotlin
* JavaScript
* TypeScript
* Vue
* HTML
* CSS
* JSON
* YAML
* XML
* SQL
* Shell
* Markdown

Language support should remain lightweight and extensible.

## 📝 Markdown Rendering

Markdown files can be rendered for comfortable reading.

This is particularly useful for:

* `README.md`
* Documentation
* Architecture notes
* ADRs
* Agent instructions
* Project specifications

Markdown rendering is intended for **reading**, not editing.

## 🔍 Code Finder

Code Finder provides fast access to files and code within the remote project.

It should support:

* File name search
* Path search
* Text search
* Symbol search where available

Example:

```text
DynamiaService
```

can return matching files and locations across the project.

The goal is fast code discovery, not full IDE-level indexing.

## 🧭 Code Navigation

Remote Code Viewer provides lightweight navigation through the codebase.

Depending on the language and available information, navigation may include:

* File tree navigation
* Symbols
* Definitions
* References
* Imports
* Packages
* Source locations

The project does not attempt to reproduce a complete language server or IDE.

## 🔀 Git Integration

Git integration is intentionally lightweight.

Remote Code Viewer provides just enough Git information to understand the current state of a remote workspace:

* **Current branch**
* **Last commits**
* **Working-tree diff**

Example:

```text
Branch
feature/payment-refactor

Recent commits
a82c1f2 Refactor payment service
b71d0e8 Add payment validation
4c921aa Update API documentation
```

The diff view allows the developer to inspect changes made by an AI agent before they are committed.

### Not a Git client

Remote Code Viewer does not provide:

* Commit
* Push
* Pull
* Merge
* Branch creation
* Branch switching
* Reset
* Stash management

Git is used as **context**, not as a management interface.

The goal is simply to answer:

> **Where am I? What changed? What happened recently?**

## ☁️ Cloudflare Tunnel

Remote Code Viewer is designed to work with **Cloudflare Tunnel** for secure remote access.

The viewer can run locally on the development server:

```text
localhost:8765
```

while `cloudflared` provides remote access:

```text
Browser
   │
   ▼
Cloudflare
   │
   ▼
Cloudflare Tunnel
   │
   ▼
localhost:8765
   │
   ▼
Remote Code Viewer
```

This avoids exposing the viewer directly through an inbound server port.

Cloudflare Tunnel configuration should remain optional so the viewer can also be used locally.

For development environments containing sensitive source code, authentication should be provided through an appropriate Cloudflare Access or equivalent security layer.

## 📱 Mobile First

The primary client is a mobile browser.

The interface should prioritize:

* Touch navigation
* Large enough controls
* Fast file browsing
* Comfortable code reading
* Horizontal scrolling for source code
* Quick navigation between files
* Minimal UI chrome
* Low bandwidth usage

Desktop browsers are supported, but the interface should not simply be a desktop IDE scaled down to mobile.

## 🔒 Read Only

Remote Code Viewer is intentionally read-only.

The viewer should never modify project files.

This provides a safe way to inspect an AI agent's work without accidentally changing the workspace from the browser.

The AI agent remains responsible for editing and executing the project.

## 🧱 Design Principles

### Lightweight

Keep the runtime, dependencies, memory usage and startup time as small as reasonably possible.

### Mobile First

Design for phones first.

Desktop support is important, but mobile is the primary viewing environment.

### Read Only

The viewer is an inspection tool, not an editor.

### Filesystem First

The viewer reads the actual remote working directory.

GitHub is not required.

Changes do not need to be committed or pushed before they can be inspected.

### No IDE Creep

Remote Code Viewer should not become another browser IDE.

Avoid adding features such as:

* Web terminal
* File editing
* Extensions
* Debugger
* Full Git client
* Package manager
* Deployment tools
* Project management
* User administration
* Collaboration features

Every feature should support the core purpose:

> **Quickly inspect and understand code being worked on in a remote environment.**

## 🤖 Typical AI Development Workflow

A typical workflow may look like:

```text
1. Clone repository
        │
        ▼
2. Start AI agent
        │
        ▼
3. Agent modifies code
        │
        ▼
4. Open Remote Code Viewer
        │
        ▼
5. Browse files
        │
        ▼
6. Inspect Git diff
        │
        ▼
7. Review recent commits
        │
        ▼
8. Ask the agent for changes
        │
        ▼
9. Repeat
        │
        ▼
10. Commit when satisfied
```

The viewer and the agent are intentionally separate.

The agent develops.

The viewer observes.

## 🛠️ Development

Clone the repository:

```bash
git clone <repository-url>
cd remote-code-viewer
```

Install dependencies:

```bash
# project-specific
```

Run locally:

```bash
# project-specific
```

The development server should expose a local HTTP endpoint that can optionally be published through Cloudflare Tunnel.

## 📦 Deployment

Remote Code Viewer is designed to run on Linux development servers with minimal setup.

Possible deployment methods include:

```text
Standalone binary
Docker
Docker Compose
Direct runtime
```

The preferred deployment should remain as simple as possible.

Example:

```bash
remote-code-viewer ~/dev/my-project
```

## 🔐 Security Considerations

Remote Code Viewer may have access to sensitive source code.

Implementations should:

* Restrict filesystem access to the configured workspace
* Prevent path traversal
* Validate symbolic links
* Never expose arbitrary server paths
* Never expose environment variables or credentials
* Avoid exposing `.ssh`, secrets, or unrelated directories
* Respect configured ignore/exclude patterns
* Use HTTPS for remote access
* Use authentication when exposed outside a trusted network

The viewer should assume that project directories contain sensitive information.

## 🗺️ Roadmap

### Core

* [x] File tree
* [x] Syntax highlighting
* [x] Markdown rendering
* [x] Code finder
* [x] Code navigation
* [x] Git current branch
* [x] Git last commits
* [x] Git diff
* [x] Mobile-first interface

### Remote Access

* [x] Automatic Cloudflare Tunnel
* [x] Configurable hostname
* [ ] Cloudflare Access integration
* [x] Local-only mode

### Future

* [x] Image preview
* [ ] Configurable ignored paths
* [ ] Multiple workspace support
* [ ] Project statistics

For the versioned, in-progress roadmap (what ships next and why), see
[docs/roadmap.md](./docs/roadmap.md).

Features should be evaluated carefully to avoid turning the project into a full IDE.

## 📄 License

MIT.

## ☕ Support

If Remote Code Viewer saves you from opening a full IDE just to peek at a remote
workspace, consider buying the maintainer a coffee:

<a href="https://www.buymeacoffee.com/marioserrano" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
