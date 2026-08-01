# 03 — Encrypted Storage, Argon2id & Secret Service Keyring

**What to build:**
As a security-conscious developer, I want my API keys, chat histories, and application configuration encrypted at rest using AES-256-GCM and Argon2id key derivation tied to the Linux Secret Service / Keyring, with an in-memory passphrase fallback modal on minimal Linux systems.

**Blocked by:** 01 — MVP Multi-Provider LLM Chat & UI Base

**Status:** ready-for-agent

- [ ] Argon2id master key derivation module in `src-tauri/src/storage/crypto.rs`.
- [ ] AES-256-GCM encryption and decryption at rest for persistent JSON data on disk.
- [ ] Linux Secret Service / libsecret Keyring integration for secure API credential storage.
- [ ] P4 Unlock Modal for in-memory passphrase entry when Secret Service is unavailable.
