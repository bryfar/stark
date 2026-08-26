import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Server,
  Check,
  KeyRound,
} from "lucide-react";

const LOCAL_CATALOG = [
  { name: "qwen2.5:1.5b", size: "~1.1 GB" },
  { name: "qwen2.5:3b", size: "~1.9 GB" },
  { name: "llama3.2:3b", size: "~2.0 GB" },
  { name: "phi3:mini", size: "~2.2 GB" },
  { name: "deepseek-coder:6.7b", size: "~3.8 GB" },
  { name: "llama3.1:8b", size: "~4.7 GB" },
];

const PRESETS = {
  "stark-free": {
    name: "Stark Free (OpenRouter)",
    base_url: "https://openrouter.ai/api/v1",
    models:
      "meta-llama/llama-3.1-8b-instruct:free\nmistralai/mistral-7b-instruct:free\ngoogle/gemma-2-9b-it:free\nqwen/qwen-2-7b-instruct:free",
    needs_api_key: true,
  },
  "nvidia-nim": {
    name: "NVIDIA NIM (GLM-5.2)",
    base_url: "https://integrate.api.nvidia.com/v1",
    models:
      "z-ai/glm-5.2\ndeepseek-ai/deepseek-v4-flash-0731\nmeta/llama-3.3-70b-instruct\nmistralai/mistral-nemotron",
    needs_api_key: true,
  },
  "pollinations-free": {
    name: "Pollinations Free (sin API)",
    base_url: "https://text.pollinations.ai/openai/v1",
    models: "openai\nmistral\nqwen\nllama\ndeepseek\ngemini",
    needs_api_key: false,
  },
  ollama: {
    name: "Ollama Local",
    base_url: "http://localhost:11434",
    models: "qwen2.5:1.5b\nllama3.2:3b\nphi3:mini\ndeepseek-coder:6.7b",
    needs_api_key: false,
  },
  openai: {
    name: "OpenAI",
    base_url: "https://api.openai.com/v1",
    models: "gpt-4o\ngpt-4o-mini\no1-mini",
    needs_api_key: true,
  },
  anthropic: {
    name: "Anthropic",
    base_url: "https://api.anthropic.com",
    models: "claude-3-5-sonnet-20241022\nclaude-3-5-haiku-20241022",
    needs_api_key: true,
  },
  gemini: {
    name: "Google Gemini",
    base_url: "https://generativelanguage.googleapis.com",
    models: "gemini-1.5-flash\ngemini-1.5-pro",
    needs_api_key: true,
  },
  groq: {
    name: "Groq",
    base_url: "https://api.groq.com/openai/v1",
    models: "llama-3.3-70b-versatile\nllama-3.1-8b-instant",
    needs_api_key: true,
  },
  openrouter: {
    name: "OpenRouter",
    base_url: "https://openrouter.ai/api/v1",
    models: "openai/gpt-4o\nanthropic/claude-3.5-sonnet",
    needs_api_key: true,
  },
  mistral: {
    name: "Mistral",
    base_url: "https://api.mistral.ai/v1",
    models: "mistral-large-latest\nmistral-small-latest",
    needs_api_key: true,
  },
  lmstudio: {
    name: "LM Studio",
    base_url: "http://localhost:1234/v1",
    models: "",
    needs_api_key: false,
  },
};

function parseModels(text) {
  return text
    .split(/[\n,]/)
    .map((m) => m.trim())
    .filter(Boolean);
}

