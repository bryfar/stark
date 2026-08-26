import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { CustomSelect } from "./CustomSelect";
import { CreateAssetModal, CreateRow } from "./CreateAssetModal";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Logo } from "./Logo";
import {
  Folder,
  Plus,
  ArrowUp,
  Mic,
  ChevronUp,
  MessageSquare,
  Terminal,
  Brain,
  Coins,
  Paperclip,
  Send,
  X,
  Sparkles,
} from "lucide-react";
import { useVoiceDictation } from "../hooks/useVoiceDictation";
import VoiceDictation from "./VoiceDictation";

export function CodeView({
  selectedModel,
  activeFile,
  onOpenModelSelector,
  activeSessionId,
  workspacePath,
}) {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sessionChats, setSessionChats] = useState({}); // { [sessionId]: [ { sender: 'user'|'assistant', text: string } ] }
  const [isChatExecuting, setIsChatExecuting] = useState(false);
  const [isDropupOpen, setIsDropupOpen] = useState(false); // for terminal +
  const [isChatDropupOpen, setIsChatDropupOpen] = useState(false); // for chat +
  const [availableSkills, setAvailableSkills] = useState([]);
  const [customAgents, setCustomAgents] = useState([]);
  const [assetsVersion, setAssetsVersion] = useState(0);
  const [createType, setCreateType] = useState(null);
  const [reasoning, setReasoning] = useState(true);
  const [openThinkingIdx, setOpenThinkingIdx] = useState({});

  const toggleThinking = (idx) => {
    setOpenThinkingIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const [logs, setLogs] = useState([]);

  const [input, setInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  const [runLocation, setRunLocation] = useState("local");
  const [workDir, setWorkDir] = useState("~/workspace");
  const [extraFolders, setExtraFolders] = useState([]);
  const [selectedMode, setSelectedMode] = useState("manual");
  const [pendingMode, setPendingMode] = useState(null);

  const [tokensUsed, setTokensUsed] = useState(0);
  const fileInputRef = useRef(null);
  const chatFileInputRef = useRef(null);

  // Dictado por voz: una instancia para el prompt de chat y otra para la terminal.
  const chatVoice = useVoiceDictation({
    onText: (text) => setChatInput((prev) => (prev ? `${prev} ${text}` : text)),
  });
  const termVoice = useVoiceDictation({
    onText: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
  });

  useEffect(() => {
    async function loadAssets() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const list = await invoke("skills_list", {
          workspacePath: workspacePath,
        });
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
        const agents = await invoke("agents_list", {
          workspacePath: workspacePath,
        });
        setCustomAgents(agents || []);
      } catch (e) {
        setCustomAgents([]);
      }
    }
    loadAssets();
  }, [workspacePath, assetsVersion]);

  const reloadAssets = () => setAssetsVersion((v) => v + 1);

  const handleAssetCreated = ({ kind, path }) => {
    if (kind === "agent") {
      const tag = "@" + (path.split("/").pop() || "").replace(/\.md$/, "");
      setChatInput((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
    } else if (kind === "skill") {
      const slug = (path.split("/").slice(-2, -1)[0] || "").replace(
        /\.md$/,
        ""
      );
      if (slug)
        setChatInput((prev) => (prev ? `${prev} /${slug} ` : `/${slug} `));
    }
    reloadAssets();
  };

  // Listen to chat token events
  useEffect(() => {
    let unlisten;
    async function setupChatListener() {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen("chat-token", (event) => {
          const payload = event.payload;
          if (payload.chat_id && payload.chat_id === activeSessionId) {
            if (payload.token) {
              setSessionChats((prev) => {
                const list = prev[activeSessionId] || [];
                const last = list[list.length - 1];
                if (last && last.sender === "assistant" && last.isStreaming) {
                  const updatedLast = {
                    ...last,
                    text: last.text + payload.token,
                  };
                  return {
                    ...prev,
                    [activeSessionId]: [...list.slice(0, -1), updatedLast],
                  };
                }
                return prev;
              });
            }
            if (payload.done) {
              setSessionChats((prev) => {
                const list = prev[activeSessionId] || [];
                const last = list[list.length - 1];
                if (last && last.sender === "assistant") {
                  const updatedLast = { ...last, isStreaming: false };
                  return {
                    ...prev,
                    [activeSessionId]: [...list.slice(0, -1), updatedLast],
                  };
                }
                return prev;
              });
              setIsChatExecuting(false);
            }
          }
        });
      } catch (e) {
        // Fallback
      }
    }
    setupChatListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, [activeSessionId]);

  const handleSendCodeChat = async () => {
    if (!chatInput.trim()) return;
    const userMsgText = chatInput;
    setChatInput("");
    setIsChatExecuting(true);

    const userMsg = { sender: "user", text: userMsgText };
    const reasoningContent = reasoning
      ? `Pasos de Razonamiento para la consulta de código:\n1. Inspección del input y del archivo activo: ${activeFile || "Ninguno"}.` +
        `\n2. Preparando contexto de sandbox en ${workspacePath}.` +
        `\n3. Evaluando estrategias de solución antes de responder: "${userMsgText.slice(0, 80)}${userMsgText.length > 80 ? "…" : ""}".`
      : null;
    const assistantMsg = {
      sender: "assistant",
      text: "",
      isStreaming: true,
      thinking: reasoningContent,
    };

    let currentMessages = [];
    setSessionChats((prev) => {
      const list = prev[activeSessionId] || [];
      const newList = [...list, userMsg, assistantMsg];
      currentMessages = newList;
      return {
        ...prev,
        [activeSessionId]: newList,
      };
    });

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const messagesPayload = currentMessages.slice(0, -1).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      await invoke("send_chat_message", {
        payload: {
          provider: "local",
          model: selectedModel || "meta-llama/llama-3.1-8b-instruct:free",
          messages: messagesPayload,
          reasoning: reasoning,
          api_key: null,
          chat_id: activeSessionId,
        },
      });
    } catch (e) {
      // Mock / browser fallback if Tauri is not available
      setTimeout(() => {
        setSessionChats((prev) => {
          const list = prev[activeSessionId] || [];
          const last = list[list.length - 1];
          if (last && last.sender === "assistant") {
            const updatedLast = {
              ...last,
              thinking: reasoning
                ? `Pasos de Razonamiento para la pregunta de código:\n1. Analizando el archivo activo: ${activeFile || "Ninguno"}.\n2. Generando contexto de sandbox en ${workspacePath}.\n3. Evaluando la consulta de código: "${userMsgText}".`
                : null,
              text: `[Modo Code Chat]\nRespuesta de prueba sobre: "${userMsgText}" utilizando el modelo ${selectedModel}.\n\n¿Quieres que escriba un comando sandbox en la terminal?`,
              isStreaming: false,
            };
            return {
              ...prev,
              [activeSessionId]: [...list.slice(0, -1), updatedLast],
            };
          }
          return prev;
        });
        setIsChatExecuting(false);
      }, 1000);
    }
  };

  const handleChatFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const names = files.map((f) => f.name).join(", ");
      setChatInput((prev) =>
        prev ? `${prev} [Attached: ${names}]` : `[Attached: ${names}] `
      );
    }
    setIsChatDropupOpen(false);
  };

  const handleTerminalFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const paths = files.map((f) => f.name).join(" ");
      setInput((prev) => (prev ? `${prev} ${paths}` : paths));
    }
    setIsDropupOpen(false);
  };

  const handleChatMicClick = () => {
    if (chatVoice.status === "recording") {
      chatVoice.stop();
    } else if (chatVoice.status !== "transcribing") {
      chatVoice.start();
    }
  };

  const handleTermMicClick = () => {
    if (termVoice.status === "recording") {
      termVoice.stop();
    } else if (termVoice.status !== "transcribing") {
      termVoice.start();
    }
  };

  const handleRunCommand = async (cmdToRun) => {
    const commandText = cmdToRun || input;
    if (!commandText.trim()) return;

    setIsExecuting(true);
    setLogs((prev) => [
      ...prev,
      {
        type: "command",
        text: `$ ${commandText} (${runLocation === "ssh" ? "SSH Host" : "Local Sandbox"})`,
      },
    ]);
    setInput("");
    setTokensUsed((prev) => prev + Math.floor(commandText.length / 4) + 22);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      if (runLocation === "ssh") {
        const res = await invoke("terminal_execute_ssh", {
          cmdStr: commandText,
          host: "localhost",
          timeoutSecs: 30,
        });
        setLogs((prev) => [
          ...prev,
          {
            type: res.exit_code === 0 ? "success" : "error",
            text: `SSH Exit Code ${res.exit_code} stdout: ${res.stdout}\nstderr: ${res.stderr}`,
          },
        ]);
      } else {
        const res = await invoke("terminal_execute", {
          cmdStr: commandText,
          workspacePath: "/home/bryan/Downloads/Repos/crafter-repo",
          perimeterMode: selectedMode === "auto" || selectedMode === "bypass",
          timeoutSecs: 30,
        });

        if (res.stdout && res.stdout.includes("Aprobación Requerida")) {
          setLogs((prev) => [...prev, { type: "approval", text: res.stdout }]);
        } else {
          setLogs((prev) => [
            ...prev,
            {
              type: res.exit_code === 0 ? "success" : "error",
              text: `Local Exit Code ${res.exit_code} stdout: ${res.stdout}\nstderr: ${res.stderr}`,
            },
          ]);
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, { type: "error", text: `Error: ${err}` }]);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    let unlisten;
    const setupListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen("agent-step", (event) => {
        const stepEvent = event.payload;
        setLogs((prev) => [
          ...prev,
          {
            type: stepEvent.stage === "error" ? "error" : "system",
            text: `[Paso ${stepEvent.step} - ${stepEvent.stage}] ${stepEvent.details || ""}`,
          },
        ]);
      });
    };
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleApprove = async (index) => {
    setLogs((prev) => [
      ...prev.slice(0, index),
      { type: "success", text: "Acción aprobada por el usuario." },
      ...prev.slice(index + 1),
    ]);

    setIsExecuting(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke("terminal_execute", {
        cmdStr: 'echo "Acción autorizada por bypass"',
        workspacePath: "/home/bryan/Downloads/Repos/crafter-repo",
        perimeterMode: true,
        timeoutSecs: 30,
      });
      setLogs((prev) => [
        ...prev,
        {
          type: res.exit_code === 0 ? "success" : "error",
          text: `Local Exit Code ${res.exit_code} stdout: ${res.stdout}\nstderr: ${res.stderr}`,
        },
      ]);
    } catch (err) {
      setLogs((prev) => [...prev, { type: "error", text: `Error: ${err}` }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReject = (index) => {
    setLogs((prev) => [
      ...prev.slice(0, index),
      { type: "error", text: "Acción rechazada por el usuario." },
      ...prev.slice(index + 1),
    ]);
  };

  const handleGitUndo = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke("git_undo", {
        workspacePath: "/home/bryan/Downloads/Repos/crafter-repo",
      });
      setLogs((prev) => [
        ...prev,
        { type: "success", text: `Git Undo: ${res}` },
      ]);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: "error", text: `Error al deshacer: ${err}` },
      ]);
    }
  };

  const handleClearLogs = () => {
    setLogs([{ type: "system", text: "Consola limpiada." }]);
  };

  const handleWorkDirClick = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (selected) setWorkDir(selected);
    } catch (e) {
      setWorkDir("/mock/path/from/browser");
    }
  };

  const handleAddFolder = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true });
      if (selected && !extraFolders.includes(selected)) {
        setExtraFolders([...extraFolders, selected]);
      }
    } catch (e) {
      setExtraFolders([...extraFolders, "/mock/extra/path"]);
    }
  };

  const modeOptions = [
    { value: "manual", label: "Manual" },
    { value: "plan", label: "Plan" },
    { value: "accept-edits", label: "Accept Edits" },
    { value: "auto", label: "Auto" },
    { value: "bypass", label: "Bypass Permissions" },
  ];

  const handleModeChange = (newMode) => {
    if (newMode === "auto" || newMode === "bypass") {
      setPendingMode(newMode);
    } else {
      setSelectedMode(newMode);
    }
  };

  const confirmMode = () => {
    setSelectedMode(pendingMode);
    setPendingMode(null);
  };

  const cancelMode = () => {
    setPendingMode(null);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "var(--colors-canvas)",
        position: "relative",
      }}
    >
      {/* Sub View Toggle Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--colors-surface-dark-soft)",
          borderBottom: "1px solid var(--colors-hairline)",
          padding: "4px 12px",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            color: "var(--colors-ink)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          <MessageSquare size={13} strokeWidth={1.75} />
          <span>Modo Chat</span>
        </span>
        <button
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          title={
            isTerminalOpen
              ? "Cerrar Shell / Terminal"
              : "Abrir Shell / Terminal"
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: isTerminalOpen
              ? "var(--colors-surface-dark-elevated)"
              : "transparent",
            border: isTerminalOpen
              ? "1px solid var(--colors-hairline)"
              : "1px solid transparent",
            color: isTerminalOpen ? "var(--colors-ink)" : "var(--colors-muted)",
            borderRadius: "4px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          <Terminal size={13} strokeWidth={1.75} />
          <span>Shell / Terminal</span>
        </button>
      </div>

      <div
        style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}
      >
        {/* ================= MODO CHAT (siempre visible) ================= */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          {/* Chat Messages */}
          <div
            className="messages-list"
            style={{ flex: 1, background: "var(--colors-surface-dark)" }}
          >
            {(sessionChats[activeSessionId] || []).length === 0 &&
              !isChatExecuting && (
                <div className="chat-empty-state">
                  <Logo size={72} />
                  <h1 className="app-brand-wordmark">Stark</h1>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--colors-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Tu copiloto de código. Pregúntale sobre tu proyecto.
                  </span>
                </div>
              )}
            {(sessionChats[activeSessionId] || []).map((msg, i) => (
              <div className={`message-bubble ${msg.sender}`} key={i}>
                {msg.thinking && (
                  <div className="thinking-block">
                    <div
                      className="thinking-header"
                      onClick={() => toggleThinking(i)}
                    >
                      <Brain
                        size={14}
                        strokeWidth={1.75}
                        style={{ color: "var(--colors-body-strong)" }}
                      />
                      <span>Razonamiento (CoT)</span>
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "10px",
                        }}
                      >
                        {openThinkingIdx[i] ? (
                          <ChevronUp size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                      </span>
                    </div>
                    {openThinkingIdx[i] && (
                      <div className="thinking-content">{msg.thinking}</div>
                    )}
                  </div>
                )}
                <div>
                  <MarkdownRenderer content={msg.text} />
                </div>
              </div>
            ))}
            {isChatExecuting && (
              <div className="message-bubble assistant">
                <div className="thinking-block">
                  <div className="thinking-header">
                    <Brain size={14} strokeWidth={1.75} />
                    <span>Razonamiento (CoT) — procesando input...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Toolbar / Prompt */}
          <div
            style={{
              padding: "16px 20px",
              background: "var(--colors-surface-soft)",
              borderTop: "1px solid var(--colors-hairline)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <input
              type="file"
              multiple
              ref={chatFileInputRef}
              style={{ display: "none" }}
              onChange={handleChatFileUpload}
              accept=".txt,.pdf,.log,.md,.js,.ts,.rs,.png,.jpg,.jpeg"
            />

            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                borderRadius: "6px",
              }}
            >
              <VoiceDictation voice={chatVoice} />
              <textarea
                value={chatInput}
                onInput={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendCodeChat();
                  }
                }}
                placeholder="Pregunta sobre el código, refactorizaciones o lógica..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "12px",
                  background: "transparent",
                  border: "none",
                  color: "var(--colors-ink)",
                  fontSize: "13px",
                  fontFamily: "var(--font-mono)",
                  resize: "none",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  padding: "8px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="send-btn-stark"
                  onClick={handleSendCodeChat}
                  disabled={isChatExecuting}
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
                    padding: 0,
                  }}
                >
                  {isChatExecuting ? (
                    <span style={{ fontSize: "10px" }}>...</span>
                  ) : (
                    <ArrowUp size={16} strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {/* Plus button dropdown in Chat */}
                <div
                  style={{ position: "relative" }}
                  onMouseLeave={() => setIsChatDropupOpen(false)}
                >
                  <button
                    onClick={() => setIsChatDropupOpen(!isChatDropupOpen)}
                    className="btn-secondary"
                    style={{
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={16} strokeWidth={1.75} />
                  </button>
                  {isChatDropupOpen && (
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
                        onClick={() => {
                          chatFileInputRef.current &&
                            chatFileInputRef.current.click();
                          setIsChatDropupOpen(false);
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
                              setChatInput((prev) =>
                                prev ? `${prev} ${agent.tag} ` : `${agent.tag} `
                              );
                              setIsChatDropupOpen(false);
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
                              setChatInput((prev) =>
                                prev ? `${prev} /${s.name} ` : `/${s.name} `
                              );
                              setIsChatDropupOpen(false);
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
                          setIsChatDropupOpen(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleChatMicClick}
                  className="btn-secondary"
                  style={{
                    padding: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      chatVoice.status === "recording" ||
                      chatVoice.status === "transcribing"
                        ? "var(--colors-primary, #ffffff)"
                        : "transparent",
                    color:
                      chatVoice.status === "recording" ||
                      chatVoice.status === "transcribing"
                        ? "var(--colors-canvas, #1e1e1e)"
                        : "inherit",
                  }}
                  title={
                    chatVoice.status === "recording"
                      ? "Detener e insertar transcripcion"
                      : chatVoice.status === "transcribing"
                        ? "Transcribiendo..."
                        : "Dictar por voz - se inserta en el prompt"
                  }
                >
                  <Mic size={16} strokeWidth={1.75} />
                </button>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <button
                  onClick={() => setReasoning(!reasoning)}
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
                  title="Razonamiento paso a paso"
                >
                  <Brain size={11} strokeWidth={1.75} />
                  <span>CoT</span>
                </button>
                <button
                  onClick={onOpenModelSelector}
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "4px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {selectedModel || "Select model"} <ChevronUp size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= SIDEBAR SHELL / TERMINAL (derecha) ================= */}
        {isTerminalOpen && (
          <aside
            style={{
              width: "440px",
              minWidth: "340px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--colors-surface-dark)",
              borderLeft: "1px solid var(--colors-hairline)",
            }}
          >
            {/* Terminal Header Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                background: "var(--colors-surface-soft)",
                borderBottom: "1px solid var(--colors-hairline)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "var(--colors-ink)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Terminal size={13} strokeWidth={1.75} />
                  Sandbox Console
                </span>
                <span
                  className="badge-offline"
                  style={{ fontSize: "10px", padding: "2px 8px" }}
                >
                  Perímetro Activo
                </span>
                {activeFile && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--colors-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Focus: {activeFile}
                  </span>
                )}
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <button
                  className="btn-secondary"
                  onClick={handleGitUndo}
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                  title="Deshacer último cambio (git)"
                >
                  Undo
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleClearLogs}
                  style={{ fontSize: "11px", padding: "4px 8px" }}
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setIsTerminalOpen(false)}
                  title="Cerrar Shell / Terminal"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--colors-muted)",
                    display: "flex",
                    padding: "4px",
                  }}
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {/* Console Log Display */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "14px",
                fontFamily: "var(--font-mono)",
                fontSize: "12.5px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "var(--colors-surface-dark)",
              }}
            >
              {logs.length === 0 && (
                <div
                  style={{
                    color: "var(--colors-muted)",
                    textAlign: "center",
                    padding: "48px 0",
                    lineHeight: "1.7",
                  }}
                >
                  Consola limpia.
                  <br />
                  Ejecuta un comando para comenzar.
                </div>
              )}
              {logs.map((l, i) => {
                if (l.type === "approval") {
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "12px",
                        border: "1px solid var(--colors-hairline)",
                        borderRadius: "4px",
                        background: "var(--colors-surface-soft)",
                        marginTop: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          color: "var(--colors-ink-deep)",
                        }}
                      >
                        Aprobación de Seguridad Requerida:
                      </div>
                      <div style={{ color: "var(--colors-body)" }}>
                        {l.text}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleApprove(i)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          Autorizar Acción
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleReject(i)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          Denegar
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    style={{
                      color:
                        l.type === "command"
                          ? "var(--colors-ink-deep)"
                          : l.type === "success"
                            ? "var(--colors-body-strong)"
                            : "var(--colors-muted)",
                      lineHeight: "1.5",
                      padding: l.type === "command" ? "6px 10px" : "0",
                      background:
                        l.type === "command"
                          ? "var(--colors-surface-dark-elevated)"
                          : "transparent",
                      borderRadius: "4px",
                      border:
                        l.type === "command"
                          ? "1px solid var(--colors-hairline)"
                          : "none",
                    }}
                  >
                    {l.text}
                  </div>
                );
              })}

              {isExecuting && (
                <div
                  style={{
                    color: "var(--colors-body)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                  }}
                >
                  Executing command in bwrap sandbox...
                </div>
              )}
            </div>

            {/* Prompt Container */}
            <div
              style={{
                padding: "16px 20px",
                background: "var(--colors-surface-soft)",
                borderTop: "1px solid var(--colors-hairline)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleTerminalFileUpload}
                accept=".txt,.pdf,.log,.md,.js,.ts,.rs,.png,.jpg,.jpeg"
              />

              {/* Top Row */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Segmented Toggle: Where Stark Run */}
                <div
                  style={{
                    display: "flex",
                    background: "var(--colors-surface-dark)",
                    borderRadius: "4px",
                    padding: "2px",
                    border: "1px solid var(--colors-hairline)",
                  }}
                >
                  <button
                    onClick={() => setRunLocation("local")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      borderRadius: "3px",
                      background:
                        runLocation === "local"
                          ? "var(--colors-surface-card-border)"
                          : "transparent",
                      color:
                        runLocation === "local"
                          ? "var(--colors-ink)"
                          : "var(--colors-muted)",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    Local
                  </button>
                  <button
                    onClick={() => setRunLocation("ssh")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "11px",
                      borderRadius: "3px",
                      background:
                        runLocation === "ssh"
                          ? "var(--colors-surface-card-border)"
                          : "transparent",
                      color:
                        runLocation === "ssh"
                          ? "var(--colors-ink)"
                          : "var(--colors-muted)",
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    SSH
                  </button>
                </div>

                {/* Work Directory */}
                <button
                  onClick={handleWorkDirClick}
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    padding: "4px 8px",
                  }}
                >
                  <Folder size={14} strokeWidth={1.75} />
                  {workDir}
                </button>

                {/* Add Folder */}
                <button
                  onClick={handleAddFolder}
                  className="btn-secondary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    padding: "4px 8px",
                  }}
                >
                  <Plus size={14} strokeWidth={1.75} />
                  Add folder
                </button>

                {/* Dangerous Mode Badge */}
                {(selectedMode === "auto" || selectedMode === "bypass") && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "var(--colors-primary, #ffffff)",
                      color: "var(--colors-canvas, #1e1e1e)",
                      fontSize: "10px",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    {selectedMode === "auto" ? "Auto activo" : "Bypass activo"}
                  </span>
                )}
              </div>

              {/* Textarea Box */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--colors-surface-dark)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "6px",
                }}
              >
                <VoiceDictation voice={termVoice} />
                <textarea
                  value={input}
                  onInput={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleRunCommand();
                    }
                  }}
                  placeholder="Escribe una instrucción..."
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "12px",
                    background: "transparent",
                    border: "none",
                    color: "var(--colors-ink)",
                    fontSize: "13px",
                    fontFamily: "var(--font-mono)",
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div
                  style={{
                    padding: "8px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="send-btn-stark"
                    onClick={() => handleRunCommand()}
                    disabled={isExecuting}
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
                      padding: 0,
                    }}
                  >
                    {isExecuting ? (
                      <span style={{ fontSize: "10px" }}>...</span>
                    ) : (
                      <ArrowUp size={16} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Row */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <CustomSelect
                    options={modeOptions}
                    value={selectedMode}
                    onChange={handleModeChange}
                    compact
                  />

                  {/* Plus button dropdown in Terminal */}
                  <div
                    style={{ position: "relative" }}
                    onMouseLeave={() => setIsDropupOpen(false)}
                  >
                    <button
                      onClick={() => setIsDropupOpen(!isDropupOpen)}
                      className="btn-secondary"
                      style={{
                        padding: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "30px",
                        height: "30px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={16} strokeWidth={1.75} />
                    </button>
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
                          onClick={() => {
                            fileInputRef.current &&
                              fileInputRef.current.click();
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
                                  prev
                                    ? `${prev} ${agent.tag} `
                                    : `${agent.tag} `
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
                                setInput((prev) =>
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
                    onClick={handleTermMicClick}
                    className="btn-secondary"
                    style={{
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        termVoice.status === "recording" ||
                        termVoice.status === "transcribing"
                          ? "var(--colors-primary, #ffffff)"
                          : "transparent",
                      color:
                        termVoice.status === "recording" ||
                        termVoice.status === "transcribing"
                          ? "var(--colors-canvas, #1e1e1e)"
                          : "inherit",
                    }}
                    title={
                      termVoice.status === "recording"
                        ? "Detener e insertar transcripcion"
                        : termVoice.status === "transcribing"
                          ? "Transcribiendo..."
                          : "Dictar comando por voz"
                    }
                  >
                    <Mic size={16} strokeWidth={1.75} />
                  </button>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--colors-muted)",
                    }}
                  >
                    Tokens: {tokensUsed}
                  </span>
                  <button
                    onClick={onOpenModelSelector}
                    className="btn-secondary"
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {selectedModel || "Select model"} <ChevronUp size={12} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {pendingMode && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--colors-surface-soft)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--colors-hairline)",
              maxWidth: "300px",
            }}
          >
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: "13px",
                color: "var(--colors-ink)",
                lineHeight: "1.4",
              }}
            >
              Vas a permitir que Stark ejecute sin aprobaciones. ¿Continuar?
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn-secondary"
                onClick={cancelMode}
                style={{ padding: "6px 12px", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                className="send-btn-stark"
                onClick={confirmMode}
                style={{ padding: "6px 12px", cursor: "pointer" }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateAssetModal
        kind={createType}
        onClose={() => setCreateType(null)}
        onCreated={handleAssetCreated}
        workspacePath={workspacePath}
      />
    </div>
  );
}
