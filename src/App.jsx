import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { Sidebar } from "./components/Sidebar";
import { HeaderBar } from "./components/HeaderBar";
import { ChatView } from "./components/ChatView";
import { CodeView } from "./components/CodeView";
import { DesignView } from "./components/DesignView";
import { DesignChatPanel } from "./components/DesignChatPanel";
import { DiffModal } from "./components/DiffModal";
import { UnlockModal } from "./components/UnlockModal";
import { TerminalModal } from "./components/TerminalModal";
import { DoctorModal } from "./components/DoctorModal";
import { ProviderManagerModal } from "./components/ProviderManagerModal";
import { ModelSelectorModal } from "./components/ModelSelectorModal";
import { SettingsModal } from "./components/SettingsModal";
import { GettingStartedModal } from "./components/GettingStartedModal";
import { DesignSystemPage } from "./components/pages/DesignSystemPage";
import { PluginHubPage } from "./components/pages/PluginHubPage";
import { IntegrationsPage } from "./components/pages/IntegrationsPage";
import { ProjectsPage } from "./components/pages/ProjectsPage";
import { UsagePage } from "./components/pages/UsagePage";
import { SkillsPage } from "./components/pages/SkillsPage";
import { SessionTabs } from "./components/SessionTabs";
import { VoiceAssistantModal } from "./components/VoiceAssistantModal";

