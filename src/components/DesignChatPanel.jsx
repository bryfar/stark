import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  Sparkles,
  Send,
  RotateCcw,
  Paperclip,
  Sliders,
  ChevronDown,
  ChevronUp,
  Layers,
  Presentation,
  Image as ImageIcon,
  Video,
  Brain,
  Coins,
  X,
  Crosshair,
  Settings2,
  Plus,
  Mic,
} from "lucide-react";
import { CustomSelect } from "./CustomSelect";
import { CreateAssetModal, CreateRow } from "./CreateAssetModal";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import VoiceDictation from "./VoiceDictation";

export function DesignChatPanel({
  activePreset,
  onPresetSelect,
  onGenerateDesignUI,
  designVersions,
  onRestoreVersion,
  artifactType,
  onArtifactTypeChange,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  reasoning,
  setReasoning,
  tokenUsage,
  pickedElement,
  onClearPickedElement,
  providersConfig,
  onOpenProviderManager,
  workspacePath = "",
}) {
  const [designPromptInput, setDesignPromptInput] = useState("");
  const [targetScope, setTargetScope] = useState("full");
  const [designAttachments, setDesignAttachments] = useState([]);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [customAgents, setCustomAgents] = useState([]);
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [createType, setCreateType] = useState(null);
  const fileInputRef = useRef(null);

  const designVoice = useVoiceDictation({
    onText: (text) =>
      setDesignPromptInput((prev) => (prev ? `${prev} ${text}` : text)),
  });
  const handleDesignMicClick = () => {
    if (designVoice.status === "recording") {
      designVoice.stop();
    } else if (designVoice.status !== "transcribing") {
      designVoice.start();
    }
  };

  useEffect(() => {
    async function loadAssets() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const list = await invoke(
          "skills_list",
          workspacePath ? { workspacePath } : {}
        );
        setAvailableSkills(list || []);
      } catch (e) {
        setAvailableSkills([
          {
            name: "design-md",
            description: "Analizar y sintetizar sistemas de diseño",
          },
          { name: "to-spec", description: "Generar especificaciones PRD" },
          { name: "to-tickets", description: "Generar tickets tracer-bullet" },
          {
            name: "code-review",
            description: "Revisión en 2 ejes Standards / Spec",
          },
          { name: "implement", description: "Desarrollar soluciones con TDD" },
        ]);
      }
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const agents = await invoke("agents_list", { workspacePath });
        setCustomAgents(agents || []);
      } catch (e) {
        setCustomAgents([]);
      }
    }
    loadAssets();
  }, [workspacePath, assetsVersion]);

  const handleAssetCreated = ({ kind, path }) => {
    if (kind === "agent") {
      const tag = "@" + (path.split("/").pop() || "").replace(/\.md$/, "");
      setDesignPromptInput((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
    }
    setAssetsVersion((v) => v + 1);
  };

  const handlePickAttachment = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setIsDropupOpen(false);
  };

  const [extractedTokens] = useState({
    bg: "#ffffff",
    color: "#18181b",
    radius: "24px",
    font: "Berkeley Mono",
  });
  const [designHistory, setDesignHistory] = useState([]);

  const providerOptions =
    providersConfig && providersConfig.length > 0
      ? providersConfig.map((p) => ({ value: p.id, label: p.name }))
      : [
          { value: "ollama", label: "Ollama — Local" },
          { value: "openai", label: "OpenAI" },
          { value: "anthropic", label: "Anthropic" },
          { value: "gemini", label: "Google Gemini" },
        ];

  const modelOptionsByProvider =
    providersConfig && providersConfig.length > 0
      ? Object.fromEntries(
          providersConfig.map((p) => [
            p.id,
            p.models.map((m) => ({ value: m, label: m })),
          ])
        )
      : {
          ollama: [
            { value: "qwen2.5:1.5b", label: "Qwen 2.5 1.5B" },
            { value: "qwen2.5:3b", label: "Qwen 2.5 3B" },
            { value: "llama3.2:3b", label: "Llama 3.2 3B" },
            { value: "llama3.1:8b", label: "Llama 3.1 8B" },
          ],
          openai: [
            { value: "gpt-4o", label: "GPT-4o" },
            { value: "o1-mini", label: "o1-mini" },
          ],
          anthropic: [
            { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
            { value: "claude-sonnet", label: "Claude Sonnet (Thinking)" },
          ],
          gemini: [
            { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
            { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
          ],
        };

  useEffect(() => {
    const models =
      modelOptionsByProvider[selectedProvider] || modelOptionsByProvider.ollama;
    const currentValid = models.some((m) => m.value === selectedModel);
    if (!currentValid) setSelectedModel && setSelectedModel(models[0].value);
  }, [selectedProvider]);

  useEffect(() => {
    if (pickedElement) {
      setDesignPromptInput((prev) => {
        if (prev.includes(pickedElement.selector)) return prev;
        const label =
          pickedElement.label ||
          pickedElement.selector ||
          pickedElement.tagName;
        const suffix = `\n[Elemento inspeccionado: ${label}]`;
        return prev + suffix;
      });
    }
  }, [pickedElement]);

  const artifactOptions = [
    { value: "prototype", label: "Prototype — UI Alta Fidelidad" },
    { value: "hypeframe", label: "Hypeframe — Blueprint Wireframe" },
    { value: "deck", label: "Deck 16:9 — Presentación Ejecutiva" },
  ];

  const presetOptions = [
    { value: "landing", label: "Landing Page Suite" },
    { value: "dashboard-full", label: "SaaS Dashboard Suite" },
    { value: "docs", label: "Docs & Knowledge Base" },
    { value: "auth", label: "Auth & Settings Suite" },
    { value: "hero", label: "Hero Section" },
    { value: "dashboard", label: "Dashboard Widget" },
    { value: "form", label: "Form Panel" },
    { value: "grid", label: "Feature Card Grid" },
    { value: "pricing", label: "Pricing Table" },
  ];

  const scopeOptions = [
    { value: "full", label: "Scope: Lienzo Completo" },
    { value: "button", label: "Scope: Botón / CTA" },
    { value: "typography", label: "Scope: Tipografía / Títulos" },
    { value: "css", label: "Scope: Paleta de Colores CSS" },
  ];

  const pluginStubs = [
    {
      label: "Plugin UI",
      icon: Sparkles,
      stub: "Diseña un prototipo interactivo de componente UI con métricas en vivo...",
    },
    {
      label: "Plugin Image",
      icon: ImageIcon,
      stub: "Genera un wireframe visual de baja fidelidad en estilo plano blueprint...",
    },
    {
      label: "Plugin Video",
      icon: Video,
      stub: "Añade animaciones CSS y micro-interacciones de entrada al componente...",
    },
    {
      label: "Plugin Deck",
      icon: Presentation,
      stub: "Genera una presentación ejecutiva de 4 diapositivas en relación 16:9...",
    },
  ];

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAtts = files.map((f) => ({
      name: f.name,
      size: Math.round(f.size / 1024) + " KB",
    }));
    setDesignAttachments((prev) => [...prev, ...newAtts]);
  };

  const handleSend = () => {
    if (!designPromptInput.trim() && designAttachments.length === 0) return;
    const promptText = designPromptInput;
    const versionNumber = (designVersions ? designVersions.length : 0) + 1;
    const scopeLabel =
      scopeOptions.find((s) => s.value === targetScope)?.label ||
      "Scope: Lienzo Completo";
    const modelLabel =
      (modelOptionsByProvider[selectedProvider] || []).find(
        (m) => m.value === selectedModel
      )?.label || selectedModel;

    setDesignHistory((prev) => [
      ...prev,
      { sender: "user", text: `${promptText} [${scopeLabel}]` },
      {
        sender: "assistant",
        text: `Iteración v${versionNumber} aplicada con ${modelLabel} [${scopeLabel}]: "${promptText}"`,
        version: versionNumber,
      },
    ]);
    setDesignPromptInput("");
    setDesignAttachments([]);

    if (onGenerateDesignUI) {
      onGenerateDesignUI(promptText, targetScope, selectedModel, {
        provider: selectedProvider,
        reasoning,
      });
    }
  };

  return (
    <div
      style={{
        width: "320px",
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--colors-surface-soft)",
        borderRight: "1px solid var(--colors-hairline)",
        overflow: "visible",
        position: "relative",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 14px",
          borderBottom: "1px solid var(--colors-hairline)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Sparkles
          size={14}
          strokeWidth={1.75}
          style={{ color: "var(--colors-body-strong)" }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            fontWeight: "700",
            color: "var(--colors-ink)",
          }}
        >
          Design Copilot
        </span>
      </div>

      {/* Controls Stack */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          borderBottom: "1px solid var(--colors-hairline)",
        }}
      >
        {/* Artifact Type Dropdown (collapsed) */}
        <div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-muted)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Tipo de Artefacto:
          </div>
          <CustomSelect
            options={artifactOptions}
            value={artifactType || "prototype"}
            onChange={(val) =>
              onArtifactTypeChange && onArtifactTypeChange(val)
            }
          />
        </div>

        {/* Preset Selector */}
        <div>
          <div
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-muted)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Preset Base:
          </div>
          <CustomSelect
            options={presetOptions}
            value={activePreset || "landing"}
            onChange={(val) => onPresetSelect && onPresetSelect(val)}
          />
        </div>

        {/* Scope Selector */}
        <CustomSelect
          options={scopeOptions}
          value={targetScope}
          onChange={setTargetScope}
        />

        {/* Design Tokens Inspector Accordion */}
        <div
          style={{
            background: "var(--colors-surface-dark)",
            border: "1px solid var(--colors-hairline)",
            borderRadius: "4px",
          }}
        >
          <div
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            style={{
              padding: "6px 10px",
              fontSize: "11.5px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: "var(--colors-body-strong)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sliders size={12} strokeWidth={1.75} />
              <span>Design Tokens</span>
            </div>
            {isInspectorOpen ? (
              <ChevronUp size={11} />
            ) : (
              <ChevronDown size={11} />
            )}
          </div>
          {isInspectorOpen && (
            <div
              style={{
                padding: "8px 10px",
                borderTop: "1px solid var(--colors-hairline)",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--colors-body)",
              }}
            >
              {Object.entries(extractedTokens).map(([key, val]) => (
                <div
                  key={key}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ textTransform: "capitalize" }}>{key}:</span>
                  <strong style={{ color: "var(--colors-ink)" }}>{val}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Design Chat Log */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {designHistory.map((item, i) => (
          <div
            key={i}
            style={{
              padding: "8px 10px",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              lineHeight: "1.45",
              background:
                item.sender === "user"
                  ? "var(--colors-surface-dark-elevated)"
                  : "var(--colors-surface-dark)",
              border: "1px solid var(--colors-hairline)",
              color:
                item.sender === "user"
                  ? "var(--colors-ink-deep)"
                  : "var(--colors-body-strong)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span>{item.text}</span>
            {item.version && onRestoreVersion && (
              <button
                onClick={() => onRestoreVersion(item.version - 1)}
                style={{
                  alignSelf: "flex-start",
                  fontSize: "10.5px",
                  fontFamily: "var(--font-mono)",
                  padding: "2px 8px",
                  background: "var(--colors-surface-card-border)",
                  color: "var(--colors-ink)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <RotateCcw size={10} />
                <span>Restaurar v{item.version}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Plugin Stub Chips */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          borderTop: "1px solid var(--colors-hairline)",
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
        }}
      >
        {pluginStubs.map((plug, pIdx) => {
          const IconComp = plug.icon;
          return (
            <button
              key={pIdx}
              className="suggestion-chip"
              onClick={() => setDesignPromptInput(plug.stub)}
              style={{ fontSize: "11px", padding: "3px 8px" }}
            >
              <IconComp size={11} strokeWidth={1.75} />
              <span>{plug.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prompt Input Area */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 14px",
          borderTop: "1px solid var(--colors-hairline)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          position: "relative",
        }}
      >
        <VoiceDictation voice={designVoice} />
        {pickedElement && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 8px",
              background: "var(--colors-surface-dark-elevated)",
              border: "1px solid var(--colors-primary)",
              borderRadius: "4px",
              fontSize: "10.5px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-ink)",
            }}
          >
            <Crosshair
              size={11}
              strokeWidth={1.75}
              style={{ color: "var(--colors-primary)", flexShrink: 0 }}
            />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pickedElement.label ||
                pickedElement.tagName ||
                pickedElement.selector}
            </span>
            <button
              onClick={onClearPickedElement}
              title="Quitar elemento"
              style={{
                background: "none",
                border: "none",
                color: "var(--colors-muted)",
                cursor: "pointer",
                padding: "0 2px",
                flexShrink: 0,
              }}
            >
              <X size={11} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {designAttachments.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {designAttachments.map((att, aIdx) => (
              <span
                key={aIdx}
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  padding: "2px 6px",
                  background: "var(--colors-surface-dark-elevated)",
                  borderRadius: "4px",
                  border: "1px solid var(--colors-hairline)",
                  color: "var(--colors-ink)",
                }}
              >
                {att.name}
              </span>
            ))}
          </div>
        )}

        <textarea
          className="chat-textarea"
          placeholder="Describe la iteración deseada..."
          value={designPromptInput}
          onInput={(e) => setDesignPromptInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            !e.shiftKey &&
            (e.preventDefault(), handleSend())
          }
          rows={2}
          style={{
            fontSize: "12.5px",
            background: "var(--colors-surface-dark)",
            border: "1px solid var(--colors-hairline)",
            borderRadius: "4px",
            padding: "8px 10px",
          }}
        />

        {/* Compact LLM Control Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <CustomSelect
            compact
            options={providerOptions}
            value={selectedProvider || "ollama"}
            onChange={(val) => setSelectedProvider && setSelectedProvider(val)}
            style={{ flex: 1, minWidth: "0" }}
          />
          <CustomSelect
            compact
            options={
              modelOptionsByProvider[selectedProvider] ||
              modelOptionsByProvider.ollama
            }
            value={selectedModel}
            onChange={(val) => setSelectedModel && setSelectedModel(val)}
            style={{ flex: 1.4, minWidth: "0" }}
          />
          <button
            onClick={onOpenProviderManager}
            title="Gestionar proveedores"
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 7px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              background: "var(--colors-surface-dark)",
              color: "var(--colors-body-strong)",
              borderRadius: "4px",
              border: "1px solid var(--colors-hairline)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Settings2 size={11} strokeWidth={1.75} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setReasoning && setReasoning(!reasoning)}
            title="Razonamiento paso a paso"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              background: reasoning
                ? "var(--colors-primary)"
                : "var(--colors-surface-dark)",
              color: reasoning
                ? "var(--colors-on-primary)"
                : "var(--colors-body-strong)",
              borderRadius: "4px",
              border: "1px solid var(--colors-hairline)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Brain size={11} strokeWidth={1.75} />
            <span>CoT</span>
          </button>
          <span
            title="Tokens consumidos"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-body)",
              whiteSpace: "nowrap",
            }}
          >
            <Coins
              size={11}
              strokeWidth={1.75}
              style={{ color: "var(--colors-primary)" }}
            />
            <strong style={{ color: "var(--colors-ink)" }}>
              {tokenUsage ? tokenUsage.total : 0}
            </strong>
            <span>tok</span>
          </span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.txt"
          />
          <div
            style={{ position: "relative" }}
            onMouseLeave={() => setIsDropupOpen(false)}
          >
            <button
              onClick={() => setIsDropupOpen(!isDropupOpen)}
              className="btn-secondary"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <Plus size={16} strokeWidth={1.75} />
            </button>{" "}
            {isDropupOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: 0,
                  background: "var(--colors-surface-dark-elevated)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "8px",
                  padding: "6px",
                  minWidth: "180px",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <button
                  onClick={handlePickAttachment}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px 8px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: "var(--colors-ink)",
                    fontSize: "12px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Paperclip size={13} style={{ marginRight: "6px" }} />{" "}
                  Adjuntar files
                </button>

                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--colors-muted)",
                    padding: "4px 8px",
                    marginTop: "4px",
                    borderTop: "1px solid var(--colors-hairline)",
                  }}
                >
                  Agentes
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {[
                    {
                      id: "research",
                      name: "Research Agent",
                      tag: "@research",
                    },
                    { id: "coder", name: "Coder Agent", tag: "@coder" },
                    { id: "planner", name: "Planner Agent", tag: "@planner" },
                    ...customAgents,
                  ].map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        setDesignPromptInput((prev) =>
                          prev ? `${prev} ${agent.tag} ` : `${agent.tag} `
                        );
                        setIsDropupOpen(false);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "6px 8px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "var(--colors-ink)",
                        fontSize: "12px",
                        borderRadius: "4px",
                      }}
                    >
                      {agent.name}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--colors-muted)",
                    padding: "4px 8px",
                    marginTop: "4px",
                    borderTop: "1px solid var(--colors-hairline)",
                  }}
                >
                  Skills - librería de skills
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                >
                  {availableSkills.map((s) => (
                    <button
                      onClick={() => {
                        setDesignPromptInput((prev) =>
                          prev ? `${prev} /${s.name} ` : `/${s.name} `
                        );
                        setIsDropupOpen(false);
                      }}
                      key={s.name}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "6px 8px",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "var(--colors-ink)",
                        fontSize: "12px",
                        borderRadius: "4px",
                      }}
                    >
                      /{s.name}
                    </button>
                  ))}
                </div>

                <CreateRow
                  onCreate={(kind) => {
                    setCreateType(kind);
                    setIsDropupOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleDesignMicClick}
            className="btn-secondary"
            title={
              designVoice.status === "recording"
                ? "Detener e insertar transcripcion"
                : designVoice.status === "transcribing"
                  ? "Transcribiendo..."
                  : "Dictar por voz - se inserta en el prompt"
            }
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor:
                designVoice.status === "transcribing" ? "wait" : "pointer",
              padding: 0,
              background:
                designVoice.status === "recording" ||
                designVoice.status === "transcribing"
                  ? "var(--colors-primary, #ffffff)"
                  : undefined,
              color:
                designVoice.status === "recording" ||
                designVoice.status === "transcribing"
                  ? "var(--colors-canvas, #1e1e1e)"
                  : undefined,
            }}
          >
            <Mic size={16} strokeWidth={1.75} />
          </button>

          <button
            className="send-btn-stark"
            onClick={handleSend}
            style={{
              flex: 1,
              justifyContent: "center",
              padding: "6px 12px",
              fontSize: "12px",
              gap: "6px",
            }}
          >
            <Sparkles size={12} strokeWidth={1.75} />
            <span>Iterar UI</span>
            <Send size={11} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <CreateAssetModal
        kind={createType}
        onClose={() => setCreateType(null)}
        onCreated={handleAssetCreated}
        workspacePath={workspacePath}
      />
    </div>
  );
}
