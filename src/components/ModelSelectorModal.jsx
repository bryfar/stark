import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  X,
  Check,
  Download,
  Plus,
  Loader2,
  Globe,
  HardDrive,
  Zap,
  KeyRound,
  Unlock,
  RefreshCw,
} from "lucide-react";

export function ModelSelectorModal({
  isOpen,
  onClose,
  selectedProvider,
  selectedModel,
  onSelect,
  providersConfig,
  onOpenProviderManager,
}) {
  const [localModels, setLocalModels] = useState(null);
  const [localStatus, setLocalStatus] = useState("detecting");
  const [installing, setInstalling] = useState(false);
  const [installingOllama, setInstallingOllama] = useState(false);
  const [ollamaInstallMsg, setOllamaInstallMsg] = useState("");
  const [modelToInstall, setModelToInstall] = useState("");
  const [tempProvider, setTempProvider] = useState(selectedProvider);
  const [tempModel, setTempModel] = useState(selectedModel);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState("");
  const [hardwareTier, setHardwareTier] = useState("");
  const [recommendedModels, setRecommendedModels] = useState([]);
  const [crafterLocal, setCrafterLocal] = useState(null);
  const [localCatalog, setLocalCatalog] = useState([]);
  const [localInstalling, setLocalInstalling] = useState(false);
  const [localProgress, setLocalProgress] = useState("");
  const [localInstallMsg, setLocalInstallMsg] = useState("");
  const [quantOpen, setQuantOpen] = useState(false);
  const [quantSource, setQuantSource] = useState("");
  const [quantCalib, setQuantCalib] = useState("");
  const [quantOuttype, setQuantOuttype] = useState("q4_k_m");
  const [quantOuttypes, setQuantOuttypes] = useState([]);
  const [quantRunning, setQuantRunning] = useState(false);
  const [quantLog, setQuantLog] = useState([]);
  const [quantMsg, setQuantMsg] = useState("");

  async function invoke(cmd, args) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(cmd, args);
  }

  async function detectCrafterLocal() {
    try {
      const [status, info, cat] = await Promise.all([
        invoke("local_status", { modelId: null }),
        invoke("hardware_detect"),
        invoke("local_catalog", { tier: null }),
      ]);
      setCrafterLocal(status);
      const tierCat =
        Array.isArray(cat) && info && info.tier
          ? cat.filter((c) => c.tier === info.tier.toLowerCase())
          : cat;
      setLocalCatalog(tierCat && tierCat.length ? tierCat : cat);
    } catch (e) {
      setCrafterLocal(null);
      setLocalCatalog([]);
    }
  }

  async function refreshCrafterLocal() {
    await detectCrafterLocal();
    try {
      localStorage.setItem("stark.catalog_last_checked", String(Date.now()));
    } catch (e) {
      /* noop */
    }
  }

  async function loadOuttypes() {
    try {
      const list = await invoke("quantize_outtypes");
      setQuantOuttypes(list || []);
      if ((list || []).length && !list.includes(quantOuttype)) {
        setQuantOuttype(list.includes("q4_k_m") ? "q4_k_m" : list[0]);
      }
    } catch (e) {
      setQuantOuttypes([]);
    }
  }

  async function pickQuantSource() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const sel = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "GGUF", extensions: ["gguf"] }],
      });
      if (sel) setQuantSource(String(sel));
    } catch (e) {
      window.alert("No se pudo abrir el selector de archivos: " + String(e));
    }
  }

  async function pickQuantCalib() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const sel = await open({ multiple: false, directory: false });
      if (sel) setQuantCalib(String(sel));
    } catch (e) {
      window.alert("No se pudo abrir el selector de archivos: " + String(e));
    }
  }

  async function runQuantize() {
    if (!quantSource.trim() || quantRunning) return;
    setQuantRunning(true);
    setQuantLog([]);
    setQuantMsg("");
    try {
      const dest =
        quantSource.replace(/\.gguf$/i, "") + "-" + quantOuttype + ".gguf";
      const res = await invoke("quantize_run", {
        source: quantSource.trim(),
        dest,
        outtype: quantOuttype,
        calibration: quantCalib.trim() || null,
      });
      setQuantLog((res && res.steps) || []);
      setQuantMsg("Modelo cuantizado: " + dest);
    } catch (e) {
      setQuantMsg(String(e).replace(/^\[.*?\]\s*/, ""));
    } finally {
      setQuantRunning(false);
    }
  }

  async function detectLocal() {
    setLocalStatus("detecting");
    try {
      const list = await invoke("providers_detect_models", {
        providerId: "ollama",
      });
      setLocalModels(list);
      setLocalStatus("ok");
    } catch (e) {
      setLocalModels(null);
      setLocalStatus("unavailable");
    }
  }

  async function detectHardware() {
    try {
      const info = await invoke("hardware_detect");
      setHardwareTier(info.tier || "");
      setRecommendedModels(
        info.default_local
          ? [info.default_local]
          : info.recommended_models || []
      );
    } catch (e) {
      setHardwareTier("");
      setRecommendedModels([]);
    }
  }

  async function setupCrafterLocal() {
    if (localInstalling) return;
    setLocalInstalling(true);
    setLocalInstallMsg("Descargando e instalando el motor local...");
    setLocalProgress("");
    let unlisten;
    let cancelUnlisten;
    try {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("local-setup-progress", (event) => {
        const p = event.payload;
        if (p && p.message) setLocalProgress(p.message);
      });
      cancelUnlisten = await listen("local-setup-cancelled", async () => {
        setLocalInstallMsg("Instalacion cancelada");
        setLocalProgress("");
      });
      const status = await invoke("local_setup", { modelId: null });
      if (unlisten) {
        unlisten();
        unlisten = null;
      }
      if (cancelUnlisten) {
        cancelUnlisten();
        cancelUnlisten = null;
      }
      setCrafterLocal(status);
      setLocalInstallMsg(
        status && status.complete
          ? "Motor local listo. Elige un modelo."
          : "Instalacion cancelada"
      );
    } catch (e) {
      if (unlisten) unlisten();
      if (cancelUnlisten) cancelUnlisten();
      setLocalInstallMsg(String(e).replace(/^\[.*?\]\s*/, ""));
    } finally {
      setLocalInstalling(false);
      setLocalProgress("");
    }
  }

  async function cancelCrafterLocal() {
    try {
      await invoke("local_setup_cancel");
    } catch (e) {
      setLocalInstallMsg(
        "No se pudo cancelar: " + String(e).replace(/^\[.*?\]\s*/, "")
      );
    }
  }

  useEffect(() => {
    if (isOpen) {
      detectLocal();
      detectHardware();
      loadOuttypes();
      setModelToInstall("");
      setTempProvider(selectedProvider);
      setTempModel(selectedModel);
      setApiKeyInput("");
      setApiKeyMsg("");
      // E1: re-detect al abrir solo si el catalogo local lleva mas de 4h sin refrescarse.
      let last = 0;
      try {
        last = Number(localStorage.getItem("stark.catalog_last_checked") || 0);
      } catch (e) {
        last = 0;
      }
      if (!last || Date.now() - last > 4 * 60 * 60 * 1000) {
        refreshCrafterLocal();
      }
    }
  }, [isOpen]);

  async function installModel() {
    if (!modelToInstall.trim() || installing) return;
    setInstalling(true);
    try {
      await invoke("providers_install_model", {
        modelName: modelToInstall.trim(),
      });
      setModelToInstall("");
      await detectLocal();
    } catch (e) {
      window.alert(String(e).replace(/^\[.*?\]\s*/, ""));
    } finally {
      setInstalling(false);
    }
  }

  async function installOllama() {
    if (installingOllama) return;
    setInstallingOllama(true);
    setOllamaInstallMsg("Descargando e instalando Ollama...");
    try {
      const msg = await invoke("ollama_install");
      setOllamaInstallMsg(msg);
      await detectLocal();
    } catch (e) {
      setOllamaInstallMsg(String(e).replace(/^\[.*?\]\s*/, ""));
    } finally {
      setInstallingOllama(false);
    }
  }

  const handlePick = (provider, model) => {
    setTempProvider(provider);
    setTempModel(model);
  };

  const handleConfirm = () => {
    onSelect(tempProvider, tempModel);
    onClose();
  };

  const needsApiKey = (providerId) => {
    const cfg = (providersConfig || []).find((p) => p.id === providerId);
    return cfg && cfg.needs_api_key;
  };

  const isFreeNoKey = (providerId) => providerId === "pollinations-free";

  const saveApiKey = async () => {
    if (!apiKeyInput.trim() || !tempProvider) return;
    setApiKeySaving(true);
    setApiKeyMsg("");
    try {
      const cfg = (providersConfig || []).find((p) => p.id === tempProvider);
      if (!cfg) return;
      await invoke("providers_save", {
        payload: {
          id: cfg.id,
          name: cfg.name,
          kind: cfg.kind || "openai_compatible",
          base_url: cfg.base_url || "",
          models: cfg.models || [],
          needs_api_key: cfg.needs_api_key,
          api_key: apiKeyInput.trim(),
        },
      });
      setApiKeyMsg("API key guardada");
      setApiKeyInput("");
    } catch (e) {
      setApiKeyMsg("Error: " + String(e));
    } finally {
      setApiKeySaving(false);
    }
  };

  if (!isOpen) return null;

  const ollamaConfig = (providersConfig || []).find((p) => p.id === "ollama");
  const fallbackModels = ollamaConfig
    ? ollamaConfig.models
    : ["qwen2.5:1.5b", "llama3.2:3b", "phi3:mini", "deepseek-coder:6.7b"];

  const starkFreeConfig = (providersConfig || []).find(
    (p) => p.id === "stark-free"
  );
  const freeModels = starkFreeConfig ? starkFreeConfig.models : [];

  const pollinationsConfig = (providersConfig || []).find(
    (p) => p.id === "pollinations-free"
  );
  const pollinationsModels = pollinationsConfig
    ? pollinationsConfig.models
    : [];

  const displayedLocalModels =
    localStatus === "ok" && localModels
      ? localModels.map((m) => ({ name: m.name, size: m.size }))
      : fallbackModels.map((m) => ({ name: m, size: "" }));

  const remoteProviders = (providersConfig || []).filter(
    (p) =>
      p.id !== "ollama" && p.id !== "stark-free" && p.id !== "pollinations-free"
  );

  const isSelected = (provider, model) =>
    tempProvider === provider && tempModel === model;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="doctor-modal"
        style={{
          maxWidth: "760px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--colors-hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 className="doctor-title" style={{ margin: 0, fontSize: "16px" }}>
            Seleccionar Modelo
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--colors-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ padding: "16px 24px 20px" }}>
          {/* Free Remote Models (Stark Free) */}
          {freeModels.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
                <Zap
                  size={14}
                  strokeWidth={1.75}
                  style={{ color: "var(--colors-ink)" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "var(--colors-ink)",
                  }}
                >
                  Stark Free
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                    padding: "1px 6px",
                    background: "var(--colors-surface-dark)",
                    borderRadius: "3px",
                    border: "1px solid var(--colors-hairline)",
                  }}
                >
                  Free tier
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-muted)",
                  lineHeight: "1.5",
                }}
              >
                Free models via OpenRouter. Requires a free API key from
                openrouter.ai
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {freeModels.map((model) => (
                  <div
                    key={`stark-free-${model}`}
                    onClick={() => handlePick("stark-free", model)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--colors-surface-card)",
                      border: isSelected("stark-free", model)
                        ? "1px solid var(--colors-primary)"
                        : "1px solid var(--colors-hairline)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--colors-ink)",
                        fontWeight: isSelected("stark-free", model)
                          ? "600"
                          : "400",
                      }}
                    >
                      {model}
                    </span>
                    {isSelected("stark-free", model) && (
                      <Check
                        size={14}
                        strokeWidth={1.75}
                        style={{ color: "var(--colors-primary)" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Free No-Key Models (Pollinations) */}
          {pollinationsModels.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
                <Unlock
                  size={14}
                  strokeWidth={1.75}
                  style={{ color: "var(--colors-ink)" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "var(--colors-ink)",
                  }}
                >
                  Gratis sin API key
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                    padding: "1px 6px",
                    background: "var(--colors-surface-dark)",
                    borderRadius: "3px",
                    border: "1px solid var(--colors-hairline)",
                  }}
                >
                  Pollinations
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-muted)",
                  lineHeight: "1.5",
                }}
              >
                Funciona sin API key, para todos. Limite de ~5 peticiones/min
                por IP.
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {pollinationsModels.map((model) => (
                  <div
                    key={`pollinations-${model}`}
                    onClick={() => handlePick("pollinations-free", model)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--colors-surface-card)",
                      border: isSelected("pollinations-free", model)
                        ? "1px solid var(--colors-primary)"
                        : "1px solid var(--colors-hairline)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--colors-ink)",
                        fontWeight: isSelected("pollinations-free", model)
                          ? "600"
                          : "400",
                      }}
                    >
                      {model}
                    </span>
                    {isSelected("pollinations-free", model) && (
                      <Check
                        size={14}
                        strokeWidth={1.75}
                        style={{ color: "var(--colors-primary)" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crafter Local (motor embebido) */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <HardDrive
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
                Crafter Local
              </span>
              <button
                onClick={refreshCrafterLocal}
                title="Refrescar catalogo local"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--colors-muted)",
                  display: "flex",
                  padding: "2px",
                }}
              >
                <RefreshCw size={12} strokeWidth={1.75} />
              </button>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  marginLeft: "auto",
                  color:
                    crafterLocal && crafterLocal.complete
                      ? "var(--colors-muted)"
                      : "var(--colors-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {crafterLocal && crafterLocal.running
                  ? "Motor en ejecucion"
                  : crafterLocal && crafterLocal.complete
                    ? "Instalado"
                    : "No instalado"}
              </span>
            </div>

            {crafterLocal &&
              crafterLocal.running &&
              crafterLocal.loaded_model && (
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "10.5px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                  }}
                >
                  Modelo cargado:{" "}
                  <span style={{ color: "var(--colors-primary)" }}>
                    {crafterLocal.loaded_model}
                  </span>
                </p>
              )}

            {localCatalog.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginBottom: "8px",
                }}
              >
                {localCatalog.map((entry) => {
                  const label = `${entry.id} — ${entry.bits} bit ${entry.quant}`;
                  const ramLabel = `${Math.round(entry.ram_mb / 1024)} GB RAM`;
                  const isDefault = recommendedModels.includes(entry.id);
                  return (
                    <div
                      key={`local-${entry.id}`}
                      onClick={() => handlePick("local", entry.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "var(--colors-surface-card)",
                        border: isSelected("local", entry.id)
                          ? "1px solid var(--colors-primary)"
                          : "1px solid var(--colors-hairline)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1px",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12.5px",
                              fontFamily: "var(--font-mono)",
                              color: "var(--colors-ink)",
                              fontWeight: isSelected("local", entry.id)
                                ? "600"
                                : "400",
                            }}
                          >
                            {entry.id}
                          </span>
                          {isDefault && (
                            <span
                              style={{
                                fontSize: "9px",
                                fontFamily: "var(--font-mono)",
                                fontWeight: "700",
                                color: "var(--colors-on-primary)",
                                background: "var(--colors-primary)",
                                padding: "1px 6px",
                                borderRadius: "999px",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              Default
                            </span>
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-muted)",
                          }}
                        >
                          {entry.quant} {entry.bits} bit ~ {ramLabel}
                        </span>
                      </div>
                      {isSelected("local", entry.id) && (
                        <Check
                          size={14}
                          strokeWidth={1.75}
                          style={{ color: "var(--colors-primary)" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-muted)",
                  lineHeight: "1.5",
                }}
              >
                Modelos cuantizados listos para tu tier de hardware.
              </p>
            )}

            {(!crafterLocal || !crafterLocal.complete) && (
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginTop: "8px",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{ display: "flex", gap: "6px", alignItems: "center" }}
                >
                  <button
                    onClick={setupCrafterLocal}
                    disabled={localInstalling}
                    className="btn-secondary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {localInstalling ? (
                      <Loader2
                        size={12}
                        strokeWidth={1.75}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={12} strokeWidth={1.75} />
                    )}
                    {localInstalling
                      ? "Descargando motor local..."
                      : "Descargar e instalar motor local"}
                  </button>
                  {localInstalling && (
                    <button
                      onClick={cancelCrafterLocal}
                      className="btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        color: "var(--colors-muted)",
                      }}
                    >
                      <X size={12} strokeWidth={1.75} />
                      Cancelar
                    </button>
                  )}
                </div>
                {localProgress && (
                  <p
                    style={{
                      margin: "0",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--colors-muted)",
                    }}
                  >
                    {localProgress}
                  </p>
                )}
                {localInstallMsg && (
                  <p
                    style={{
                      margin: "0",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: localInstallMsg.startsWith("Error")
                        ? "var(--colors-error, #ef4444)"
                        : "var(--colors-primary)",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {localInstallMsg}
                  </p>
                )}
              </div>
            )}

            {/* Cuantizacion propia (llama-quantize + imatrix) */}
            <div
              style={{
                borderTop: "1px solid var(--colors-hairline)",
                marginTop: "12px",
                paddingTop: "10px",
              }}
            >
              <button
                onClick={() => setQuantOpen(!quantOpen)}
                className="btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                }}
              >
                {quantOpen ? "Ocultar cuantizacion" : "Cuantizar modelo propio"}
              </button>

              {quantOpen && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      className="model-selector-select"
                      value={quantSource}
                      onInput={(e) => setQuantSource(e.target.value)}
                      placeholder="/ruta/a/modelo-f16.gguf"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        fontSize: "11px",
                        outline: "none",
                        borderRadius: "6px",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <button
                      onClick={pickQuantSource}
                      className="btn-secondary"
                      style={{
                        fontSize: "11px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      Examinar
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <select
                      value={quantOuttype}
                      onInput={(e) => setQuantOuttype(e.target.value)}
                      className="model-selector-select"
                      style={{
                        padding: "6px 10px",
                        fontSize: "11px",
                        outline: "none",
                        borderRadius: "6px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {quantOuttypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      className="model-selector-select"
                      value={quantCalib}
                      onInput={(e) => setQuantCalib(e.target.value)}
                      placeholder="calibracion.txt (opcional)"
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        fontSize: "11px",
                        outline: "none",
                        borderRadius: "6px",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <button
                      onClick={pickQuantCalib}
                      className="btn-secondary"
                      style={{
                        fontSize: "11px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                      }}
                    >
                      Calibracion
                    </button>
                  </div>
                  <button
                    onClick={runQuantize}
                    disabled={!quantSource.trim() || quantRunning}
                    className="btn-secondary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      alignSelf: "flex-start",
                    }}
                  >
                    {quantRunning ? (
                      <Loader2
                        size={12}
                        strokeWidth={1.75}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <Download size={12} strokeWidth={1.75} />
                    )}
                    {quantRunning ? "Cuantizando..." : "Cuantizar"}
                  </button>
                  {quantMsg && (
                    <p
                      style={{
                        margin: "0",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: quantMsg.startsWith("Error")
                          ? "var(--colors-error, #ef4444)"
                          : "var(--colors-primary)",
                        lineHeight: "1.5",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {quantMsg}
                    </p>
                  )}
                  {quantLog.length > 0 && (
                    <div
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--colors-muted)",
                        background: "var(--colors-surface-dark)",
                        border: "1px solid var(--colors-hairline)",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {quantLog.join("\n")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Local (Ollama) Section */}
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <HardDrive
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
                Local (Ollama)
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  marginLeft: "auto",
                  color:
                    localStatus === "ok"
                      ? "var(--colors-muted)"
                      : localStatus === "detecting"
                        ? "var(--colors-muted)"
                        : "var(--colors-error, #ef4444)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {localStatus === "detecting" && (
                  <Loader2
                    size={10}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {localStatus === "detecting"
                  ? "Detectando..."
                  : localStatus === "ok"
                    ? "Detectado"
                    : "No disponible"}
              </span>
            </div>

            {hardwareTier && (
              <p
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "10.5px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--colors-muted)",
                  lineHeight: "1.5",
                }}
              >
                Tier hardware:{" "}
                <span style={{ fontWeight: "700", color: "var(--colors-ink)" }}>
                  {hardwareTier}
                </span>
                {" — modelos con marca son recomendados para tu equipo"}
              </p>
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {displayedLocalModels.map((model) => {
                const isRecommended = recommendedModels.some((r) => {
                  const base = model.name.split(":")[0].toLowerCase();
                  return r.toLowerCase().includes(base);
                });
                return (
                  <div
                    key={`ollama-${model.name}`}
                    onClick={() => handlePick("ollama", model.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: isRecommended
                        ? "var(--colors-surface-dark-elevated)"
                        : "var(--colors-surface-card)",
                      border: isSelected("ollama", model.name)
                        ? "1px solid var(--colors-primary)"
                        : "1px solid var(--colors-hairline)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-ink)",
                          fontWeight: isSelected("ollama", model.name)
                            ? "600"
                            : "400",
                        }}
                      >
                        {model.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {model.size && <span>{model.size}</span>}
                        {isRecommended && (
                          <span
                            style={{
                              color: "var(--colors-primary)",
                              fontWeight: "700",
                            }}
                          >
                            recomendado
                          </span>
                        )}
                      </span>
                    </div>
                    {isSelected("ollama", model.name) && (
                      <Check
                        size={14}
                        strokeWidth={1.75}
                        style={{ color: "var(--colors-primary)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Install model — always visible */}
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <input
                className="model-selector-select"
                value={modelToInstall}
                onInput={(e) => setModelToInstall(e.target.value)}
                placeholder="nombre:tag (ej. mistral:7b)"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: "11px",
                  outline: "none",
                  borderRadius: "6px",
                }}
                disabled={installing}
                onKeyDown={(e) => {
                  if (e.key === "Enter") installModel();
                }}
              />
              <button
                onClick={installModel}
                disabled={!modelToInstall.trim() || installing}
                className="btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                }}
              >
                {installing ? (
                  <Loader2
                    size={12}
                    strokeWidth={1.75}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <Download size={12} strokeWidth={1.75} />
                )}
                Instalar
              </button>
            </div>
          </div>

          {/* Remote Providers */}
          {remoteProviders.length > 0 && (
            <div
              style={{
                borderTop: "1px solid var(--colors-hairline)",
                paddingTop: "16px",
              }}
            >
              {remoteProviders.map((provider) => (
                <div key={provider.id} style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <Globe
                      size={14}
                      strokeWidth={1.75}
                      style={{ color: "var(--colors-body)" }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "var(--colors-ink)",
                      }}
                    >
                      {provider.name}
                    </span>
                  </div>
                  {localStatus === "unavailable" && (
                    <div
                      style={{
                        marginBottom: "10px",
                        padding: "12px 14px",
                        background: "var(--colors-surface-dark)",
                        border: "1px solid var(--colors-hairline)",
                        borderRadius: "6px",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-body)",
                          lineHeight: "1.5",
                        }}
                      >
                        Ollama no esta instalado. Crafter puede instalarlo
                        automaticamente (descarga y pull del modelo recomendado
                        para tu equipo).
                      </p>
                      <button
                        onClick={installOllama}
                        disabled={installingOllama}
                        className="btn-secondary"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          padding: "6px 12px",
                          borderRadius: "6px",
                        }}
                      >
                        {installingOllama ? (
                          <Loader2
                            size={12}
                            strokeWidth={1.75}
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                        ) : (
                          <Download size={12} strokeWidth={1.75} />
                        )}
                        {installingOllama ? "Instalando..." : "Instalar Ollama"}
                      </button>
                      {ollamaInstallMsg && (
                        <p
                          style={{
                            margin: "8px 0 0 0",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-primary)",
                            lineHeight: "1.5",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {ollamaInstallMsg}
                        </p>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    {provider.models.map((model) => (
                      <div
                        key={`${provider.id}-${model}`}
                        onClick={() => handlePick(provider.id, model)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: "var(--colors-surface-card)",
                          border: isSelected(provider.id, model)
                            ? "1px solid var(--colors-primary)"
                            : "1px solid var(--colors-hairline)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12.5px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-ink)",
                          }}
                        >
                          {model}
                        </span>
                        {isSelected(provider.id, model) && (
                          <Check
                            size={14}
                            strokeWidth={1.75}
                            style={{ color: "var(--colors-primary)" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API Key Input — shown when selected provider needs one */}
          {tempProvider &&
            needsApiKey(tempProvider) &&
            !isFreeNoKey(tempProvider) && (
              <div
                style={{
                  borderTop: "1px solid var(--colors-hairline)",
                  paddingTop: "16px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <KeyRound
                    size={14}
                    strokeWidth={1.75}
                    style={{ color: "var(--colors-ink)" }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "var(--colors-ink)",
                    }}
                  >
                    API Key requerida
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                    lineHeight: "1.5",
                  }}
                >
                  {tempProvider === "stark-free" ||
                  tempProvider === "openrouter"
                    ? "Obtén una API key gratuita en openrouter.ai (sin tarjeta de crédito)."
                    : tempProvider === "opencode-zen"
                      ? "Crea tu cuenta gratuita en opencode.ai/auth y copia tu API key."
                      : `Ingresa tu API key para ${tempProvider}. Se guarda cifrada.`}
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onInput={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      tempProvider === "stark-free" ||
                      tempProvider === "openrouter"
                        ? "sk-or-v1-..."
                        : tempProvider === "opencode-zen"
                          ? "sk-... (de opencode.ai/auth)"
                          : "sk-..."
                    }
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      fontSize: "11px",
                      outline: "none",
                      borderRadius: "6px",
                      background: "var(--colors-surface-card)",
                      border: "1px solid var(--colors-hairline)",
                      color: "var(--colors-ink)",
                      fontFamily: "var(--font-mono)",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveApiKey();
                    }}
                  />
                  <button
                    onClick={saveApiKey}
                    disabled={!apiKeyInput.trim() || apiKeySaving}
                    className="btn-secondary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {apiKeySaving ? (
                      <Loader2
                        size={12}
                        strokeWidth={1.75}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    ) : (
                      <KeyRound size={12} strokeWidth={1.75} />
                    )}
                    Guardar
                  </button>
                </div>
                {apiKeyMsg && (
                  <p
                    style={{
                      margin: "6px 0 0 0",
                      fontSize: "10px",
                      fontFamily: "var(--font-mono)",
                      color: apiKeyMsg.startsWith("Error")
                        ? "var(--colors-error, #ef4444)"
                        : "var(--colors-muted)",
                    }}
                  >
                    {apiKeyMsg}
                  </p>
                )}
              </div>
            )}

          {/* Add Custom Provider */}
          <div
            style={{
              borderTop: "1px solid var(--colors-hairline)",
              paddingTop: "16px",
            }}
          >
            <button
              onClick={() => {
                onOpenProviderManager();
              }}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12.5px",
                padding: "10px 16px",
                width: "100%",
                justifyContent: "center",
                borderRadius: "6px",
              }}
            >
              <Plus size={14} strokeWidth={1.75} />
              Añadir Custom Provider
            </button>
          </div>
        </div>

        {/* Footer with Confirm */}
        <div
          style={{
            padding: "16px 24px 20px",
            borderTop: "1px solid var(--colors-hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-muted)",
            }}
          >
            {tempProvider && tempModel
              ? `${tempProvider} / ${tempModel}`
              : "Ningun modelo seleccionado"}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!tempProvider || !tempModel}
              style={{
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: "600",
                background:
                  tempProvider && tempModel
                    ? "var(--colors-primary)"
                    : "var(--colors-surface-dark-elevated)",
                color:
                  tempProvider && tempModel
                    ? "var(--colors-canvas)"
                    : "var(--colors-muted)",
                border: "none",
                borderRadius: "6px",
                cursor: tempProvider && tempModel ? "pointer" : "default",
                fontFamily: "var(--font-mono)",
                transition: "all var(--transition-fast)",
              }}
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