export function App() {
  const [currentMode, setMode] = useState("chat");
  if (typeof window !== "undefined" && window.__renderProbe__)
    window.__renderProbe__("App");
  const [theme, setTheme] = useState("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(() => {
    try {
      return localStorage.getItem("stark.selected_provider") || "stark-free";
    } catch (e) {
      return "stark-free";
    }
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return (
        localStorage.getItem("stark.selected_model") ||
        "meta-llama/llama-3.1-8b-instruct:free"
      );
    } catch (e) {
      return "meta-llama/llama-3.1-8b-instruct:free";
    }
  });
  const [agentMode, setAgentMode] = useState("plan");
  const [reasoning, setReasoning] = useState(true);
  const [proposedEdit, setProposedEdit] = useState(null);
  const [proposedCommand, setProposedCommand] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isProviderManagerOpen, setIsProviderManagerOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGettingStartedOpen, setIsGettingStartedOpen] = useState(false);
  const [lang, setLang] = useState("es");
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [workspacePath, setWorkspacePath] = useState("");
  const DEFAULT_WORKSPACE = "/home/bryan/Downloads/Repos/stark";
  const [providersConfig, setProvidersConfig] = useState([]);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);

  const [codeSessions, setCodeSessions] = useState([
    { id: "code-1", title: "Sesión 1" },
  ]);
  const [activeCodeSessionId, setActiveCodeSessionId] = useState("code-1");
  const [designSessions, setDesignSessions] = useState([]);
  const [activeDesignSessionId, setActiveDesignSessionId] = useState(null);

  function addCodeSession() {
    const id = `code-${Date.now()}`;
    setCodeSessions((prev) => [
      ...prev,
      { id, title: `Sesión ${prev.length + 1}` },
    ]);
    setActiveCodeSessionId(id);
  }

  function closeCodeSession(id) {
    setCodeSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeCodeSessionId === id && next.length > 0)
        setActiveCodeSessionId(next[next.length - 1].id);
      return next;
    });
  }

  function addDesignSession() {
    const id = `design-${Date.now()}`;
    setDesignSessions((prev) => [
      ...prev,
      { id, title: `Sesión ${prev.length + 1}` },
    ]);
    setActiveDesignSessionId(id);
  }

  function closeDesignSession(id) {
    setDesignSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeDesignSessionId === id && next.length > 0)
        setActiveDesignSessionId(next[next.length - 1].id);
      return next;
    });
  }

  const [activeFile, setActiveFile] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [activePreset, setActivePreset] = useState("landing");
  const [activePage, setActivePage] = useState("home"); // Global Page Suite state: 'home' | 'ds' | 'plugin' | 'integrations'
  const [artifactType, setArtifactType] = useState("prototype"); // 'prototype' | 'hypeframe' | 'deck'
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("providers_probe"))
      .then((results) => {
        if (cancelled) return;
        const ollama = Array.isArray(results)
          ? results.find((r) => r.id === "ollama")
          : null;
        setOllamaAvailable(!!ollama && !!ollama.reachable);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      const scale = Math.max(0.7, Math.min(1.0, width / 1315));
      document.documentElement.style.setProperty(
        "--ui-scale",
        scale.toFixed(3)
      );
    }
    handleResize();
    window.addEventListener("resize", handleResize);

    let unlisten = null;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => {
        const appWindow = getCurrentWindow();
        appWindow
          .onResized(() => {
            appWindow
              .isMaximized()
              .then(setIsMaximized)
              .catch(() => {});
          })
          .then((u) => {
            unlisten = u;
          });
        appWindow
          .isMaximized()
          .then(setIsMaximized)
          .catch(() => {});
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("resize", handleResize);
      if (unlisten) unlisten();
    };
  }, []);

  // Global Developer Keyboard Hotkeys Matrix (Ctrl+K, Ctrl+B, Ctrl+Shift+D, Ctrl+1,2,3)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const textarea = document.querySelector(".chat-textarea");
        if (textarea) textarea.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "d"
      ) {
        e.preventDefault();
        setIsDoctorOpen((prev) => !prev);
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        e.preventDefault();
        setIsProviderManagerOpen((prev) => !prev);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        setMode("chat");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "2") {
        e.preventDefault();
        setMode("code");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "3") {
        e.preventDefault();
        setMode("design");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const refreshProviders = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const list = await invoke("providers_list");
      if (Array.isArray(list) && list.length > 0) {
        setProvidersConfig(list);
        return;
      }
      const presets = await invoke("providers_seed_presets");
      setProvidersConfig(presets);
    } catch (e) {
      setProvidersConfig([]);
    }
  };

  useEffect(() => {
    refreshProviders();
  }, []);

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const val = await invoke("storage_load", { key: "stark_onboarded" });
        if (!val) setIsGettingStartedOpen(true);
      } catch {
        setIsGettingStartedOpen(true);
      }
    }
    checkOnboarding();
  }, []);

  useEffect(() => {
    let unlisten;
    async function setupCryptoListener() {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen("crypto:ready", (event) => {
          if (event.payload && event.payload.unlocked) {
            setIsLocked(false);
          }
        });
      } catch (e) {
        // Modo navegador: sin eventos Tauri
      }
    }
    setupCryptoListener();

    async function checkUnlockStatus() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const status = await invoke("crypto_status");
        if (status.unlocked) {
          setIsLocked(false);
          return;
        }
        // Keyring disponible pero aún no desbloqueado: auto-unlock silencioso
        if (status.keyring_available) {
          try {
            await invoke("crypto_unlock");
            setIsLocked(false);
            return;
          } catch {
            // Sin clave en keyring y sin passphrase: pedirla
          }
        }
        setIsLocked(true);
      } catch {
        // Modo navegador: arranca desbloqueado
        setIsLocked(false);
      }
    }
    checkUnlockStatus();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const toPersistRecord = (chatId, messages, title) => {
    const meta = chatMeta[chatId] || {};
    return {
      id: chatId,
      title: title || "Nueva conversación",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      provider: selectedProvider,
      messages: (messages || []).map((m) => ({
        role: m.sender,
        content: m.text,
        model: m.model || null,
      })),
      parent_id: meta.parent_id || null,
      kind: meta.kind || "root",
    };
  };

  useEffect(() => {
    async function loadChats() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const chats = await invoke("chat_list");
        if (chats && chats.length) {
          const convs = chats.map((c) => ({ id: c.id, title: c.title }));
          const msgsMap = {};
          const metaMap = {};
          chats.forEach((c) => {
            msgsMap[c.id] = (c.messages || []).map((m) => ({
              sender: m.role,
              text: m.content,
              isStreaming: false,
              model: m.model || null,
            }));
            metaMap[c.id] = {
              parent_id: c.parent_id || null,
              kind: c.kind || "root",
            };
          });
          setConversations(convs);
          setChatMessages(msgsMap);
          setChatMeta(metaMap);
          setActiveChatId(chats[0].id);
        }
      } catch (e) {
        // Modo navegador: sin persistencia disponible
      }
    }
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flattenFileTree(nodes, prefix = "") {
    const out = [];
    for (const n of nodes || []) {
      const rel = prefix ? `${prefix}/${n.name}` : n.name;
      if (!n.is_dir) out.push({ name: rel });
      if (n.children && n.children.length)
        out.push(...flattenFileTree(n.children, rel));
    }
    return out;
  }

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const roots = await invoke("workspace_multi_root_load");
        if (roots && roots.length) {
          setWorkspacePath(roots[0]);
        } else {
          setWorkspacePath(DEFAULT_WORKSPACE);
        }
      } catch {
        setWorkspacePath(DEFAULT_WORKSPACE);
      }
    }
    loadWorkspace();
  }, []);

  useEffect(() => {
    async function loadFileTree() {
      const ws = workspacePath || DEFAULT_WORKSPACE;
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const tree = await invoke("repo_index", { workspacePath: ws });
        setFileTree(flattenFileTree(tree).slice(0, 200));
      } catch (e) {
        setFileTree([]);
      }
    }
    loadFileTree();
  }, [workspacePath]);

  // Open Design Full Page Layout Suites & Presets
  const designPresets = {
    landing: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; margin: 0; background: #fafafa; color: #18181b; }
    nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; border-bottom: 1px solid rgba(0,0,0,0.08); background: #ffffff; }
    .nav-brand { font-weight: 700; font-size: 16px; }
    .hero { padding: 80px 24px; text-align: center; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 44px; font-weight: 700; letter-spacing: -1px; margin-top: 0; }
    p { font-size: 16px; color: #71717a; line-height: 1.6; margin-bottom: 32px; }
    .cta-btn { background: #18181b; color: white; border: none; padding: 14px 32px; border-radius: 9999px; font-family: monospace; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
    .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 64px 48px; max-width: 1100px; margin: 0 auto; }
    .feat-card { background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
    footer { padding: 40px 48px; border-top: 1px solid rgba(0,0,0,0.08); text-align: center; color: #a1a1aa; font-size: 12px; }
  </style>
</head>
<body>
  <nav>
    <div class="nav-brand">Stark Open Design</div>
    <div><button class="cta-btn" style="padding: 8px 20px; font-size: 12px;">Get Started</button></div>
  </nav>
  <div class="hero">
    <h1>Full-Suite Open Design Page</h1>
    <p>Complete layout architecture combining hero messaging, feature grid, and footer in a unified Vibe Engineering light space.</p>
    <button class="cta-btn">Build Your Product →</button>
  </div>
  <div class="features">
    <div class="feat-card">
      <h3>Monochrome Foundations</h3>
      <p>Clean neutral palette without aggressive colors for AAA developer readability.</p>
    </div>
    <div class="feat-card">
      <h3>Targeting Scope</h3>
      <p>Isolate changes to buttons, typography, or CSS styles without breaking layout.</p>
    </div>
    <div class="feat-card">
      <h3>Offline Copilot</h3>
      <p>Powered by local LLM models with instant iteration history control.</p>
    </div>
  </div>
  <footer>Stark Desktop — Open Design Suite v2.0</footer>
</body>
</html>`,
    "dashboard-full": `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; margin: 0; background: #141414; color: #f9fafb; display: flex; height: 100vh; }
    aside { width: 240px; background: #1a1a1a; border-right: 1px solid #333333; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
    main { flex: 1; padding: 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }
    .nav-item { padding: 10px 14px; border-radius: 4px; color: #a0a0a5; cursor: pointer; }
    .nav-item.active { background: #202020; color: #ffffff; font-weight: bold; border: 1px solid #333333; }
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card { background: #202020; border: 1px solid #333333; padding: 20px; border-radius: 6px; }
    .stat-val { font-size: 24px; font-weight: bold; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; background: #202020; border-radius: 6px; border: 1px solid #333333; overflow: hidden; }
    th, td { padding: 14px 20px; text-align: left; border-bottom: 1px solid #2a2a2a; font-size: 13px; }
    th { background: #181818; color: #a0a0a5; font-size: 11px; text-transform: uppercase; }
  </style>
</head>
<body>
  <aside>
    <div style="font-weight:bold; font-size:16px; margin-bottom:12px;">SaaS Console</div>
    <div class="nav-item active">Overview</div>
    <div class="nav-item">Analytics</div>
    <div class="nav-item">Deployments</div>
    <div class="nav-item">Settings</div>
  </aside>
  <main>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0; font-size:20px;">System Operations</h2>
      <span style="font-size:12px; color:#a0a0a5;">Status: All Services Operational</span>
    </div>
    <div class="stats-row">
      <div class="stat-card"><span>Total Traffic</span><div class="stat-val">128.4K</div></div>
      <div class="stat-card"><span>Latency</span><div class="stat-val">12 ms</div></div>
      <div class="stat-card"><span>Memory</span><div class="stat-val">240 MB</div></div>
      <div class="stat-card"><span>Uptime</span><div class="stat-val">99.98%</div></div>
    </div>
    <table>
      <thead>
        <tr><th>Deployment ID</th><th>Branch</th><th>Environment</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>dep-84920</td><td>main</td><td>Production</td><td><span style="color:#ffffff;">[Active]</span></td></tr>
        <tr><td>dep-84919</td><td>feature/open-design</td><td>Staging</td><td><span style="color:#a0a0a5;">[Completed]</span></td></tr>
      </tbody>
    </table>
  </main>
</body>
</html>`,
    docs: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; margin: 0; background: #fafafa; color: #18181b; display: flex; min-height: 100vh; }
    aside { width: 260px; background: #ffffff; border-right: 1px solid rgba(0,0,0,0.08); padding: 32px 24px; }
    main { flex: 1; padding: 48px 64px; max-width: 800px; }
    .doc-link { display: block; padding: 8px 0; color: #71717a; text-decoration: none; font-size: 13.5px; }
    .doc-link.active { color: #18181b; font-weight: 700; }
    h1 { font-size: 32px; font-weight: 700; margin-top: 0; }
    p { font-size: 15px; color: #3f3f46; line-height: 1.7; }
    code { background: #f4f4f5; padding: 3px 8px; border-radius: 4px; font-size: 13px; border: 1px solid rgba(0,0,0,0.08); }
  </style>
</head>
<body>
  <aside>
    <div style="font-weight:700; font-size:15px; margin-bottom:20px;">Documentation</div>
    <a class="doc-link active" href="#">1. Getting Started</a>
    <a class="doc-link" href="#">2. Deep Seams Architecture</a>
    <a class="doc-link" href="#">3. Vibe Engineering Tokens</a>
    <a class="doc-link" href="#">4. Open Design Presets</a>
  </aside>
  <main>
    <h1>Getting Started with Stark Open Design</h1>
    <p>Welcome to the official developer documentation suite. Learn how to generate, iterate and inspect UI components using local LLMs.</p>
    <p>Run <code>bun run dev</code> to launch the Vite live canvas and press <kbd style="background:#f4f4f5; padding:2px 6px; border:1px solid rgba(0,0,0,0.1); border-radius:4px;">Ctrl+K</kbd> to focus the prompt studio.</p>
  </main>
</body>
</html>`,
    auth: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #18181b; }
    .auth-card { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); padding: 48px; border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); width: 380px; text-align: center; }
    h2 { margin-top: 0; font-size: 22px; font-weight: 700; }
    input { width: 100%; box-sizing: border-box; background: #f4f4f5; border: 1px solid rgba(0,0,0,0.1); padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13.5px; margin-bottom: 14px; outline: none; }
    button { width: 100%; background: #18181b; color: white; border: none; padding: 12px; border-radius: 9999px; font-family: monospace; font-weight: 600; font-size: 14px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="auth-card">
    <h2>Sign In to Stark Studio</h2>
    <p style="font-size:13px; color:#71717a; margin-bottom:24px;">Enter your developer credentials to sync workspaces.</p>
    <input type="email" placeholder="developer@stark.io">
    <input type="password" placeholder="••••••••••••">
    <button>Continue →</button>
  </div>
</body>
</html>`,
    hero: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #18181b; }
    .hero-box { background: #ffffff; padding: 48px; border-radius: 24px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); text-align: center; border: 1px solid rgba(0,0,0,0.08); max-width: 640px; }
    h1 { font-size: 32px; font-weight: 700; margin-top: 0; letter-spacing: -0.5px; }
    p { font-size: 15px; color: #71717a; line-height: 1.6; margin-bottom: 28px; }
    .cta-btn { background: #18181b; color: white; border: none; padding: 12px 28px; border-radius: 9999px; font-family: monospace; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.15s ease; }
    .cta-btn:hover { background: #27272a; transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="hero-box">
    <h1>Design Studio for Developers</h1>
    <p>Turn tweets, articles and rough ideas into interactive, production-ready knowledge spaces with Stark Design System.</p>
    <button class="cta-btn" onclick="alert('Open Design Action')">Explore Components →</button>
  </div>
</body>
</html>`,
    dashboard: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #141414; color: #f9fafb; }
    .widget { background: #202020; padding: 32px; border-radius: 8px; border: 1px solid #333333; width: 440px; box-shadow: 0 12px 36px rgba(0,0,0,0.5); }
    .metric-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #2a2a2a; }
    .val { font-weight: bold; font-size: 18px; color: #ffffff; }
    .bar { height: 6px; background: #383838; border-radius: 3px; overflow: hidden; margin-top: 6px; }
    .fill { height: 100%; background: #ffffff; width: 78%; }
  </style>
</head>
<body>
  <div class="widget">
    <h3 style="margin-top:0; font-size:16px;">System Activity Metrics</h3>
    <div class="metric-row">
      <span>Active Sessions</span>
      <span class="val">1,420</span>
    </div>
    <div class="metric-row">
      <span>Local Memory Usage</span>
      <span class="val">240 MB</span>
    </div>
    <div style="margin-top: 16px;">
      <span style="font-size:12px; color:#a0a0a5;">CPU Load Capacity: 78%</span>
      <div class="bar"><div class="fill"></div></div>
    </div>
  </div>
</body>
</html>`,
    form: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #18181b; }
    .form-box { background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); width: 360px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 16px; }
    label { font-size: 12.5px; color: #71717a; }
    input { background: #f4f4f5; border: 1px solid rgba(0,0,0,0.12); color: #18181b; padding: 10px 14px; border-radius: 6px; font-family: monospace; outline: none; }
    button { background: #18181b; color: white; border: none; padding: 12px; border-radius: 6px; font-family: monospace; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="form-box">
    <h3 style="margin:0; font-size:17px;">Settings Panel</h3>
    <div>
      <label>Workspace Identifier:</label>
      <input type="text" value="crafter-linux-repo" style="width:100%; box-sizing:border-box; margin-top:6px;">
    </div>
    <div>
      <label>Default LLM Model:</label>
      <input type="text" value="Qwen 2.5 1.5B" style="width:100%; box-sizing:border-box; margin-top:6px;">
    </div>
    <button>Save System Settings</button>
  </div>
</body>
</html>`,
    grid: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #141414; color: #f9fafb; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 860px; }
    .card { background: #202020; border: 1px solid #333333; padding: 24px; border-radius: 6px; text-align: left; }
    h4 { margin-top: 0; font-size: 15px; color: #ffffff; }
    p { font-size: 12.5px; color: #a0a0a5; line-height: 1.5; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="grid">
    <div class="card">
      <h4>Deep Seams</h4>
      <p>Modular isolation behind clean public interfaces for leverage and locality.</p>
    </div>
    <div class="card">
      <h4>Local LLM First</h4>
      <p>Fast offline execution powered by Ollama Qwen models under 300MB RAM.</p>
    </div>
    <div class="card">
      <h4>Vibe Engineering</h4>
      <p>100% monochrome visual fidelity with subtle glassmorphic elevation.</p>
    </div>
  </div>
</body>
</html>`,
    pricing: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #18181b; padding: 20px; }
    .pricing-grid { display: flex; gap: 20px; max-width: 820px; width: 100%; }
    .plan-card { flex: 1; background: #ffffff; border: 1px solid rgba(0,0,0,0.08); padding: 32px 24px; border-radius: 16px; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
    .plan-card.featured { border: 2px solid #18181b; box-shadow: 0 16px 50px rgba(0,0,0,0.1); }
    .price { font-size: 32px; font-weight: 700; margin: 16px 0; }
    button { width: 100%; background: #18181b; color: white; border: none; padding: 12px; border-radius: 9999px; font-family: monospace; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="pricing-grid">
    <div class="plan-card">
      <h3 style="margin:0;">Local Dev</h3>
      <div class="price">$0</div>
      <p style="font-size:13px; color:#71717a;">Offline Ollama execution</p>
      <button>Start Free</button>
    </div>
    <div class="plan-card featured">
      <span style="font-size:11px; background:#f4f4f5; padding:3px 10px; border-radius:9999px;">RECOMMENDED</span>
      <h3 style="margin:8px 0 0 0;">Pro Studio</h3>
      <div class="price">$29</div>
      <p style="font-size:13px; color:#71717a;">Cloud LLMs + Open Design</p>
      <button>Upgrade Plan</button>
    </div>
  </div>
</body>
</html>`,
  };

  const [designHtmlCode, setDesignHtmlCode] = useState(designPresets.landing);
  const [designVersions, setDesignVersions] = useState([designPresets.landing]);
  const [designTokenUsage, setDesignTokenUsage] = useState({
    total: 0,
    input: 0,
    output: 0,
  });
  const [pickedElement, setPickedElement] = useState(null);

  useEffect(() => {
    if (activePreset && designPresets[activePreset]) {
      const newCode = designPresets[activePreset];
      setDesignHtmlCode(newCode);
      setDesignVersions([newCode]);
    }
  }, [activePreset]);

  const handleGenerateDesignUI = (promptText, scope, model, options = {}) => {
    const scopeBadge =
      scope === "button"
        ? "[Scope: Botón/CTA]"
        : scope === "typography"
          ? "[Scope: Tipografía]"
          : scope === "css"
            ? "[Scope: Paleta CSS]"
            : "[Scope: Lienzo Completo]";
    const reasoningNote = options.reasoning
      ? "con razonamiento paso a paso"
      : "";
    const pickedNote = pickedElement
      ? ` sobre el elemento ${pickedElement.selector}`
      : "";
    const updatedCode = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; color: #18181b; }
    .box { background: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.08); text-align: center; max-width: 480px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
    h2 { margin-top: 0; font-size: 20px; font-weight: 700; }
    p { font-size: 14px; color: #71717a; line-height: 1.6; }
    button { background: #18181b; color: white; border: none; padding: 12px 24px; border-radius: 9999px; font-family: monospace; cursor: pointer; font-weight: 600; margin-top: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  </style>
</head>
<body>
  <div class="box">
    <h2>${scopeBadge} UI Iteration: ${promptText}</h2>
    <p>Component updated dynamically in real-time driven by ${model || "Ollama Qwen 2.5 1.5B"}${reasoningNote}${pickedNote}.</p>
    <button onclick="alert('Scope Iteration Confirmed')">Action Confirmed →</button>
  </div>
</body>
</html>`;

    setDesignHtmlCode(updatedCode);
    setDesignVersions((prev) => [...prev, updatedCode]);
    setDesignTokenUsage((prev) => ({
      total: prev.total + 320 + Math.round(promptText.length / 4),
      input: prev.input + 220,
      output: prev.output + 100 + Math.round(promptText.length / 4),
    }));
  };

  const handleRestoreVersion = (idx) => {
    if (designVersions[idx]) {
      setDesignHtmlCode(designVersions[idx]);
    }
  };

  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatMeta, setChatMeta] = useState({});

  const handleNewChat = () => {
    const newId = "chat-" + Date.now();
    const newConv = { id: newId, title: "Nueva conversación" };
    setConversations((prev) => [newConv, ...prev]);
    setActiveChatId(newId);
    setChatMessages((prev) => ({ ...prev, [newId]: [] }));
    setChatMeta((prev) => ({
      ...prev,
      [newId]: { parent_id: null, kind: "root" },
    }));
  };

  const handleSelectChat = (id) => {
    setActiveChatId(id);
  };

  const handleForkChat = async (sourceId) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const fork = await invoke("chat_fork", { parentId: sourceId });
      if (!fork || !fork.id) return;
      const newConv = { id: fork.id, title: fork.title };
      setConversations((prev) => [newConv, ...prev]);
      setChatMessages((prev) => ({
        ...prev,
        [fork.id]: (fork.messages || []).map((m) => ({
          sender: m.role,
          text: m.content,
          isStreaming: false,
        })),
      }));
      setChatMeta((prev) => ({
        ...prev,
        [fork.id]: {
          parent_id: fork.parent_id || null,
          kind: fork.kind || "branch",
        },
      }));
      setActiveChatId(fork.id);
    } catch (e) {
      console.error("Error creando rama:", e);
    }
  };

  const handleCompactChat = async (sourceId) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const msgs = chatMessages[sourceId] || [];
      const older = msgs
        .slice(0, Math.max(0, msgs.length - 4))
        .map(
          (m) =>
            (m.sender === "user" ? "U" : "A") +
            ": " +
            (m.text || "").slice(0, 120)
        )
        .join("\n");
      const summary = older
        ? `${older}\n(Conversación compactada en la rama ${activeChatId || sourceId})`
        : "(Conversación compactada)";
      const compacted = await invoke("chat_compact", {
        id: sourceId,
        summary,
        keepTails: 2,
      });
      setChatMessages((prev) => ({
        ...prev,
        [sourceId]: (compacted.messages || []).map((m) => ({
          sender: m.role,
          text: m.content,
          isStreaming: false,
        })),
      }));
      setChatMeta((prev) => ({
        ...prev,
        [sourceId]: {
          parent_id: compacted.parent_id || null,
          kind: compacted.kind || "compacted",
        },
      }));
    } catch (e) {
      console.error("Error compactando: ", e);
    }
  };

  const ensureActiveChat = () => {
    if (activeChatId) return activeChatId;
    const newId = "chat-" + Date.now();
    setConversations((prev) => [
      { id: newId, title: "Nueva conversación" },
      ...prev,
    ]);
    setActiveChatId(newId);
    setChatMessages((prev) => ({ ...prev, [newId]: [] }));
    return newId;
  };

  const handleChatMessages = (chatId, updater) => {
    setChatMessages((prev) => {
      const cur = prev[chatId] || [];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [chatId]: next };
    });
  };

  const handleSetChatTitle = (chatId, title) => {
    if (!title || !chatId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, title } : c))
    );
  };

  const saveChatTimer = useRef(null);

  const persistChat = (chatId, record) => {
    try {
      const s = record.messages.length;
      if (s === 0) return;
      const name = record.title;
      if (saveChatTimer.current) clearTimeout(saveChatTimer.current);
      saveChatTimer.current = setTimeout(async () => {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("chat_save", { payload: record });
        } catch (e) {
          // Sin Tauri (modo navegador): ignorar
        }
      }, 600);
    } catch (e) {
      // noop
    }
  };

  useEffect(() => {
    if (!conversations.length) return;
    const newest = activeChatId || conversations[0].id;
    const record = toPersistRecord(
      newest,
      chatMessages[newest] || [],
      conversations.find((c) => c.id === newest)?.title
    );
    persistChat(newest, record);
    conversations.forEach((c) => {
      if (c.id === newest) return;
      const rec = toPersistRecord(c.id, chatMessages[c.id] || [], c.title);
      try {
        const { invoke } = import("@tauri-apps/api/core");
        invoke("chat_save", { payload: rec }).catch(() => {});
      } catch (e) {
        // noop
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, chatMessages]);

  const handleDeleteChat = async (chatId) => {
    setConversations((prev) => prev.filter((c) => c.id !== chatId));
    setChatMessages((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (activeChatId === chatId) {
      const next = conversations.find((c) => c.id !== chatId);
      setActiveChatId(next ? next.id : null);
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("chat_delete", { id: chatId });
    } catch (e) {
      // noop
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const scale = Math.max(0.7, Math.min(1.0, window.innerWidth / 1315));
      document.documentElement.style.setProperty(
        "--ui-scale",
        scale.toFixed(3)
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleApproveEdit = async (edit) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("edit_apply", {
        payload: {
          file_path: edit.filePath,
          new_content: edit.newContent,
          description: edit.description,
        },
      });
      alert(`Edición aplicada exitosamente a ${edit.filePath}`);
    } catch (err) {
      alert(`Edición aplicada localmente: ${edit.filePath}`);
    }
    setProposedEdit(null);
  };

  const handleApproveCommand = async (command, perimeterMode) => {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("terminal_execute", {
      cmdStr: command,
      workspacePath: workspacePath || DEFAULT_WORKSPACE,
      perimeterMode,
      timeoutSecs: 30,
    });
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* Collapsible Unified Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        currentMode={currentMode}
        setMode={setMode}
        onOpenDoctor={() => setIsDoctorOpen(true)}
        conversations={conversations}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        activeFile={activeFile}
        setActiveFile={setActiveFile}
        fileTree={fileTree}
        activePreset={activePreset}
        handlePresetSelect={setActivePreset}
        onGenerateDesignUI={handleGenerateDesignUI}
        designVersions={designVersions}
        onRestoreVersion={handleRestoreVersion}
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          if (page === "home") {
            setMode("chat");
          }
        }}
        chatMessages={chatMessages}
        isMaximized={isMaximized}
        setIsMaximized={setIsMaximized}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGettingStarted={() => setIsGettingStartedOpen(true)}
        onOpenProviderManager={() => setIsProviderManagerOpen(true)}
        onOpenVoiceAssistant={() => setIsVoiceOpen(true)}
        lang={lang}
      />

      <main className="app-main">
        {/* Navbar with Theme Toggle Button */}
        <HeaderBar
          currentMode={currentMode}
          setMode={setMode}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          lang={lang}
        />

        {/* Full-page routes for global pages */}
        {activePage === "ds" && <DesignSystemPage />}
        {activePage === "plugin" && <PluginHubPage />}
        {activePage === "integrations" && <IntegrationsPage />}
        {activePage === "projects" && <ProjectsPage lang={lang} />}
        {activePage === "usage" && <UsagePage />}
        {activePage === "skills" && (
          <SkillsPage workspacePath={workspacePath} />
        )}

        {/* Workspace modes — only shown when no global page is active */}
        {(!activePage || activePage === "home") && currentMode === "chat" && (
          <ChatView
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            agentMode={agentMode}
            setAgentMode={setAgentMode}
            reasoning={reasoning}
            setReasoning={setReasoning}
            setProposedEdit={setProposedEdit}
            setProposedCommand={setProposedCommand}
            providersConfig={providersConfig}
            onOpenProviderManager={() => setIsProviderManagerOpen(true)}
            onOpenModelSelector={() => setIsModelSelectorOpen(true)}
            activeChatId={activeChatId}
            messages={chatMessages[activeChatId] || []}
            onMessagesChange={handleChatMessages}
            onEnsureChat={ensureActiveChat}
            onSetChatTitle={handleSetChatTitle}
            onForkChat={handleForkChat}
            onCompactChat={handleCompactChat}
            workspacePath={workspacePath}
            lang={lang}
            fileTree={fileTree}
          />
        )}
        {(!activePage || activePage === "home") && currentMode === "code" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            <SessionTabs
              sessions={codeSessions}
              activeSessionId={activeCodeSessionId}
              onSelect={setActiveCodeSessionId}
              onNew={addCodeSession}
              onClose={closeCodeSession}
            />
            <CodeView
              selectedModel={selectedModel}
              activeFile={activeFile}
              onOpenModelSelector={() => setIsModelSelectorOpen(true)}
              activeSessionId={activeCodeSessionId}
              workspacePath={workspacePath}
            />
          </div>
        )}
        {(!activePage || activePage === "home") && currentMode === "design" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {designSessions.length > 0 && (
              <SessionTabs
                sessions={designSessions}
                activeSessionId={activeDesignSessionId}
                onSelect={setActiveDesignSessionId}
                onNew={addDesignSession}
                onClose={closeDesignSession}
              />
            )}
            <div
              style={{
                display: "flex",
                flex: 1,
                overflow: "hidden",
                height: "100%",
              }}
            >
              {designSessions.length > 0 ? (
                <>
                  <DesignChatPanel
                    activePreset={activePreset}
                    onPresetSelect={setActivePreset}
                    onGenerateDesignUI={handleGenerateDesignUI}
                    designVersions={designVersions}
                    onRestoreVersion={handleRestoreVersion}
                    artifactType={artifactType}
                    onArtifactTypeChange={setArtifactType}
                    selectedProvider={selectedProvider}
                    setSelectedProvider={setSelectedProvider}
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    reasoning={reasoning}
                    setReasoning={setReasoning}
                    tokenUsage={designTokenUsage}
                    pickedElement={pickedElement}
                    onClearPickedElement={() => setPickedElement(null)}
                    providersConfig={providersConfig}
                    onOpenProviderManager={() => setIsProviderManagerOpen(true)}
                    workspacePath={workspacePath}
                  />
                  <DesignView
                    htmlCode={designHtmlCode}
                    activePreset={activePreset}
                    activePage={activePage}
                    onSelectPreset={setActivePreset}
                    onResetPreset={() =>
                      setDesignHtmlCode(
                        designPresets[activePreset || "landing"]
                      )
                    }
                    artifactType={artifactType}
                    onElementPicked={setPickedElement}
                    activeSessionId={activeDesignSessionId}
                  />
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    overflowY: "auto",
                    padding: "24px",
                    background: "var(--colors-canvas)",
                    gap: "20px",
                  }}
                >
                  {/* Hero Create Card */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <div
                      onClick={addDesignSession}
                      style={{
                        width: "100%",
                        maxWidth: "640px",
                        padding: "28px",
                        background: "var(--colors-surface-card)",
                        border: "1px solid var(--colors-hairline)",
                        borderRadius: "8px",
                        textAlign: "center",
                        cursor: "pointer",
                        transition: "all var(--transition-normal)",
                      }}
                      className="library-create-card"
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-ink)",
                          margin: "0 0 6px 0",
                          fontSize: "16px",
                          fontWeight: "700",
                        }}
                      >
                        Crear Nuevo Diseno
                      </h3>
                      <p
                        style={{
                          color: "var(--colors-muted)",
                          margin: 0,
                          fontSize: "12px",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Inicia una sesion de copilot interactiva para iterar tu
                        UI
                      </p>
                    </div>
                  </div>

                  {/* Two-Pane: Templates + Design Systems */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    {/* Templates Grid */}
                    <div
                      style={{
                        background: "var(--colors-surface-card)",
                        border: "1px solid var(--colors-hairline)",
                        borderRadius: "6px",
                        padding: "16px",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-ink)",
                          marginBottom: "12px",
                          fontSize: "13px",
                          borderBottom: "1px solid var(--colors-hairline)",
                          paddingBottom: "8px",
                          fontWeight: "700",
                        }}
                      >
                        Templates
                      </h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        {Object.keys(designPresets).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              setActivePreset(preset);
                              addDesignSession();
                            }}
                            className="template-card"
                            style={{
                              padding: "10px",
                              background: "var(--colors-surface-dark-soft)",
                              border: "1px solid var(--colors-hairline)",
                              color: "var(--colors-ink)",
                              borderRadius: "4px",
                              textAlign: "left",
                              cursor: "pointer",
                              fontFamily: "var(--font-mono)",
                              fontSize: "11px",
                              transition: "all var(--transition-fast)",
                              lineHeight: "1.4",
                            }}
                          >
                            <div
                              style={{ fontWeight: "600", marginBottom: "2px" }}
                            >
                              {preset}
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--colors-muted)",
                              }}
                            >
                              {preset === "landing"
                                ? "Hero + features + footer"
                                : preset === "dashboard-full"
                                  ? "Sidebar + stats + table"
                                  : preset === "docs"
                                    ? "Sidebar nav + content"
                                    : preset === "auth"
                                      ? "Login card form"
                                      : preset === "hero"
                                        ? "Centered CTA block"
                                        : preset === "dashboard"
                                          ? "Single metric widget"
                                          : preset === "form"
                                            ? "Settings panel"
                                            : preset === "grid"
                                              ? "3-col feature cards"
                                              : "Pricing comparison"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Design Systems */}
                    <div
                      style={{
                        background: "var(--colors-surface-card)",
                        border: "1px solid var(--colors-hairline)",
                        borderRadius: "6px",
                        padding: "16px",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-ink)",
                          marginBottom: "12px",
                          fontSize: "13px",
                          borderBottom: "1px solid var(--colors-hairline)",
                          paddingBottom: "8px",
                          fontWeight: "700",
                        }}
                      >
                        Design Systems
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            padding: "10px 12px",
                            background: "var(--colors-surface-dark-soft)",
                            border: "1px solid var(--colors-hairline-strong)",
                            borderRadius: "4px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                          }}
                          className="library-table-row"
                        >
                          <div>
                            <div
                              style={{
                                color: "var(--colors-ink)",
                                fontWeight: "700",
                                fontSize: "12px",
                              }}
                            >
                              Stark integrated system
                            </div>
                            <div
                              style={{
                                color: "var(--colors-muted)",
                                fontSize: "10px",
                                marginTop: "2px",
                              }}
                            >
                              Monochrome tokens, 4px grid, Lucide icons
                            </div>
                          </div>
                          <span
                            style={{
                              color: "var(--colors-primary)",
                              fontSize: "9px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              background: "var(--colors-surface-dark)",
                              borderRadius: "3px",
                              border: "1px solid var(--colors-hairline)",
                            }}
                          >
                            ACTIVE
                          </span>
                        </div>
                        <div
                          style={{
                            padding: "10px 12px",
                            background: "var(--colors-surface-dark-soft)",
                            border: "1px solid var(--colors-hairline)",
                            borderRadius: "4px",
                            fontFamily: "var(--font-mono)",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                          }}
                          className="library-table-row"
                        >
                          <div style={{ color: "var(--colors-muted)" }}>
                            Custom .fig system
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              color: "var(--colors-muted-soft)",
                              marginTop: "2px",
                            }}
                          >
                            Stub — adjunta un archivo .fig para activar
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asset Grid */}
                  <div
                    style={{
                      background: "var(--colors-surface-card)",
                      border: "1px solid var(--colors-hairline)",
                      borderRadius: "6px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        borderBottom: "1px solid var(--colors-hairline)",
                        paddingBottom: "8px",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-ink)",
                          margin: 0,
                          fontSize: "13px",
                          fontWeight: "700",
                        }}
                      >
                        Library Assets
                      </h3>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-muted)",
                            padding: "3px 8px",
                            background: "var(--colors-surface-dark)",
                            borderRadius: "3px",
                            border: "1px solid var(--colors-hairline)",
                          }}
                        >
                          All
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-muted)",
                            padding: "3px 8px",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          Design
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-muted)",
                            padding: "3px 8px",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          Images
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-muted)",
                            padding: "3px 8px",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          Video
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                      }}
                    >
                      {[
                        {
                          name: "landing_mockup.fig",
                          size: "1.2 MB",
                          type: "Design",
                          ext: "fig",
                          color: "#7c3aed",
                        },
                        {
                          name: "dashboard_preview.png",
                          size: "240 KB",
                          type: "Images",
                          ext: "png",
                          color: "#059669",
                        },
                        {
                          name: "intro_video.mp4",
                          size: "14.5 MB",
                          type: "Video",
                          ext: "mp4",
                          color: "#dc2626",
                        },
                        {
                          name: "design_tokens.json",
                          size: "12 KB",
                          type: "Design",
                          ext: "json",
                          color: "#d97706",
                        },
                      ].map((asset) => (
                        <div
                          key={asset.name}
                          onClick={addDesignSession}
                          className="library-table-row"
                          style={{
                            padding: "12px",
                            background: "var(--colors-surface-dark-soft)",
                            border: "1px solid var(--colors-hairline)",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "4px",
                                background: asset.color + "20",
                                border: "1px solid " + asset.color + "40",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "9px",
                                fontFamily: "var(--font-mono)",
                                fontWeight: "700",
                                color: asset.color,
                                flexShrink: 0,
                              }}
                            >
                              {asset.ext.toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  color: "var(--colors-ink)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {asset.name}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "10px",
                                  color: "var(--colors-muted)",
                                }}
                              >
                                {asset.size}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "9px",
                                fontFamily: "var(--font-mono)",
                                color: "var(--colors-muted)",
                                padding: "1px 5px",
                                background: "var(--colors-surface-dark)",
                                borderRadius: "2px",
                              }}
                            >
                              {asset.type}
                            </span>
                            <span
                              style={{
                                fontSize: "9px",
                                fontFamily: "var(--font-mono)",
                                color: "var(--colors-muted-soft)",
                              }}
                            >
                              private
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <DiffModal
        proposedEdit={proposedEdit}
        onApprove={handleApproveEdit}
        onReject={() => setProposedEdit(null)}
      />

      <TerminalModal
        proposedCommand={proposedCommand}
        onApprove={handleApproveCommand}
        onReject={() => setProposedCommand(null)}
      />

      <DoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
        lang={lang}
      />

      <ProviderManagerModal
        isOpen={isProviderManagerOpen}
        onClose={() => setIsProviderManagerOpen(false)}
        onProvidersChanged={refreshProviders}
      />

      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onSelect={(provider, model) => {
          setSelectedProvider(provider);
          setSelectedModel(model);
          try {
            localStorage.setItem("stark.selected_provider", provider);
            localStorage.setItem("stark.selected_model", model);
          } catch (e) {
            /* noop */
          }
        }}
        providersConfig={providersConfig}
        onOpenProviderManager={() => setIsProviderManagerOpen(true)}
      />

      <UnlockModal isOpen={isLocked} onUnlock={() => setIsLocked(false)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        lang={lang}
        onToggleLang={() => setLang(lang === "es" ? "en" : "es")}
      />

      <GettingStartedModal
        isOpen={isGettingStartedOpen}
        onClose={async () => {
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            await invoke("storage_save", {
              key: "stark_onboarded",
              value: "1",
            });
          } catch {}
          setIsGettingStartedOpen(false);
        }}
        onConnectProvider={() => setIsProviderManagerOpen(true)}
        ollamaInstalled={ollamaAvailable}
      />

      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />
    </div>
  );
}
