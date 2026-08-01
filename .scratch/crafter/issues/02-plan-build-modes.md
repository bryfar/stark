# 02 — Plan & Build Modes with Diff Modal & Repo Indexer

**What to build:**
As a developer, I want to switch between Plan Mode (read-only analysis) and Build Mode (file modification), with a gitignore-aware repo file indexer and a visual P2 Diff Modal, so that I can review proposed code edits before approving mutations to disk.

**Blocked by:** 01 — MVP Multi-Provider LLM Chat & UI Base

**Status:** done

- [x] HeaderBar Plan Mode vs Build Mode toggle with reactive agent mode state.
- [x] Gitignore-aware repository tree indexer (`repo::indexer`) cached locally in Rust backend.
- [x] Visual P2 Diff Modal in frontend displaying additions and deletions per file before approval.
- [x] Tauri IPC command `edit_apply` for applying approved diffs and recording changes in an auditable log.
