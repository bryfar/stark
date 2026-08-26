import { h } from "preact";
import { useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import {
  Package,
  Link as LinkIcon,
  Check,
  Loader,
  Download,
} from "lucide-react";

const BUNDLED_SKILLS = [
  {
    name: "diagnose-crash",
    desc: "Diagnose crashes from coredumpctl and journal",
  },
  {
    name: "code-review",
    desc: "Review code for standards and spec compliance",
  },
  { name: "tdd", desc: "Test-driven development workflow" },
  { name: "implement", desc: "Implement features from spec or tickets" },
  { name: "grill-me", desc: "Relentless interview to sharpen plans" },
  { name: "domain-modeling", desc: "Build and sharpen domain models" },
  { name: "design-an-interface", desc: "Generate multiple interface designs" },
  { name: "to-spec", desc: "Turn conversation into a spec" },
];

const HARNESS_TARGETS = [
  { id: "claude", path: "~/.claude/skills/stark", label: "Claude Code" },
  { id: "codex", path: "~/.codex/skills/stark", label: "OpenAI Codex" },
  { id: "pi", path: "~/.pi/agent/skills/stark", label: "Pi Agent" },
  { id: "agents", path: "~/.agents/skills/stark", label: "Generic .agents" },
];

export function SkillsPage({
  workspacePath = "/home/bryan/Downloads/Repos/stark",
}) {
  const [installing, setInstalling] = useState(false);
  const [symlinking, setSymlinking] = useState(false);
  const [installed, setInstalled] = useState([]);
  const [symlinkResult, setSymlinkResult] = useState(null);
  const [error, setError] = useState(null);

  // Agent Builder States
  const [agents, setAgents] = useState([]);
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentInst, setAgentInst] = useState("");
  const [agentScope, setAgentScope] = useState("workspace");
  const [creatingAgent, setCreatingAgent] = useState(false);

  const loadAgents = async () => {
    try {
      const list = await invoke("agents_list", { workspacePath });
      setAgents(list || []);
    } catch (e) {
      console.error("Error cargando agentes:", e);
    }
  };

  useEffect(() => {
    loadAgents();
  }, [workspacePath]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    if (!agentName.trim()) return;
    setCreatingAgent(true);
    setError(null);
    try {
      await invoke("agents_create", {
        name: agentName,
        description: agentDesc,
        instructions: agentInst,
        scope: agentScope,
        workspacePath,
      });
      setAgentName("");
      setAgentDesc("");
      setAgentInst("");
      loadAgents();
    } catch (e) {
      setError(String(e));
    }
    setCreatingAgent(false);
  };

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      const result = await invoke("skills_install_bundled");
      setInstalled(result);
    } catch (e) {
      setError(String(e));
    }
    setInstalling(false);
  };

  const handleSymlinks = async () => {
    setSymlinking(true);
    setError(null);
    try {
      const [installedLinks, skippedLinks] = await invoke(
        "skills_install_symlinks",
        { targets: null }
      );
      setSymlinkResult({ installed: installedLinks, skipped: skippedLinks });
    } catch (e) {
      setError(String(e));
    }
    setSymlinking(false);
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "700px",
        margin: "0 auto",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <Package size={22} strokeWidth={1.75} />
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: "var(--colors-ink)",
          }}
        >
          Skills Empaquetados
        </h1>
      </div>

      <p
        style={{
          fontSize: "11.5px",
          lineHeight: 1.6,
          color: "var(--colors-body)",
          marginBottom: "20px",
        }}
      >
        Stark incluye skills de agentes incrustados en el binario. Instalalos a
        tu directorio local y crea symlinks para que Claude Code, Codex y Pi los
        descubran automaticamente.
      </p>

      {error && (
        <div
          style={{
            padding: "12px",
            background: "var(--colors-surface-dark)",
            border: "1px solid var(--colors-hairline)",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "11px",
            color: "var(--colors-muted)",
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Install bundled skills */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: "var(--colors-ink)",
          }}
        >
          1. Instalar skills empaquetados
        </h2>
        <p
          style={{
            fontSize: "10.5px",
            color: "var(--colors-muted)",
            marginBottom: "12px",
          }}
        >
          Escribe los SKILL.md a ~/.local/share/stark/skills/ (idempotente).
        </p>
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background:
              installed.length > 0
                ? "var(--colors-surface-dark)"
                : "var(--colors-primary, #fff)",
            color:
              installed.length > 0
                ? "var(--colors-ink)"
                : "var(--colors-canvas, #1e1e1e)",
            border: "none",
            borderRadius: "6px",
            cursor: installing ? "wait" : "pointer",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
          }}
        >
          {installing ? (
            <Loader size={14} strokeWidth={1.75} className="spin" />
          ) : (
            <Download size={14} strokeWidth={1.75} />
          )}
          {installed.length > 0
            ? `Reinstalado (${installed.length} actualizados)`
            : "Instalar Skills"}
        </button>

        {/* Skill list */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "6px",
            marginTop: "12px",
          }}
        >
          {BUNDLED_SKILLS.map((s) => (
            <div
              key={s.name}
              style={{
                padding: "8px 10px",
                background: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                borderRadius: "4px",
                fontSize: "10.5px",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div style={{ color: "var(--colors-ink)", fontWeight: 500 }}>
                {s.name}
              </div>
              <div style={{ color: "var(--colors-muted)", marginTop: "2px" }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create symlinks */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: "var(--colors-ink)",
          }}
        >
          2. Crear symlinks para harnesses
        </h2>
        <p
          style={{
            fontSize: "10.5px",
            color: "var(--colors-muted)",
            marginBottom: "12px",
          }}
        >
          Vincula los skills a los directorios estandar de cada agente externo.
        </p>
        <button
          onClick={handleSymlinks}
          disabled={symlinking}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: symlinkResult
              ? "var(--colors-surface-dark)"
              : "var(--colors-primary, #fff)",
            color: symlinkResult
              ? "var(--colors-ink)"
              : "var(--colors-canvas, #1e1e1e)",
            border: "none",
            borderRadius: "6px",
            cursor: symlinking ? "wait" : "pointer",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
          }}
        >
          {symlinking ? (
            <Loader size={14} strokeWidth={1.75} className="spin" />
          ) : (
            <LinkIcon size={14} strokeWidth={1.75} />
          )}
          {symlinkResult ? "Symlinks actualizados" : "Crear Symlinks"}
        </button>

        {/* Harness targets */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginTop: "12px",
          }}
        >
          {HARNESS_TARGETS.map((t) => {
            const isInstalled = symlinkResult?.installed?.some((p) =>
              p.includes(t.id)
            );
            const isSkipped = symlinkResult?.skipped?.some((p) =>
              p.includes(t.id)
            );
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: "var(--colors-surface-dark)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "4px",
                  fontSize: "10.5px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {isInstalled ? (
                  <Check
                    size={12}
                    strokeWidth={1.75}
                    style={{ color: "#4ade80", flexShrink: 0 }}
                  />
                ) : isSkipped ? (
                  <Check
                    size={12}
                    strokeWidth={1.75}
                    style={{ color: "var(--colors-muted)", flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      border: "1px solid var(--colors-hairline)",
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--colors-ink)", fontWeight: 500 }}>
                    {t.label}
                  </div>
                  <div
                    style={{ color: "var(--colors-muted)", marginTop: "1px" }}
                  >
                    {t.path}
                  </div>
                </div>
                {isInstalled && (
                  <span style={{ fontSize: "9px", color: "#4ade80" }}>
                    Creado
                  </span>
                )}
                {isSkipped && (
                  <span
                    style={{ fontSize: "9px", color: "var(--colors-muted)" }}
                  >
                    Ya existia
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Creador de Agentes Personalizados (No-Code Agent Builder) */}
      <div
        style={{
          marginTop: "32px",
          borderTop: "1px solid var(--colors-hairline)",
          paddingTop: "24px",
        }}
      >
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            color: "var(--colors-ink)",
          }}
        >
          3. Constructor de Agentes Personalizados
        </h2>
        <p
          style={{
            fontSize: "10.5px",
            color: "var(--colors-muted)",
            marginBottom: "16px",
          }}
        >
          Define un agente con un rol y directrices específicas. Se creará un
          archivo markdown en el espacio de trabajo o directorio global del
          usuario.
        </p>

        <form
          onSubmit={handleCreateAgent}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            background: "var(--colors-surface-dark-soft)",
            border: "1px solid var(--colors-hairline)",
            borderRadius: "6px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: "bold" }}>
              Nombre del Agente
            </label>
            <input
              type="text"
              placeholder="Ej. experto-react"
              value={agentName}
              onInput={(e) => setAgentName(e.target.value)}
              style={{
                padding: "8px",
                fontSize: "12px",
                background: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                borderRadius: "4px",
                color: "var(--colors-ink)",
              }}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: "bold" }}>
              Descripción
            </label>
            <input
              type="text"
              placeholder="Ej. Agente especializado en reviews de React 19 y patrones"
              value={agentDesc}
              onInput={(e) => setAgentDesc(e.target.value)}
              style={{
                padding: "8px",
                fontSize: "12px",
                background: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                borderRadius: "4px",
                color: "var(--colors-ink)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: "bold" }}>
              Instrucciones del Sistema
            </label>
            <textarea
              placeholder="Escribe las directrices detalladas que seguirá este agente..."
              value={agentInst}
              onInput={(e) => setAgentInst(e.target.value)}
              rows={4}
              style={{
                padding: "8px",
                fontSize: "12px",
                background: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                borderRadius: "4px",
                color: "var(--colors-ink)",
                resize: "vertical",
              }}
              required
            />
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <label
              style={{
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="scope"
                value="workspace"
                checked={agentScope === "workspace"}
                onChange={() => setAgentScope("workspace")}
              />
              Espacio de Trabajo (Workspace)
            </label>
            <label
              style={{
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="scope"
                value="global"
                checked={agentScope === "global"}
                onChange={() => setAgentScope("global")}
              />
              Global (Usuario)
            </label>
          </div>

          <button
            type="submit"
            disabled={creatingAgent}
            style={{
              padding: "10px 16px",
              background: "var(--colors-primary, #fff)",
              color: "var(--colors-canvas, #1e1e1e)",
              border: "none",
              borderRadius: "6px",
              cursor: creatingAgent ? "wait" : "pointer",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              alignSelf: "flex-start",
            }}
          >
            {creatingAgent ? "Creando..." : "Crear Agente"}
          </button>
        </form>

        <h3
          style={{ fontSize: "13px", margin: "20px 0 10px", fontWeight: 600 }}
        >
          Agentes Registrados
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "6px",
          }}
        >
          {agents.length > 0 ? (
            agents.map((a) => (
              <div
                key={a.name}
                style={{
                  padding: "8px 10px",
                  background: "var(--colors-surface-dark)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "4px",
                  fontSize: "10.5px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div style={{ color: "var(--colors-ink)", fontWeight: 500 }}>
                  {a.name}
                </div>
                <div style={{ color: "var(--colors-muted)", marginTop: "2px" }}>
                  {a.description}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--colors-muted)",
                gridColumn: "span 2",
              }}
            >
              No hay agentes personalizados creados aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SkillsPage;
