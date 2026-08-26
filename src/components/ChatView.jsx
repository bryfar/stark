import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  Paperclip,
  Sparkles,
  Send,
  Brain,
  ChevronDown,
  ChevronUp,
  Cpu,
  X,
  Settings2,
  Image as ImageIcon,
  Video,
  Presentation,
  Mic,
  MicOff,
  ArrowUp,
  Plus,
  Settings,
  GitBranch,
  Minimize2,
  Zap,
} from "lucide-react";
import { Logo } from "./Logo";
import { CustomSelect } from "./CustomSelect";
import { translations } from "../i18n";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CreateAssetModal, CreateRow } from "./CreateAssetModal";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import VoiceDictation from "./VoiceDictation";

export function ChatView({
  selectedModel,
  selectedProvider,
  setSelectedProvider,
  agentMode,
  setAgentMode,
  reasoning,
  setReasoning,
  setProposedEdit,
  setProposedCommand,
  providersConfig,
  onOpenProviderManager,
  onOpenModelSelector,
  activeChatId,
  messages,
  onMessagesChange,
  onEnsureChat,
  onSetChatTitle,
  onForkChat,
  onCompactChat,
  workspacePath,
  lang = "es",
  fileTree = [],
  conversations = [],
  chatMeta = {},
  onSelectChat,
}) {
  if (typeof window !== "undefined" && window.__renderProbe__)
    window.__renderProbe__("ChatView");
  const t = translations[lang] ? translations[lang].chat : translations.es.chat;
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [openThinkingIdx, setOpenThinkingIdx] = useState({});
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [createType, setCreateType] = useState(null);
  const [customAgents, setCustomAgents] = useState([]);
  const [customPlugins, setCustomPlugins] = useState([]);
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [showTreeMap, setShowTreeMap] = useState(false);

  const getActiveFamilyTree = () => {
    if (!activeChatId || !conversations || !chatMeta) return null;

    let rootId = activeChatId;
    let visited = new Set();
    while (rootId) {
      visited.add(rootId);
      const meta = chatMeta[rootId];
      if (
        meta &&
        meta.parent_id &&
        conversations.some((x) => x.id === meta.parent_id) &&
        !visited.has(meta.parent_id)
      ) {
        rootId = meta.parent_id;
      } else {
        break;
      }
    }

    const rootConv = conversations.find((c) => c.id === rootId);
    if (!rootConv) return null;

    const buildNode = (conv) => {
      const meta = chatMeta[conv.id] || {};
      const children = conversations.filter((c) => {
        const m = chatMeta[c.id];
        return m && m.parent_id === conv.id;
      });
      return {
        id: conv.id,
        title: conv.title || "Conversación",
        kind: meta.kind || "root",
        isActive: conv.id === activeChatId,
        children: children.map(buildNode),
      };
    };

    return buildNode(rootConv);
  };
  const fileInputRef = useRef(null);
  const dropupRef = useRef(null);

  const findArtifacts = (text) => {
    if (!text) return null;
    const htmlMatch = text.match(/```html\n([\s\S]*?)\n```/);
    if (htmlMatch) {
      return { type: "html", title: "HTML Preview", content: htmlMatch[1] };
    }
    const mermaidMatch = text.match(/```mermaid\n([\s\S]*?)\n```/);
    if (mermaidMatch) {
      return {
        type: "mermaid",
        title: "Mermaid Diagram",
        content: mermaidMatch[1],
      };
    }
    return null;
  };

  // Compactation heuristic (D-t2): suggest once the estimated token count
  // (chars/4) crosses the provider threshold. Conservative floor so the banner
  // never appears on short chats.
  const compactThreshold =
    selectedProvider === "local" || selectedProvider === "ollama"
      ? 4096
      : 12000;
  const estTokens = Math.floor(
    (messages || []).reduce((n, m) => n + (m.text || "").length, 0) / 4
  );
  const suggestCompact = messages.length >= 8 && estTokens > compactThreshold;

  // @ dropup state
  const [atDropdownOpen, setAtDropdownOpen] = useState(false);
  const [atQuery, setAtQuery] = useState("");
  const [atSelectedIndex, setAtSelectedIndex] = useState(0);
  const [atDropdownStartIdx, setAtDropdownStartIdx] = useState(-1);

  const filteredFiles = (fileTree || [])
    .filter((f) => f.name.toLowerCase().includes(atQuery.toLowerCase()))
    .slice(0, 8);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx !== -1 && !/\s/.test(textBeforeCursor.slice(lastAtIdx + 1))) {
      const query = textBeforeCursor.slice(lastAtIdx + 1);
      setAtQuery(query);
      setAtDropdownOpen(true);
      setAtDropdownStartIdx(lastAtIdx);
      setAtSelectedIndex(0);
    } else {
      setAtDropdownOpen(false);
    }
  };

  const handleSelectFile = async (fileName) => {
    setAtDropdownOpen(false);
    const val = input;
    const start = atDropdownStartIdx;
    const textarea = document.getElementById("chat-textarea-element");
    const selectionStart = textarea ? textarea.selectionStart : val.length;

    const updatedInput =
      val.slice(0, start) + `file:${fileName} ` + val.slice(selectionStart);
    setInput(updatedInput);

    // Focus back on textarea and move cursor to end of inserted file token
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const cursorPosition = start + fileName.length + 6; // 'file:' + fileName + ' '
        textarea.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 50);

    // Load file as attachment
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const fullPath = workspacePath + "/" + fileName;
      const att = await invoke("attachment_read", { path: fullPath });
      if (att) {
        setAttachments((prev) => [
          ...prev.filter((a) => a.name !== fileName),
          {
            name: fileName,
            path_text: att.path_text || "",
            kind: att.kind || "text",
            size: Math.round((att.size || 0) / 1024) + " KB",
            type: "tauri",
          },
        ]);
      }
    } catch (e) {
      console.error("Error reading file attachment:", e);
    }
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isDropupOpen &&
        dropupRef.current &&
        !dropupRef.current.contains(e.target)
      ) {
        setIsDropupOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropupOpen]);

  const voice = useVoiceDictation({
    onText: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
  });

  const [continuousMic, setContinuousMic] = useState(false);

  const toggleContinuousMic = async () => {
    const nextVal = !continuousMic;
    setContinuousMic(nextVal);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      if (nextVal) {
        await invoke("start_continuous_listening");
      } else {
        await invoke("stop_continuous_listening");
      }
    } catch (err) {
      console.error("Error toggling continuous mic:", err);
      setContinuousMic(false);
    }
  };

  useEffect(() => {
    let unlisten;
    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen("voice-speech-processed", (event) => {
          const text = event.payload;
          if (text && text.trim()) {
            handleSend(text);
          }
        });
      } catch (err) {
        console.error(
          "Error setting up continuous listening event listener:",
          err
        );
      }
    };
    setupListener();
    return () => {
      if (unlisten) {
        unlisten.then((f) => f());
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke("stop_continuous_listening").catch(() => {});
      });
    };
  }, []);

  const handleMicClick = () => {
    if (voice.status === "recording") {
      voice.stop();
    } else if (voice.status !== "transcribing") {
      voice.start();
    }
  };

  const chatIdRef = useRef(activeChatId);
  useEffect(() => {
    chatIdRef.current = activeChatId;
  }, [activeChatId]);

  const providerRef = useRef(selectedProvider);
  useEffect(() => {
    providerRef.current = selectedProvider;
  }, [selectedProvider]);

  const [escalation, setEscalation] = useState(null);
  const escalationRef = useRef(null);
  useEffect(() => {
    escalationRef.current = escalation;
  }, [escalation]);

  // E2: auto-escalada opt-in. Manual por defecto; cuando se activa, una
  // respuesta local de baja confianza escala sola en vez de mostrar el banner.
  const [autoEscalate, setAutoEscalate] = useState(() => {
    try {
      return localStorage.getItem("stark.auto_escalate") === "1";
    } catch (e) {
      return false;
    }
  });
  const autoEscalateRef = useRef(autoEscalate);
  useEffect(() => {
    autoEscalateRef.current = autoEscalate;
  }, [autoEscalate]);
  const toggleAutoEscalate = () => {
    setAutoEscalate((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("stark.auto_escalate", next ? "1" : "0");
      } catch (e) {
        /* noop */
      }
      return next;
    });
  };

  useEffect(() => {
    setInput("");
    setAttachments([]);
    setTokensUsed(0);
    setSelectedSkill(null);
  }, [activeChatId]);

  useEffect(() => {
    async function loadAssets() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const list = await invoke("skills_list", {
          workspacePath: workspacePath,
        });
        setAvailableSkills(list);
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
        const agents = await invoke("agents_list", {
          workspacePath: workspacePath,
        });
        setCustomAgents(agents || []);
      } catch (e) {
        setCustomAgents([]);
      }
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const plugins = await invoke("plugins_list", {
          workspacePath: workspacePath,
        });
        setCustomPlugins(plugins || []);
      } catch (e) {
        setCustomPlugins([]);
      }
    }
    loadAssets();
  }, [workspacePath, assetsVersion]);

  const reloadAssets = () => setAssetsVersion((v) => v + 1);

  const handleAssetCreated = ({ kind, path }) => {
    if (kind === "agent") {
      const tag = "@" + (path.split("/").pop() || "").replace(/\.md$/, "");
      setInput((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
    } else if (kind === "skill") {
      const slug = (path.split("/").slice(-2, -1)[0] || "").replace(
        /\.md$/,
        ""
      );
      if (slug) setSelectedSkill({ name: slug });
    }
    reloadAssets();
  };

  useEffect(() => {
    let unlisten;
    async function setupListener() {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen("chat-token", (event) => {
          const payload = event.payload;
          // Filtra eventos de otras sesiones: cada stream lleva su chat_id.
          if (payload.chat_id && payload.chat_id !== chatIdRef.current) return;
          if (payload.token) {
            onMessagesChange(chatIdRef.current, (prev) => {
              const list = prev || [];
              const last = list[list.length - 1];
              if (last && last.sender === "assistant" && last.isStreaming) {
                return [
                  ...list.slice(0, -1),
                  {
                    ...last,
                    text: last.text + payload.token,
                    model: selectedModel,
                  },
                ];
              }
              return [
                ...list,
                {
                  sender: "assistant",
                  text: payload.token,
                  isStreaming: true,
                  model: selectedModel,
                },
              ];
            });
          }

          if (payload.usage) {
            setTokensUsed((prev) => prev + payload.usage.total_tokens);
          }

          if (payload.error) {
            onMessagesChange(chatIdRef.current, (prev) => [
              ...(prev || []),
              { sender: "assistant", text: `Error: ${payload.error}` },
            ]);
            setIsLoading(false);
          }

          if (payload.done) {
            onMessagesChange(chatIdRef.current, (prev) => {
              const list = prev || [];
              const last = list[list.length - 1];
              if (last && last.isStreaming) {
                const updated = [
                  ...list.slice(0, -1),
                  { ...last, isStreaming: false },
                ];
                if (providerRef.current === "local") {
                  const finalText = last.text || "";
                  import("@tauri-apps/api/core")
                    .then(({ invoke }) =>
                      invoke("assess_confidence", { text: finalText })
                    )
                    .then((a) => {
                      setEscalation(a);
                      if (a && a.low && autoEscalateRef.current) {
                        setTimeout(() => escalateToCloud(), 0);
                      }
                    })
                    .catch(() => setEscalation({ low: false, reason: null }));
                } else {
                  setEscalation(null);
                }
                return updated;
              }
              return list;
            });
            setIsLoading(false);
          }
        });
      } catch (e) {
        // Fallback for browser mode
      }
    }
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const pickFileTauri = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ multiple: true, directory: false });
      const paths = Array.isArray(selected)
        ? selected
        : selected
          ? [selected]
          : [];
      if (!paths.length) return;
      const { invoke } = await import("@tauri-apps/api/core");
      const reads = await Promise.all(
        paths.map((p) =>
          invoke("attachment_read", { path: p }).catch(() => null)
        )
      );
      const newAttachments = reads.filter(Boolean).map((att) => ({
        name: att.name,
        path_text: att.path_text || "",
        kind: att.kind || "text",
        size: Math.round((att.size || 0) / 1024) + " KB",
        type: "tauri",
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (e) {
      // Fallback al file input (browser/fallo del dialog)
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const isTauri =
      typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (isTauri && (!files || files.length === 0)) {
      await pickFileTauri();
      return;
    }
    const out = [];
    for (const file of files || []) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`El archivo ${file.name} excede el límite de 5MB`);
        continue;
      }
      let path_text = "";
      try {
        path_text = await file.text();
      } catch {
        path_text = "";
      }
      out.push({
        name: file.name,
        size: Math.round(file.size / 1024) + " KB",
        type: file.type || "text/plain",
        path_text,
        kind: "text",
      });
    }
    setAttachments((prev) => [...prev, ...out]);
  };

  const handlePickAttachment = async () => {
    const isTauri =
      typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (isTauri) {
      await pickFileTauri();
    } else {
      fileInputRef.current?.click();
    }
    setIsDropupOpen(false);
  };

  const toggleThinking = (idx) => {
    setOpenThinkingIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleStop = async () => {
    setIsLoading(false);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("chat_abort", { chatId: chatIdRef.current });
    } catch (e) {
      // chat_abort es best-effort; si falla, el stream termina igual al cerrar el done
    }
    onMessagesChange(chatIdRef.current, (prev) => {
      const list = prev || [];
      const last = list[list.length - 1];
      if (last && last.isStreaming) {
        return [...list.slice(0, -1), { ...last, isStreaming: false }];
      }
      return list;
    });
  };

  const handleSend = async (textOverride) => {
    const textToSend = typeof textOverride === "string" ? textOverride : input;
    if (!textToSend.trim() && attachments.length === 0) return;
    if (isLoading) return;

    let fullPrompt = textToSend;
    if (selectedSkill) {
      fullPrompt = `[Skill Activa: /${selectedSkill.name}]\n${fullPrompt}`;
    }
    if (attachments.length > 0) {
      const attBlock = attachments
        .map((a) => {
          if (a.path_text) {
            return `\n\n### Adjunto: ${a.name}\n${a.path_text}`;
          }
          return `\n\n[Adjunto: ${a.name} (${a.size}) — contenido binario, referencia]`;
        })
        .join("");
      fullPrompt += attBlock;
    }

    const chatId = activeChatId || onEnsureChat();

    const userMsg = { sender: "user", text: fullPrompt };
    onMessagesChange(chatId, (prev) => [...(prev || []), userMsg]);
    if (!(messages || []).some((m) => m.sender === "user")) {
      onSetChatTitle(chatId, fullPrompt.replace(/\s*\n\s*/g, " ").slice(0, 42));
    }
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setEscalation(null);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chatMessages = (messages || []).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      // US 10: contexto heurístico — selecciona los archivos del repo cuyo
      // path coincide con tokens del prompt e inyecta sus contenidos acotados.
      let promptWithContext = fullPrompt;
      try {
        const files = await invoke("repo_context", {
          workspacePath: workspacePath,
          prompt: textToSend,
        });
        if (files && files.length) {
          const ctxBlock = files
            .map((f) => `--- ${f.relative_path}\n${f.content}`)
            .join("\n\n");
          promptWithContext = `${fullPrompt}\n\n[Contexto del repositorio]\n${ctxBlock}`;
        }
      } catch (e) {
        // Sin contexto disponible: continuar con el prompt plano
      }

      chatMessages.push({ role: "user", content: promptWithContext });

      await invoke("send_chat_message", {
        payload: {
          provider: selectedProvider,
          model: selectedModel,
          messages: chatMessages,
          reasoning: reasoning,
          api_key: null,
          chat_id: chatId,
        },
      });
    } catch (err) {
      setTimeout(() => {
        const modeBadge =
          agentMode === "plan"
            ? "Modo Plan - Análisis"
            : "Modo Build - Edición Disco";
        const reasoningContent = reasoning
          ? `CoT Reasoning (Pasos de Razonamiento):\n1. Inspección del contexto del prompt.\n2. Selección de la estrategia en ${modeBadge}.\n3. Generación de respuesta optimizada para ${selectedProvider} (${selectedModel}).`
          : null;

        onMessagesChange(chatId, (prev) => [
          ...(prev || []),
          {
            sender: "assistant",
            thinking: reasoningContent,
            text: `**${modeBadge}**\nRespuesta generada para tu solicitud con el proveedor **${selectedProvider}** (${selectedModel}).\n\n¿Quieres que prepare una edición en el workspace o ejecute un test en la terminal sandbox?`,
            actions:
              agentMode === "build"
                ? [
                    {
                      label: "Ver Diff Propuesto",
                      type: "edit",
                      edit: {
                        filePath: "src/App.jsx",
                        originalContent: "// Archivo original",
                        newContent: "// Archivo modificado por Stark",
                        description:
                          "Actualizar integración de UI de Stark Design System",
                      },
                    },
                    {
                      label: "Iniciar Terminal Sandbox",
                      type: "command",
                      command: {
                        command: "npm run dev",
                        workspacePath: workspacePath,
                      },
                    },
                  ]
                : [],
          },
        ]);
        setIsLoading(false);
      }, 500);
    }
  };

  const handleKeyDown = (e) => {
    if (atDropdownOpen && filteredFiles.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtSelectedIndex((prev) => (prev + 1) % filteredFiles.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtSelectedIndex(
          (prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectFile(filteredFiles[atSelectedIndex].name);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAtDropdownOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLocal = selectedProvider === "ollama" || selectedProvider === "local";

  const [localCatalog, setLocalCatalog] = useState([]);
  useEffect(() => {
    if (selectedProvider !== "local") return;
    let cancelled = false;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("local_catalog", { tier: null }))
      .then((cat) => {
        if (!cancelled) setLocalCatalog(cat || []);
      })
      .catch(() => {
        if (!cancelled) setLocalCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvider]);

  const providerOptions =
    providersConfig && providersConfig.length > 0
      ? providersConfig.map((p) => ({ value: p.id, label: p.name }))
      : [
          { value: "local", label: "Crafter Local" },
          { value: "ollama", label: "Ollama Local" },
          { value: "anthropic", label: "Anthropic API" },
          { value: "openai", label: "OpenAI API" },
          { value: "gemini", label: "Google Gemini" },
        ];

  const activeProviderConfig = (providersConfig || []).find(
    (p) => p.id === selectedProvider
  );
  const providerModels = activeProviderConfig
    ? activeProviderConfig.models
    : [];

  const localModelOptions =
    selectedProvider === "local" && localCatalog.length > 0
      ? localCatalog.map((m) => ({
          value: m.id,
          label: `${m.id} — ${m.bits} bit ${m.quant}`,
        }))
      : [];

  const modelOptions =
    localModelOptions.length > 0
      ? localModelOptions
      : providerModels.length > 0
        ? providerModels.map((m) => ({ value: m, label: m }))
        : selectedProvider === "local"
          ? [{ value: "qwen-0.5b-q2k", label: "Qwen 0.5B Q2" }]
          : selectedProvider === "ollama"
            ? [
                { value: "qwen2.5:1.5b", label: "Qwen 2.5 1.5B" },
                { value: "llama3.2:3b", label: "Llama 3.2 3B" },
                { value: "phi3:mini", label: "Phi-3 Mini" },
                { value: "deepseek-coder:6.7b", label: "DeepSeek 6.7B" },
              ]
            : selectedProvider === "anthropic"
              ? [
                  {
                    value: "claude-3-5-sonnet-20241022",
                    label: "Claude 3.5 Sonnet",
                  },
                  {
                    value: "claude-3-5-haiku-20241022",
                    label: "Claude 3.5 Haiku",
                  },
                  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
                ]
              : selectedProvider === "openai"
                ? [
                    { value: "gpt-4o", label: "GPT-4o" },
                    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
                    { value: "o1-mini", label: "o1-mini" },
                  ]
                : [
                    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
                    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
                  ];

  const handleProviderChange = (prov) => {
    setSelectedProvider(prov);
    setEscalation(null);
    const cfg = (providersConfig || []).find((p) => p.id === prov);
    if (cfg && cfg.models && cfg.models.length > 0) {
      setSelectedModel(cfg.models[0]);
    } else if (prov === "ollama") setSelectedModel("qwen2.5:1.5b");
    else if (prov === "local")
      setSelectedModel(localCatalog[0] ? localCatalog[0].id : "qwen-0.5b-q2k");
    else if (prov === "anthropic")
      setSelectedModel("claude-3-5-sonnet-20241022");
    else if (prov === "openai") setSelectedModel("gpt-4o");
    else if (prov === "gemini") setSelectedModel("gemini-1.5-flash");
  };

  const escalateToCloud = async () => {
    const cloud = (providersConfig || []).find(
      (p) => !["local", "ollama", "lmstudio"].includes(p.id)
    );
    if (!cloud || !cloud.models || !cloud.models.length) {
      window.alert(t.noCloudProvider);
      return;
    }
    const reason = escalationRef.current && escalationRef.current.reason;
    setEscalation(null);
    setIsLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const chatMessages = (messages || []).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));
      chatMessages.push({
        role: "user",
        content: `[${t.escalatePrefix} ${cloud.name}: ${reason || t.escalateDefaultReason}]. ${t.escalateReply}`,
      });
      await invoke("send_chat_message", {
        payload: {
          provider: cloud.id,
          model: cloud.models[0],
          messages: chatMessages,
          reasoning: reasoning,
          api_key: null,
          chat_id: chatIdRef.current,
        },
      });
      setSelectedProvider(cloud.id);
      setSelectedModel(cloud.models[0]);
    } catch (e) {
      window.alert(t.escalateError + ": " + String(e));
      setIsLoading(false);
    }
  };

  const skillOptions = [
    { value: "", label: "Skill: Seleccionar" },
    ...availableSkills.map((s) => ({
      value: s.name,
      label: `/${s.name} — ${s.description.slice(0, 22)}`,
    })),
  ];

  const pluginInjectors = [
    {
      label: "Plugin UI",
      icon: Sparkles,
      stub: "Diseña un prototipo interactivo de componente UI con métricas en vivo...",
    },
    {
      label: "Plugin Image",
      icon: ImageIcon,
      stub: "Genera un wireframe visual de baja fidelidad en estilo plano azul blueprint...",
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
    ...customPlugins.map((p) => ({
      label: `Plugin ${p.name}`,
      icon: Sparkles,
      stub: p.prompt_template || "",
    })),
  ];

  const handleSuggestion = (stub) => {
    setInput(stub);
    setTimeout(() => {
      const el = document.getElementById("chat-textarea-element");
      if (el) el.focus();
    }, 0);
  };

  return (
    <div
      className="chat-wrapper"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minWidth: 0,
          borderRight: activeArtifact
            ? "1px solid var(--colors-hairline)"
            : "none",
        }}
      >
        {/* Active Branch Path Breadcrumbs */}
        {activeChatId && conversations && chatMeta && (
          <div
            style={{
              padding: "10px 16px",
              borderBottom: "1px solid var(--colors-hairline)",
              background: "var(--colors-surface-dark-soft)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              fontSize: "11.5px",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              style={{
                color: "var(--colors-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <GitBranch size={13} />
              <span>{lang === "es" ? "Rama activa:" : "Active branch:"}</span>
            </span>
            {(() => {
              const chain = [];
              let currId = activeChatId;
              let visited = new Set();
              while (currId) {
                visited.add(currId);
                const meta = chatMeta[currId] || {};
                const c = conversations.find((conv) => conv.id === currId);
                if (c) {
                  chain.push({ id: currId, title: c.title || "Sin título" });
                  if (meta.parent_id && !visited.has(meta.parent_id)) {
                    currId = meta.parent_id;
                  } else {
                    break;
                  }
                } else {
                  break;
                }
              }
              chain.reverse();

              return chain.map((node, i) => (
                <div
                  key={node.id}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {i > 0 && (
                    <span style={{ color: "var(--colors-muted)" }}>›</span>
                  )}
                  <button
                    onClick={() => onSelectChat && onSelectChat(node.id)}
                    style={{
                      background:
                        node.id === activeChatId
                          ? "var(--colors-primary-soft)"
                          : "transparent",
                      border: "none",
                      color:
                        node.id === activeChatId
                          ? "var(--colors-primary)"
                          : "var(--colors-ink)",
                      cursor: "pointer",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: node.id === activeChatId ? "700" : "normal",
                      fontSize: "11.5px",
                      maxWidth: "140px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={node.title}
                  >
                    {node.title}
                  </button>
                </div>
              ));
            })()}
          </div>
        )}
        <div className="messages-list">
          {messages.length === 0 && !isLoading && (
            <div className="chat-empty-state">
              <Logo size={84} />
              <h1 className="app-brand-wordmark">Stark</h1>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--colors-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {t.subtitle}
              </span>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div className={`message-bubble ${msg.sender}`} key={idx}>
              {msg.thinking && (
                <div className="thinking-block">
                  <div
                    className="thinking-header"
                    onClick={() => toggleThinking(idx)}
                  >
                    <Brain
                      size={14}
                      strokeWidth={1.75}
                      style={{ color: "var(--colors-body-strong)" }}
                    />
                    <span>{t.reasoning} (CoT)</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10px",
                      }}
                    >
                      {openThinkingIdx[idx] ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                    </span>
                  </div>
                  {openThinkingIdx[idx] && (
                    <div className="thinking-content">{msg.thinking}</div>
                  )}
                </div>
              )}
              {msg.sender === "assistant" && msg.model && (
                <div
                  style={{
                    fontSize: "10.5px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                    marginBottom: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    opacity: 0.85,
                    padding: "1px 5px",
                    background: "var(--colors-surface-dark-soft)",
                    borderRadius: "3px",
                    border: "1px solid var(--colors-hairline)",
                  }}
                >
                  <span>[ {msg.model} ]</span>
                </div>
              )}
              {msg.sender === "assistant" && findArtifacts(msg.text) && (
                <button
                  onClick={() => setActiveArtifact(findArtifacts(msg.text))}
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    marginBottom: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderRadius: "4px",
                    border: "1px solid var(--colors-primary)",
                    color: "var(--colors-primary)",
                    cursor: "pointer",
                    marginLeft: msg.model ? "8px" : "0",
                  }}
                >
                  <span>
                    ⚡{" "}
                    {findArtifacts(msg.text).type === "html"
                      ? "Ver Preview HTML"
                      : "Ver Diagrama"}
                  </span>
                </button>
              )}
              <div>
                <MarkdownRenderer content={msg.text} />
              </div>
              {msg.actions && msg.actions.length > 0 && (
                <div
                  style={{
                    marginTop: "14px",
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {msg.actions.map((action, ai) => (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        action.type === "edit"
                          ? setProposedEdit(action.edit)
                          : action.type === "command" &&
                            setProposedCommand(action.command);
                      }}
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      key={ai}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message-bubble assistant">
              <div className="thinking-block">
                <div className="thinking-header">
                  <Brain size={14} strokeWidth={1.75} />
                  <span>
                    {t.reasoningIn}{" "}
                    {agentMode === "plan" ? t.planMode : t.buildMode}...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {suggestCompact && !isLoading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              margin: "0 16px 10px",
              padding: "10px 14px",
              background: "var(--colors-surface-dark-elevated)",
              border: "1px solid var(--colors-hairline-strong)",
              borderRadius: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--colors-ink)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Minimize2 size={14} strokeWidth={1.75} />
              <span>
                {t.compactSuggest} ({estTokens.toLocaleString()} tokens)
              </span>
            </span>
            <button
              onClick={() => onCompactChat && onCompactChat(activeChatId)}
              className="btn-secondary"
              style={{
                fontSize: "11px",
                padding: "6px 12px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
              }}
            >
              {t.compactAction}
            </button>
          </div>
        )}

        {escalation && escalation.low && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              margin: "0 16px 10px",
              padding: "10px 14px",
              background: "var(--colors-surface-dark-elevated)",
              border: "1px solid var(--colors-hairline-strong)",
              borderRadius: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--colors-ink)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={14} strokeWidth={1.75} />
              <span>{escalation.reason || t.escalateBanner}</span>
            </span>
            <button
              onClick={escalateToCloud}
              className="btn-secondary"
              style={{
                fontSize: "11px",
                padding: "6px 12px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
              }}
            >
              {t.escalateAction}
            </button>
          </div>
        )}

        <div className="chat-input-container">
          <div className="chat-input-card" style={{ position: "relative" }}>
            <VoiceDictation voice={voice} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--colors-hairline)",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <button
                  onClick={onOpenModelSelector}
                  className="btn-secondary"
                  style={{
                    fontSize: "12px",
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {selectedModel || t.noModel} <ChevronDown size={14} />
                </button>
                <span
                  className={isLocal ? "badge-offline" : "badge-cloud"}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Cpu size={12} strokeWidth={1.75} />
                  <span>{isLocal ? "Offline" : "Cloud"}</span>
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <button
                  onClick={() => setShowTreeMap(!showTreeMap)}
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "5px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    border: showTreeMap
                      ? "1px solid var(--colors-primary)"
                      : "1px solid var(--colors-hairline)",
                    background: showTreeMap
                      ? "var(--colors-primary-soft)"
                      : "transparent",
                    color: showTreeMap
                      ? "var(--colors-primary-strong)"
                      : "inherit",
                  }}
                  title={
                    lang === "es"
                      ? "Visualizar Árbol de Bifurcaciones"
                      : "Visualize Branch Tree"
                  }
                >
                  <GitBranch size={13} strokeWidth={1.75} />{" "}
                  {lang === "es" ? "Ver Árbol" : "Show Tree"}
                </button>
                <button
                  onClick={() => onForkChat && onForkChat(activeChatId)}
                  disabled={!activeChatId}
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "5px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title={t.forkAction}
                >
                  <GitBranch size={13} strokeWidth={1.75} /> {t.forkAction}
                </button>
                <button
                  onClick={() => onCompactChat && onCompactChat(activeChatId)}
                  disabled={!activeChatId}
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "5px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title={t.compactAction}
                >
                  <Minimize2 size={13} strokeWidth={1.75} /> {t.compactAction}
                </button>
                <button
                  onClick={onOpenProviderManager}
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "5px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                  title="Gestionar proveedores"
                >
                  <Settings2 size={13} strokeWidth={1.75} /> Proveedores
                </button>
              </div>
            </div>

            {atDropdownOpen && filteredFiles.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% - 10px)",
                  left: "16px",
                  right: "16px",
                  background: "var(--colors-surface-dark)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "8px",
                  boxShadow: "0 -4px 16px rgba(0,0,0,0.3)",
                  zIndex: 50,
                  maxHeight: "180px",
                  overflowY: "auto",
                  padding: "6px",
                }}
              >
                {filteredFiles.map((f, fi) => (
                  <div
                    onClick={() => handleSelectFile(f.name)}
                    key={f.name}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      color:
                        fi === atSelectedIndex
                          ? "var(--colors-on-primary)"
                          : "var(--colors-body-strong)",
                      background:
                        fi === atSelectedIndex
                          ? "var(--colors-primary)"
                          : "transparent",
                    }}
                  >
                    {f.name}
                  </div>
                ))}
              </div>
            )}

            <textarea
              id="chat-textarea-element"
              className="chat-textarea"
              placeholder={
                agentMode === "plan"
                  ? lang === "es"
                    ? "¿Qué quieres diseñar o analizar hoy? Escribe una consulta o instrucción..."
                    : "What do you want to design or analyze today? Type a query or instruction..."
                  : lang === "es"
                    ? "Describe la modificación de código para editar a disco en Stark..."
                    : "Describe the code modification to write to disk in Stark..."
              }
              value={input}
              onInput={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={3}
            />

            <div
              className="chat-input-toolbar"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingTop: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  ref={dropupRef}
                  style={{ position: "relative" }}
                  onMouseLeave={() => setIsDropupOpen(false)}
                >
                  <button
                    onClick={() => setIsDropupOpen(!isDropupOpen)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "var(--colors-surface-dark-elevated)",
                      border: "1px solid var(--colors-hairline)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--colors-ink)",
                    }}
                  >
                    <Plus size={16} strokeWidth={1.75} />
                  </button>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.log,.md,.js,.ts,.rs,.png,.jpg,.jpeg"
                  />
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
                        {lang === "es" ? "Adjuntar files" : "Attach files"}
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
                        {lang === "es" ? "Agentes" : "Agents"}
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
                          {
                            id: "planner",
                            name: "Planner Agent",
                            tag: "@planner",
                          },
                          ...customAgents,
                        ].map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              setInput((prev) =>
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
                        {lang === "es"
                          ? "Skills - librería de skills"
                          : "Skills - skills library"}
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
                              setSelectedSkill(s);
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
                        lang={lang}
                        onCreate={(kind) => {
                          setCreateType(kind);
                          setIsDropupOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="mode-toggle-group" style={{ margin: 0 }}>
                  <button
                    className={`btn-mode-toggle ${agentMode === "plan" ? "active" : ""}`}
                    onClick={() => setAgentMode("plan")}
                  >
                    {t.planMode}
                  </button>
                  <button
                    className={`btn-mode-toggle ${agentMode === "build" ? "active" : ""}`}
                    onClick={() => setAgentMode("build")}
                  >
                    {t.buildMode}
                  </button>
                </div>

                <button
                  onClick={() => setReasoning(!reasoning)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "16px",
                    background: reasoning
                      ? "var(--colors-surface-dark-elevated)"
                      : "transparent",
                    border: reasoning
                      ? "1px solid var(--colors-hairline-strong)"
                      : "1px solid transparent",
                    color: reasoning
                      ? "var(--colors-ink)"
                      : "var(--colors-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <Brain size={14} strokeWidth={1.75} /> CoT
                </button>

                <button
                  onClick={toggleAutoEscalate}
                  title={t.autoEscalateToggle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    padding: "4px 8px",
                    borderRadius: "16px",
                    background: autoEscalate
                      ? "var(--colors-surface-dark-elevated)"
                      : "transparent",
                    border: autoEscalate
                      ? "1px solid var(--colors-hairline-strong)"
                      : "1px solid transparent",
                    color: autoEscalate
                      ? "var(--colors-ink)"
                      : "var(--colors-muted)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <Settings size={14} strokeWidth={1.75} />{" "}
                  {t.autoEscalateLabel}
                </button>

                {selectedSkill && (
                  <span
                    style={{
                      fontSize: "11.5px",
                      fontFamily: "var(--font-mono)",
                      background: "var(--colors-surface-dark-elevated)",
                      color: "var(--colors-ink-deep)",
                      padding: "4px 10px",
                      borderRadius: "16px",
                      border: "1px solid var(--colors-hairline-strong)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Zap size={12} strokeWidth={1.75} />
                    <span>/{selectedSkill.name}</span>
                    <button
                      onClick={() => setSelectedSkill(null)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--colors-muted)",
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}

                {attachments.map((att, ai) => (
                  <span
                    key={ai}
                    style={{
                      fontSize: "11.5px",
                      fontFamily: "var(--font-mono)",
                      background: "var(--colors-surface-dark-elevated)",
                      color: "var(--colors-ink)",
                      padding: "4px 10px",
                      borderRadius: "16px",
                      border: "1px solid var(--colors-hairline)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>Doc: {att.name}</span>
                    <button
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, idx) => idx !== ai)
                        )
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--colors-muted)",
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "10.5px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--colors-muted)",
                  }}
                >
                  Tokens: {tokensUsed}
                </span>
                <button
                  onClick={handleMicClick}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background:
                      voice.status === "recording" ||
                      voice.status === "transcribing"
                        ? "var(--colors-primary, #ffffff)"
                        : "transparent",
                    border: "1px solid var(--colors-hairline)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:
                      voice.status === "transcribing" ? "wait" : "pointer",
                    color:
                      voice.status === "recording" ||
                      voice.status === "transcribing"
                        ? "var(--colors-canvas, #1e1e1e)"
                        : "var(--colors-ink)",
                  }}
                  title={
                    voice.status === "recording"
                      ? "Detener e insertar transcripcion"
                      : voice.status === "transcribing"
                        ? "Transcribiendo..."
                        : "Dictar por voz - se inserta en el prompt"
                  }
                >
                  <Mic size={16} strokeWidth={1.75} />
                </button>
                <button
                  onClick={toggleContinuousMic}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: continuousMic
                      ? "var(--colors-danger, #ef4444)"
                      : "transparent",
                    border: "1px solid var(--colors-hairline)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: continuousMic ? "#ffffff" : "var(--colors-ink)",
                  }}
                  title={
                    continuousMic
                      ? "Desactivar Micrófono Siempre Activo"
                      : "Activar Micrófono Siempre Activo (Voz Continua)"
                  }
                >
                  {continuousMic ? (
                    <Mic size={16} strokeWidth={1.75} />
                  ) : (
                    <MicOff size={16} strokeWidth={1.75} />
                  )}
                </button>
                <button
                  onClick={isLoading ? handleStop : handleSend}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--colors-primary, #ffffff)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--colors-canvas, #1e1e1e)",
                  }}
                >
                  {isLoading ? (
                    <X size={16} strokeWidth={1.75} />
                  ) : (
                    <ArrowUp size={16} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {input.trim() === "" && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            {pluginInjectors.map((p, pi) => {
              const Icon = p.icon;
              return (
                <button
                  className="suggestion-chip"
                  onClick={() => handleSuggestion(p.stub)}
                  key={pi}
                >
                  <Icon
                    size={13}
                    strokeWidth={1.75}
                    style={{ color: "var(--colors-muted)" }}
                  />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <CreateAssetModal
          kind={createType}
          onClose={() => setCreateType(null)}
          onCreated={handleAssetCreated}
          workspacePath={workspacePath}
        />
      </div>
      {showTreeMap && (
        <div
          style={{
            width: "300px",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "var(--colors-surface-dark-soft)",
            borderLeft: "1px solid var(--colors-hairline)",
            minWidth: "260px",
          }}
        >
          {/* Tree Map Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--colors-hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--colors-ink)",
              }}
            >
              <GitBranch size={14} strokeWidth={1.75} />
              <span>
                {lang === "es" ? "Árbol de Bifurcaciones" : "Branch Tree"}
              </span>
            </h3>
            <button
              onClick={() => setShowTreeMap(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--colors-muted)",
                cursor: "pointer",
                fontSize: "13px",
              }}
              title={lang === "es" ? "Cerrar Panel" : "Close Panel"}
            >
              [✕]
            </button>
          </div>
          {/* Tree Map Body */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "16px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
            }}
          >
            {(() => {
              const rootNode = getActiveFamilyTree();
              if (!rootNode) {
                return (
                  <div
                    style={{
                      color: "var(--colors-muted)",
                      textAlign: "center",
                      marginTop: "20px",
                    }}
                  >
                    {lang === "es"
                      ? "No hay bifurcaciones en esta sesión"
                      : "No branches in this session"}
                  </div>
                );
              }

              const renderTreeNode = (node, depth = 0) => {
                const isCurrent = node.id === activeChatId;
                return (
                  <div
                    key={node.id}
                    style={{
                      marginLeft: depth > 0 ? "16px" : "0",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      onClick={() => onSelectChat && onSelectChat(node.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: isCurrent
                          ? "var(--colors-primary-soft)"
                          : "var(--colors-surface-dark-elevated)",
                        border: isCurrent
                          ? "1px solid var(--colors-primary)"
                          : "1px solid var(--colors-hairline)",
                        color: isCurrent
                          ? "var(--colors-primary-strong)"
                          : "var(--colors-ink)",
                        fontWeight: isCurrent ? "700" : "normal",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <GitBranch
                        size={12}
                        style={{
                          color: isCurrent
                            ? "var(--colors-primary)"
                            : "var(--colors-muted)",
                          transform:
                            node.children.length > 0 ? "none" : "rotate(90deg)",
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={node.title}
                      >
                        {node.title}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: "9px",
                            background: "var(--colors-primary)",
                            color: "#fff",
                            padding: "1px 4px",
                            borderRadius: "3px",
                          }}
                        >
                          {lang === "es" ? "Activo" : "Active"}
                        </span>
                      )}
                    </div>
                    {node.children && node.children.length > 0 && (
                      <div
                        style={{
                          borderLeft:
                            "1px dashed var(--colors-hairline-strong)",
                          marginLeft: "10px",
                          paddingLeft: "6px",
                          marginTop: "4px",
                        }}
                      >
                        {node.children.map((child) =>
                          renderTreeNode(child, depth + 1)
                        )}
                      </div>
                    )}
                  </div>
                );
              };

              return renderTreeNode(rootNode);
            })()}
          </div>
        </div>
      )}
      {activeArtifact && (
        <div
          style={{
            width: "50%",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            background: "var(--colors-canvas)",
            minWidth: "320px",
          }}
        >
          {/* Artifact Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--colors-hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontFamily: "var(--font-mono)",
                fontWeight: "700",
              }}
            >
              {activeArtifact.title}
            </h3>
            <button
              onClick={() => setActiveArtifact(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--colors-muted)",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              [✕]
            </button>
          </div>
          {/* Artifact Body */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeArtifact.type === "html" ? (
              <iframe
                srcDoc={activeArtifact.content}
                sandbox="allow-scripts"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#fff",
                }}
              />
            ) : (
              <pre
                style={{
                  padding: "16px",
                  margin: 0,
                  overflow: "auto",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  background: "var(--colors-surface-dark)",
                  height: "100%",
                }}
              >
                <code>{activeArtifact.content}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
