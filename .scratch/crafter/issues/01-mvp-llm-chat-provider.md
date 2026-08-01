# 01 — MVP Multi-Provider LLM Chat & UI Base

**What to build:**
As a Linux developer, I want a lightweight streaming chat interface supporting OpenAI, Anthropic, Gemini, and Ollama with model and reasoning selectors, so that I can interact with my preferred LLM with sub-50ms UI frame latency.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Rust `Provider` trait and implementations for OpenAI, Anthropic, Gemini, and Ollama in `src-tauri/src/providers/`.
- [x] Tauri IPC command `send_chat_message` emitting streaming `chat-token` events.
- [x] Svelte 5 / Preact HeaderBar with Provider, Model, and CoT Reasoning selectors.
- [x] Streaming ChatView rendering responses in real-time with session token counter.