export function ProviderManagerModal({ isOpen, onClose, onProvidersChanged }) {
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    kind: "openai_compatible",
    base_url: "",
    models: "",
    needs_api_key: true,
    api_key: "",
  });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [localModels, setLocalModels] = useState(null);
  const [localStatus, setLocalStatus] = useState("detecting");
  const [installing, setInstalling] = useState(null);

  async function invoke(cmd, args) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke(cmd, args);
    } catch (e) {
      throw e;
    }
  }

  async function refreshProviders() {
    try {
      const list = await invoke("providers_list");
      if (Array.isArray(list) && list.length > 0) {
        setProviders(list);
      } else {
        const presets = await invoke("providers_seed_presets");
        setProviders(presets);
      }
    } catch (e) {
      const presetsArray = Object.keys(PRESETS).map((id) => ({
        id,
        name: PRESETS[id].name,
        kind:
          id === "anthropic"
            ? "anthropic"
            : id === "gemini"
              ? "gemini"
              : id === "ollama"
                ? "ollama"
                : "openai_compatible",
        base_url: PRESETS[id].base_url,
        models: parseModels(PRESETS[id].models),
        needs_api_key: PRESETS[id].needs_api_key,
      }));
      setProviders(presetsArray);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      refreshProviders();
      detectLocal();
    }
  }, [isOpen]);

  async function detectLocal() {
    setLocalStatus("detecting");
    setLocalModels(null);
    try {
      const list = await invoke("providers_detect_models", {
        providerId: "ollama",
      });
      setLocalModels(list);
      setLocalStatus(list.length > 0 ? "ok" : "empty");
    } catch (e) {
      setLocalModels([]);
      setLocalStatus("unavailable");
    }
  }

  async function installModel(name) {
    setInstalling(name);
    setMessage("");
    try {
      const res = await invoke("providers_install_model", { modelName: name });
      setMessage(`Instalado: ${name}`);
      await detectLocal();
      await refreshProviders();
    } catch (e) {
      setMessage(`Error: ${typeof e === "string" ? e : e.message || e}`);
    } finally {
      setInstalling(null);
    }
  }

  function applyPreset(id) {
    const p = PRESETS[id];
    if (!p) return;
    setForm({
      id,
      name: p.name,
      kind:
        id === "anthropic"
          ? "anthropic"
          : id === "gemini"
            ? "gemini"
            : id === "ollama"
              ? "ollama"
              : "openai_compatible",
      base_url: p.base_url,
      models: p.models,
      needs_api_key: p.needs_api_key,
      api_key: "",
    });
    setEditing(id);
    setMessage("");
  }

  function startNew() {
    setEditing("__new__");
    setForm({
      id: "",
      name: "",
      kind: "openai_compatible",
      base_url: "",
      models: "",
      needs_api_key: true,
      api_key: "",
    });
    setMessage("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.base_url.trim()) return;
    setBusy(true);
    setMessage("");
    const id =
      form.id.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    try {
      const saved = await invoke("providers_save", {
        payload: {
          id,
          name: form.name.trim(),
          kind: form.kind,
          base_url: form.base_url.trim(),
          models: parseModels(form.models),
          needs_api_key: form.needs_api_key,
          api_key: form.api_key || null,
        },
      });
      setMessage(`Proveedor ${saved.name} guardado`);
      setEditing(null);
      setForm({
        id: "",
        name: "",
        kind: "openai_compatible",
        base_url: "",
        models: "",
        needs_api_key: true,
        api_key: "",
      });
      refreshProviders();
      onProvidersChanged && onProvidersChanged();
    } catch (err) {
      const saved = {
        id,
        name: form.name.trim(),
        kind: form.kind,
        base_url: form.base_url.trim(),
        models: parseModels(form.models),
        needs_api_key: form.needs_api_key,
      };
      setProviders((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setMessage(`Proveedor ${saved.name} guardado (modo navegador)`);
      setEditing(null);
      setForm({
        id: "",
        name: "",
        kind: "openai_compatible",
        base_url: "",
        models: "",
        needs_api_key: true,
        api_key: "",
      });
      onProvidersChanged && onProvidersChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    try {
      await invoke("providers_delete", { id });
    } catch (e) {
      // browser fallback
    }
    setProviders((prev) => prev.filter((p) => p.id !== id));
    onProvidersChanged && onProvidersChanged();
  }

  if (!isOpen) return null;

  const installedNames = (localModels || []).map((m) => m.name);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="doctor-modal"
        style={{ maxWidth: "760px", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="doctor-header">
          <div>
            <h2 className="doctor-title">Proveedores</h2>
            <p className="doctor-subtitle">
              Gestiona los proveedores LLM y modelos locales
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--colors-muted)",
              cursor: "pointer",
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {message && (
          <div
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-body-strong)",
              background: "var(--colors-surface-card)",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "4px",
              padding: "8px 12px",
            }}
          >
            {message}
          </div>
        )}

        {/* Modelos locales */}
        <div
          style={{
            border: "1px solid var(--colors-hairline)",
            borderRadius: "6px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Server
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--colors-primary)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--colors-ink)",
                }}
              >
                Modelos locales
              </span>
            </div>
            <button
              onClick={detectLocal}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                padding: "5px 12px",
              }}
            >
              <RefreshCw size={12} strokeWidth={1.75} />
              Detectar
            </button>
          </div>

          {localStatus === "detecting" && (
            <div
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--colors-muted)",
              }}
            >
              Consultando Ollama en localhost:11434...
            </div>
          )}

          {localStatus === "unavailable" && (
            <div
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--colors-body)",
                lineHeight: 1.6,
              }}
            >
              Ollama no está disponible en este equipo. Instálalo con:
              <code
                style={{
                  display: "block",
                  background: "var(--colors-surface-dark)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "4px",
                  padding: "8px 10px",
                  margin: "8px 0",
                  color: "var(--colors-body-strong)",
                  fontSize: "11.5px",
                }}
              >
                curl -fsSL https://ollama.com/install.sh | sh
              </code>
              y reinicia la app para instalar modelos locales.
            </div>
          )}

          {localStatus === "ok" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {installedNames.map((name) => (
                <span
                  key={name}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    background: "var(--colors-surface-dark-elevated)",
                    border: "1px solid var(--colors-hairline)",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    color: "var(--colors-ink)",
                  }}
                >
                  <Check
                    size={11}
                    strokeWidth={2}
                    style={{ color: "var(--colors-success)" }}
                  />
                  {name}
                </span>
              ))}
            </div>
          )}

          {localStatus === "empty" && (
            <div
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--colors-muted)",
              }}
            >
              Ollama responde pero no hay modelos instalados. Elige uno del
              catálogo:
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {LOCAL_CATALOG.map((model) => {
              const isInstalled = installedNames.includes(model.name);
              const isInstalling = installing === model.name;
              return (
                <div
                  key={model.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--colors-surface-card)",
                    border: "1px solid var(--colors-hairline)",
                    borderRadius: "4px",
                    padding: "6px 10px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11.5px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--colors-ink)",
                      }}
                    >
                      {model.name}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--colors-muted)",
                      }}
                    >
                      {model.size}
                    </div>
                  </div>
                  <button
                    disabled={isInstalled || isInstalling}
                    onClick={() => installModel(model.name)}
                    className="btn-secondary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10.5px",
                      padding: "4px 8px",
                    }}
                  >
                    {isInstalling ? (
                      <RefreshCw
                        size={11}
                        strokeWidth={1.75}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={11} strokeWidth={1.75} />
                    )}
                    {isInstalled
                      ? "Instalado"
                      : isInstalling
                        ? "Descargando"
                        : "Instalar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lista de proveedores */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: "700",
                color: "var(--colors-ink)",
              }}
            >
              Proveedores configurados
            </span>
            <button
              onClick={startNew}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                padding: "5px 12px",
              }}
            >
              <Plus size={12} strokeWidth={1.75} />
              Añadir
            </button>
          </div>

          {providers.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--colors-surface-card)",
                border: "1px solid var(--colors-hairline)",
                borderRadius: "4px",
                padding: "8px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  minWidth: "0",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      color: "var(--colors-ink)",
                    }}
                  >
                    {p.name}
                  </span>
                  {p.needs_api_key && (
                    <KeyRound
                      size={11}
                      strokeWidth={1.75}
                      style={{ color: "var(--colors-muted)" }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10.5px",
                    color: "var(--colors-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.base_url || "sin base_url"} · {p.models.length} modelos
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => applyPreset(p.id)}
                  className="btn-secondary"
                  style={{ fontSize: "11px", padding: "4px 10px" }}
                  title="Cargar en el form"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--colors-error)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "4px",
                  }}
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        {editing && (
          <form
            onSubmit={handleSave}
            style={{
              border: "1px solid var(--colors-hairline)",
              borderRadius: "6px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: "700",
                color: "var(--colors-ink)",
              }}
            >
              {editing === "__new__" ? "Nuevo proveedor" : `Editar proveedor`}
            </span>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Nombre
                </label>
                <input
                  className="model-selector-select"
                  value={form.name}
                  onInput={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ej. OpenRouter"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "12px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Tipo
                </label>
                <select
                  className="model-selector-select"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "12px",
                  }}
                >
                  <option value="openai_compatible">OpenAI-compatible</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Gemini</option>
                  <option value="ollama">Ollama local</option>
                </select>
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Base URL
              </label>
              <input
                className="model-selector-select"
                value={form.base_url}
                onInput={(e) => setForm({ ...form, base_url: e.target.value })}
                placeholder="https://api.provider.com/v1"
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px" }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Modelos (uno por línea o separados por coma)
              </label>
              <textarea
                className="model-selector-select"
                rows={3}
                value={form.models}
                onInput={(e) => setForm({ ...form, models: e.target.value })}
                placeholder="gpt-4o&#10;gpt-4o-mini"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12px",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-body-strong)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.needs_api_key}
                  onChange={(e) =>
                    setForm({ ...form, needs_api_key: e.target.checked })
                  }
                />
                Requiere API key
              </label>
              {form.needs_api_key && (
                <input
                  type="password"
                  className="model-selector-select"
                  value={form.api_key}
                  onInput={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="API key (se guarda cifrada)"
                  style={{ flex: 1, padding: "8px 10px", fontSize: "12px" }}
                />
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setMessage("");
                }}
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "7px 16px" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !form.name.trim() || !form.base_url.trim()}
                className="send-btn-stark"
                style={{ fontSize: "12px", padding: "7px 16px" }}
              >
                {busy ? "Guardando..." : "Guardar proveedor"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
