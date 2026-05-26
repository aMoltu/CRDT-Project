# CRDT Demo

Interactive demonstrations of Conflict-free Replicated Data Types (CRDTs), built with a C++ core library compiled to WebAssembly and a React frontend.

**Live site:** https://amoltu.github.io/CRDT-Project/
**Latest CI/CD run:** https://github.com/aMoltu/CRDT-Project/actions
**WebSocket server:** hosted on [Northflank](https://northflank.com)

---

## Introduction

This project explores CRDTs through interactive browser demos. A CRDT is a data structure designed for distributed systems where multiple nodes write to their own local copy independently — without coordination — and always converge to the same state when they exchange updates.

The core data structures are implemented in C++, compiled to WebAssembly so they run directly in the browser. A lightweight C++ WebSocket server enables real-time multiplayer demos where multiple browser tabs can sync with each other.

Three CRDT types are demonstrated:

- **G-Counter** — a distributed counter where each node owns one slot. Merge takes the element-wise maximum.
- **G-Set** — a grow-only set, visualised as a shared drawing canvas. Merge is set union.
- **RGA (Replicated Growable Array)** — a sequence CRDT for collaborative text editing, where every character has a unique ID and a Lamport clock for deterministic ordering of concurrent inserts.

---

## Implemented functionality

- **G-Counter** local demo — three independent nodes, per-node increment and pairwise merge controls, full sync button
- **G-Set canvas** local demo — three independent drawing canvases, per-node merge controls, full sync button
- **RGA text editor** local demo — three independent text editors, per-node merge, full sync
- **G-Counter online** — real-time multiplayer counter synced over WebSockets
- **G-Set canvas online** — real-time shared drawing canvas
- **RGA text editor online** — real-time collaborative text editing with offline queuing
- **Introduction page** explaining what CRDTs are and how merging works
- Automatic deployment to GitHub Pages on every push to `main`

---

## Future work

- **2P-Set / OR-Set** — sets that support removal
- **Persistent state** — currently all state is lost on page refresh
- **Room management** for online demos — currently all users share a single room per CRDT type

---

## External dependencies

### Frontend

| Dependency | Version | Purpose |
|---|---|---|
| [React](https://react.dev) | 19 | UI framework |
| [React Router DOM](https://reactrouter.com) | 7 | Client-side routing between demo pages |
| [Vite](https://vite.dev) | 8 | Dev server and production bundler |
| [TypeScript](https://www.typescriptlang.org) | 6 | Static type checking |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first CSS framework |
| [shadcn](https://ui.shadcn.com) | 4 | Pre-built UI components (buttons, cards) |
| [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) | — | Animation utility classes for Tailwind |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | — | Monospace font used throughout the UI |
| [class-variance-authority](https://cva.style) | — | Variant-based className composition for components |
| [clsx](https://github.com/lukeed/clsx) | — | Conditional className utility |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | — | Merges conflicting Tailwind classes safely |

### C++ server

| Dependency | Purpose |
|---|---|
| [uWebSockets](https://github.com/uNetworking/uWebSockets) | High-performance WebSocket server |
| [uSockets](https://github.com/uNetworking/uSockets) | C networking foundation required by uWebSockets |
| [nlohmann/json](https://github.com/nlohmann/json) | JSON serialisation/deserialisation for WebSocket messages |
| [CMake](https://cmake.org) | Build system for the C++ server and CRDT library |

### Build tooling

| Dependency | Purpose |
|---|---|
| [Emscripten](https://emscripten.org) | Compiles the C++ CRDT library to WebAssembly |
| [Docker](https://www.docker.com) | Runs the Emscripten toolchain without a local install |

---

## Installation

**Requirements:** Node.js 22+

The compiled WASM artifacts are included in the repository, so no build step is needed after a fresh clone.

```bash
# 1. Clone the repository
git clone https://github.com/aMoltu/CRDT-Project.git
cd CRDT-Project

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

If you make changes to the C++ library in `crdt-lib/`, rebuild the WASM (requires Docker):

```bash
npm run build:wasm
```

You can also rebuild the WASM and start the dev server in a single command (requres Docker):

```bash
npm run dev:fresh
```

### Online demos

The online demos require a running WebSocket server. The deployed site connects to the server hosted on Northflank automatically.

For local development, the frontend defaults to `ws://localhost:8080`. The server can be started with Docker (requires the Linux engine — WSL 2 on Windows):

```bash
# from the project root
docker compose up server
```

### Production build

```bash
cd frontend
npm run build
```

The compiled output is written to `frontend/dist` and can be served as a static site.

---

## Usage

Open the app in a browser. The home page lists all available demos in two columns — **Local** and **Online**.

**Local demos** run entirely in the browser using WebAssembly. No server is needed.

1. Each of the three panels represents an independent replica.
2. Use the **+ Increment** / draw / type controls to make changes on individual nodes.
3. Use the **Merge from X** buttons to pull changes from one node into another.
4. Use **Sync All** to merge all nodes in one step and verify they converge to the same state.
5. Use **Reset** to start over.

**Online demos** connect to the WebSocket server (hosted on Northflank) and allow multiple browser tabs (or users) to sync in real time.

1. Open the same online demo in two or more browser tabs.
2. Make changes in one tab — they appear in the other tabs automatically.
3. Close the tab or disconnect to make independent changes, then reconnect to see them merged.

For a conceptual overview of how CRDTs work, click **What is a CRDT?** on the home page.

---

## External sources

The following resources were used for learning, reference, and discussion during development.

| Source | Used for |
|---|---|
| [CRDT Dictionary — Ian K. Duncan](https://www.iankduncan.com/engineering/2025-11-27-crdt-dictionary/) | Introduction to different types of CRTDs |
| [CRDTs for Mortals — YouTube](https://www.youtube.com/watch?v=x7drE24geUw) | Introduction to how different CRDTs work in practice |
| AI assistants (Claude) | Discussing implementation approaches and searching for information |
