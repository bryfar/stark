import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import {
  Link as LinkIcon,
  Check,
  Plus,
  RefreshCw,
  Trash2,
  Power,
  AlertCircle,
} from "lucide-react";

const INTEGRATIONS = [
  {
    id: "ollama",
    name: "Ollama Local LLM",
    desc: "Runs local LLM inference under 300MB RAM. Zero cloud latency.",
    status: "connected",
    detail: "Active: Qwen 2.5 1.5B",
    category: "LLM Engine",
  },
  {
    id: "tauri",
    name: "Tauri Desktop Runtime",
    desc: "Sandboxed native filesystem and IPC bridge for desktop-grade artifacts.",
    status: "connected",
    detail: "Tauri v2 — Linux",
    category: "Runtime",
  },
  {
    id: "vercel",
    name: "Vercel Deploy Pipeline",
    desc: "Push generated HTML/CSS prototypes to a Vercel project on export.",
    status: "disconnected",
    detail: "Not configured",
    category: "Deployment",
  },
  {
    id: "github",
    name: "GitHub Repository Sync",
    desc: "Index, read, and write files directly from your active GitHub repo.",
    status: "disconnected",
    detail: "Not configured",
    category: "Source Control",
  },
  {
    id: "figma",
    name: "Figma MCP Bridge",
    desc: "Pull Figma variables and frames into your DESIGN.md brand contract.",
    status: "disconnected",
    detail: "Requires Figma Personal Token",
    category: "Design Tools",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude API",
    desc: "BYOK connection to Claude 3.5 Sonnet for advanced iteration prompts.",
    status: "disconnected",
    detail: "API key not set",
    category: "LLM Engine",
  },
];

