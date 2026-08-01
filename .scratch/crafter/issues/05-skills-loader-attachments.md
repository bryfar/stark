# 05 — Skills Loader & Multimodal Attachments

**What to build:**
As a developer, I want to load custom skills instruction files (markdown/JSON from `.agents/skills/` or `.gemini/skills/`) and attach text, PDF, log, or image files to my prompt, so that I can extend the agent's capabilities dynamically.

**Blocked by:** 01 — MVP Multi-Provider LLM Chat & UI Base

**Status:** done

- [x] Dynamic skills loader in Rust (`skills::loader`) searching workspace and global skill paths.
- [x] Multimodal attachments UI in ChatInputBox supporting drag-and-drop / selection of Text, PDF, Log, and Image files.
- [x] Attachment size validation and context injection prior to LLM request dispatch.
