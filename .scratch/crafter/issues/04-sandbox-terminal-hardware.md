# 04 — Bubblewrap Terminal Sandbox & Hardware Tiers Detection

**What to build:**
As a Linux developer, I want build and test commands executed inside a Linux kernel sandbox (`bubblewrap`/`firejail`) with output streaming and timeouts, along with automatic hardware detection (`sysinfo`) suggesting Ollama local model tiers.

**Blocked by:** 02 — Plan & Build Modes with Diff Modal & Repo Indexer

**Status:** done

- [x] Linux `bubblewrap`/`firejail` subprocess isolation wrapper in `src-tauri/src/sandbox/`.
- [x] Support for Synchronized Copy sandbox mode and Perimeter sandbox mode.
- [x] Real-time stdout/stderr streaming IPC (`terminal:stdout`, `terminal:stderr`) with configurable execution timeout.
- [x] System hardware inspection (`sysinfo`) mapping RAM/VRAM to recommended Ollama Tiers (Lite, Basic, Standard, Pro).