const safeInvoke = async (cmd, args) => {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke(cmd, args);
  } catch (e) {
    console.warn(
      `Tauri invoke failed/not available for command "${cmd}". Using localStorage fallback.`,
      e
    );
    if (cmd === "storage_load") {
      return localStorage.getItem(`stark_fallback_${args.key}`) || "";
    } else if (cmd === "storage_save") {
      localStorage.setItem(`stark_fallback_${args.key}`, args.value);
      return true;
    }
    throw e;
  }
};

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  // MCP Servers states
  const [mcpServers, setMcpServers] = useState([]);
  const [mcpName, setMcpName] = useState("");
  const [mcpCommand, setMcpCommand] = useState("");
  const [mcpEnv, setMcpEnv] = useState("");
  const [mcpError, setMcpError] = useState("");

  // Load MCP Servers from storage
  useEffect(() => {
    const loadMcpServers = async () => {
      try {
        const raw = await safeInvoke("storage_load", {
          key: "mcp_servers_config",
        });
        if (raw) {
          setMcpServers(JSON.parse(raw));
        }
      } catch (e) {
        console.error("Error loading MCP servers config:", e);
      }
    };
    loadMcpServers();
  }, []);

  const saveMcpServers = async (servers) => {
    try {
      await safeInvoke("storage_save", {
        key: "mcp_servers_config",
        value: JSON.stringify(servers),
      });
    } catch (e) {
      console.error("Error saving MCP servers config:", e);
    }
  };

  const toggleConnect = (id) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              status: i.status === "connected" ? "disconnected" : "connected",
            }
          : i
      )
    );
  };

  const handleAddMcpServer = async (e) => {
    e.preventDefault();
    setMcpError("");

    if (!mcpName.trim() || !mcpCommand.trim()) {
      setMcpError("Name and Start Command are required.");
      return;
    }

    let parsedEnv = {};
    if (mcpEnv.trim()) {
      try {
        parsedEnv = JSON.parse(mcpEnv);
        if (
          typeof parsedEnv !== "object" ||
          parsedEnv === null ||
          Array.isArray(parsedEnv)
        ) {
          throw new Error("Environment variables must be a JSON object.");
        }
      } catch (err) {
        setMcpError("Invalid Environment Variables JSON: " + err.message);
        return;
      }
    }

    const newServer = {
      id: `mcp-${Date.now()}`,
      name: mcpName.trim(),
      command: mcpCommand.trim(),
      env: parsedEnv,
      enabled: true,
    };

    const updated = [...mcpServers, newServer];
    setMcpServers(updated);
    await saveMcpServers(updated);

    // Reset inputs
    setMcpName("");
    setMcpCommand("");
    setMcpEnv("");
  };

  const handleDeleteMcpServer = async (id) => {
    const updated = mcpServers.filter((s) => s.id !== id);
    setMcpServers(updated);
    await saveMcpServers(updated);
  };

  const handleToggleMcpServer = async (id) => {
    const updated = mcpServers.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setMcpServers(updated);
    await saveMcpServers(updated);
  };

  const connected = integrations.filter((i) => i.status === "connected");
  const disconnected = integrations.filter((i) => i.status !== "connected");

  const IntegrationCard = ({ integ }) => (
    <div
      style={{
        background: "var(--colors-surface-card)",
        border: "1px solid var(--colors-hairline)",
        borderRadius: "10px",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--colors-ink-deep)",
            }}
          >
            {integ.name}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              padding: "2px 7px",
              background: "var(--colors-surface-dark)",
              borderRadius: "9999px",
              border: "1px solid var(--colors-hairline)",
              color: "var(--colors-body)",
            }}
          >
            {integ.category}
          </span>
        </div>
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "12.5px",
            color: "var(--colors-body)",
            lineHeight: "1.5",
          }}
        >
          {integ.desc}
        </p>
        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color:
              integ.status === "connected"
                ? "var(--colors-body-strong, var(--colors-ink))"
                : "var(--colors-muted)",
          }}
        >
          {integ.detail}
        </span>
      </div>
      <button
        onClick={() => toggleConnect(integ.id)}
        style={{
          padding: "7px 14px",
          borderRadius: "6px",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          border: "1px solid var(--colors-hairline)",
          cursor: "pointer",
          fontWeight: "600",
          background:
            integ.status === "connected"
              ? "var(--colors-surface-dark)"
              : "var(--colors-ink)",
          color:
            integ.status === "connected"
              ? "var(--colors-body)"
              : "var(--colors-canvas)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "all 120ms",
        }}
      >
        {integ.status === "connected" ? (
          <>
            <Check size={11} strokeWidth={2} /> Connected
          </>
        ) : (
          <>
            <Plus size={11} strokeWidth={2} /> Connect
          </>
        )}
      </button>
    </div>
  );

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--colors-canvas)",
        padding: "32px 40px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2
          style={{
            margin: "0 0 6px",
            fontSize: "20px",
            fontWeight: "700",
            color: "var(--colors-ink-deep)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <LinkIcon size={18} strokeWidth={1.75} />
          Integrations
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--colors-body)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Connect external systems and MCP tools. Use Stark from any IDE,
          script, or automation.
        </p>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--colors-muted)",
              marginBottom: "10px",
            }}
          >
            Connected — {connected.length}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {connected.map((i) => (
              <IntegrationCard key={i.id} integ={i} />
            ))}
          </div>
        </div>
      )}

      {/* Available */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--colors-muted)",
            marginBottom: "10px",
          }}
        >
          Available — {disconnected.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {disconnected.map((i) => (
            <IntegrationCard key={i.id} integ={i} />
          ))}
        </div>
      </div>

      {/* MCP Servers Section */}
      <div
        style={{
          borderTop: "1px solid var(--colors-hairline)",
          paddingTop: "32px",
        }}
      >
        <h3
          style={{
            margin: "0 0 6px",
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--colors-ink-deep)",
          }}
        >
          Model Context Protocol (MCP) Servers
        </h3>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: "12.5px",
            color: "var(--colors-body)",
          }}
        >
          Register and manage stdio-based MCP servers. The agent will
          dynamically discover their tools and capabilities.
        </p>

        {mcpError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "#ef4444",
              fontSize: "12.5px",
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={16} />
            <span>{mcpError}</span>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px",
          }}
        >
          {/* Add MCP Server Form */}
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--colors-ink-deep)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Add New MCP Server
            </h4>
            <form
              onSubmit={handleAddMcpServer}
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <label
                  htmlFor="mcp-name-input"
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--colors-body)",
                  }}
                >
                  Server Name
                </label>
                <input
                  id="mcp-name-input"
                  type="text"
                  placeholder="e.g. Memory Server"
                  value={mcpName}
                  onInput={(e) => setMcpName(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    background: "var(--colors-surface-card)",
                    border: "1px solid var(--colors-hairline)",
                    borderRadius: "6px",
                    color: "var(--colors-ink-deep)",
                  }}
                  required
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <label
                  htmlFor="mcp-command-input"
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--colors-body)",
                  }}
                >
                  Start Command
                </label>
                <input
                  id="mcp-command-input"
                  type="text"
                  placeholder="e.g. npx -y @modelcontextprotocol/server-postgres"
                  value={mcpCommand}
                  onInput={(e) => setMcpCommand(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    background: "var(--colors-surface-card)",
                    border: "1px solid var(--colors-hairline)",
                    borderRadius: "6px",
                    color: "var(--colors-ink-deep)",
                    fontFamily: "var(--font-mono)",
                  }}
                  required
                />
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <label
                  htmlFor="mcp-env-input"
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--colors-body)",
                  }}
                >
                  Environment Variables (JSON)
                </label>
                <textarea
                  id="mcp-env-input"
                  placeholder='e.g. { "DB_URL": "postgresql://localhost/db" }'
                  value={mcpEnv}
                  onInput={(e) => setMcpEnv(e.target.value)}
                  rows={4}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    background: "var(--colors-surface-card)",
                    border: "1px solid var(--colors-hairline)",
                    borderRadius: "6px",
                    color: "var(--colors-ink-deep)",
                    fontFamily: "var(--font-mono)",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: "10px 16px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontFamily: "var(--font-mono)",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                  alignSelf: "flex-start",
                  background: "var(--colors-ink)",
                  color: "var(--colors-canvas)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 120ms",
                }}
              >
                <Plus size={14} strokeWidth={2} /> Add Server
              </button>
            </form>
          </div>

          {/* Registered MCP Servers List */}
          <div>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--colors-ink-deep)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Registered MCP Servers ({mcpServers.length})
            </h4>

            {mcpServers.length === 0 ? (
              <div
                style={{
                  border: "1px dashed var(--colors-hairline)",
                  borderRadius: "10px",
                  padding: "32px",
                  textAlign: "center",
                  color: "var(--colors-muted)",
                  fontSize: "12.5px",
                }}
              >
                No MCP servers registered yet. Use the form to register one.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {mcpServers.map((server) => (
                  <div
                    key={server.id}
                    style={{
                      background: "var(--colors-surface-card)",
                      border: "1px solid var(--colors-hairline)",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      opacity: server.enabled ? 1 : 0.6,
                      transition: "opacity 120ms",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13.5px",
                          fontWeight: "600",
                          color: "var(--colors-ink-deep)",
                        }}
                      >
                        {server.name}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggleMcpServer(server.id)}
                          title={
                            server.enabled ? "Disable Server" : "Enable Server"
                          }
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid var(--colors-hairline)",
                            background: server.enabled
                              ? "rgba(74, 222, 128, 0.1)"
                              : "var(--colors-surface-dark)",
                            color: server.enabled
                              ? "#4ade80"
                              : "var(--colors-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Power size={13} strokeWidth={2.5} />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteMcpServer(server.id)}
                          title="Delete Server"
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid var(--colors-hairline)",
                            background: "var(--colors-surface-dark)",
                            color: "var(--colors-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-mono)",
                          color: "var(--colors-muted)",
                        }}
                      >
                        Command:
                      </span>
                      <code
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          padding: "6px 10px",
                          background: "var(--colors-surface-dark)",
                          borderRadius: "4px",
                          border: "1px solid var(--colors-hairline)",
                          color: "var(--colors-body)",
                          wordBreak: "break-all",
                        }}
                      >
                        {server.command}
                      </code>
                    </div>

                    {Object.keys(server.env).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-mono)",
                            color: "var(--colors-muted)",
                          }}
                        >
                          Environment:
                        </span>
                        <pre
                          style={{
                            margin: 0,
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            padding: "6px 10px",
                            background: "var(--colors-surface-dark)",
                            borderRadius: "4px",
                            border: "1px solid var(--colors-hairline)",
                            color: "var(--colors-body)",
                            overflowX: "auto",
                          }}
                        >
                          {JSON.stringify(server.env, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
