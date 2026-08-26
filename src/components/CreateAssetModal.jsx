import { h } from "preact";
import { useState } from "preact/hooks";
import {
  Sparkles,
  Bot,
  Puzzle,
  X,
  AlertTriangle,
  Check,
  Globe,
  FolderDown,
} from "lucide-react";

const COPY = {
  es: {
    skill: {
      title: "Nueva Skill",
      name: "Nombre",
      desc: "Descripción",
      body: "Contenido del prompt",
      hint: "Se crea como .agents/skills/<slug>/SKILL.md con carga progresiva estilo Eve Vercel.",
    },
    agent: {
      title: "Nuevo Agente",
      name: "Nombre",
      desc: "Descripción",
      body: "Instrucciones del rol",
      hint: "El agente incluye el protocolo Eve Vercel de carga progresiva de skills.",
    },
    plugin: {
      title: "Nuevo Plugin",
      name: "Nombre",
      desc: "Descripción",
      body: "Plantilla de prompt",
      icon: "Icono Lucide (opcional)",
      hint: "Se guarda como inyector de prompt reutilizable en .agents/plugins.",
    },
    scope: "Ámbito",
    workspace: "Workspace",
    global: "Global",
    create: "Crear",
    creating: "Creando...",
    cancel: "Cancelar",
    desktopOnly: "La creación de assets requiere la app de escritorio Stark.",
    exists: "Ya existe un asset con ese nombre.",
  },
  en: {
    skill: {
      title: "New Skill",
      name: "Name",
      desc: "Description",
      body: "Prompt content",
      hint: "Created as .agents/skills/<slug>/SKILL.md with Eve Vercel progressive disclosure.",
    },
    agent: {
      title: "New Agent",
      name: "Name",
      desc: "Description",
      body: "Role instructions",
      hint: "The agent includes the Eve Vercel progressive skill loading protocol.",
    },
    plugin: {
      title: "New Plugin",
      name: "Name",
      desc: "Description",
      body: "Prompt template",
      icon: "Lucide icon (optional)",
      hint: "Saved as a reusable prompt injector in .agents/plugins.",
    },
    scope: "Scope",
    workspace: "Workspace",
    global: "Global",
    create: "Create",
    creating: "Creating...",
    cancel: "Cancel",
    desktopOnly: "Asset creation requires the Stark desktop app.",
    exists: "An asset with that name already exists.",
  },
};

const KIND_META = {
  skill: { icon: Sparkles, command: "skills_create" },
  agent: { icon: Bot, command: "agents_create" },
  plugin: { icon: Puzzle, command: "plugins_create" },
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  backgroundColor: "var(--colors-surface-dark)",
  border: "1px solid var(--colors-hairline)",
  color: "var(--colors-ink)",
  fontFamily: "var(--font-mono)",
};

const labelStyle = {
  fontSize: "11.5px",
  fontFamily: "var(--font-mono)",
  color: "var(--colors-body-strong)",
  display: "block",
  marginBottom: "6px",
};

export function CreateAssetModal({
  kind,
  onClose,
  onCreated,
  workspacePath,
  lang = "es",
}) {
  const t = COPY[lang] || COPY.es;
  const meta = KIND_META[kind] || KIND_META.skill;
  const KindIcon = meta.icon;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("");
  const [scope, setScope] = useState("workspace");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!kind) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const isTauri =
        typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (!isTauri) {
        setError(t.desktopOnly);
        setIsSubmitting(false);
        return;
      }
      const { invoke } = await import("@tauri-apps/api/core");
      const args = { name, description, scope, workspacePath };
      if (kind === "skill") args.content = body;
      if (kind === "agent") args.instructions = body;
      if (kind === "plugin") {
        args.promptTemplate = body;
        args.icon = icon;
      }
      const path = await invoke(meta.command, args);
      setIsSubmitting(false);
      if (onCreated) onCreated({ kind, path });
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      let msg = String(err);
      try {
        msg = err?.message || String(err);
      } catch {
        /* noop */
      }
      if (/ya existe|already exists/i.test(msg)) msg = t.exists;
      setError(msg);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="doctor-modal"
        style={{ maxWidth: "460px", padding: "24px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                padding: "8px",
                borderRadius: "8px",
                background: "var(--colors-surface-soft)",
                border: "1px solid var(--colors-hairline)",
              }}
            >
              <KindIcon
                size={18}
                strokeWidth={1.75}
                style={{ color: "var(--colors-ink)" }}
              />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--colors-ink-deep)",
              }}
            >
              {t[kind].title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--colors-muted)",
              display: "flex",
              padding: "4px",
            }}
            aria-label={t.cancel}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <p
          style={{
            margin: "0 0 18px",
            fontSize: "11.5px",
            fontFamily: "var(--font-mono)",
            color: "var(--colors-muted)",
            lineHeight: "1.5",
          }}
        >
          {t[kind].hint}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <label style={labelStyle}>{t[kind].name}</label>
            <input
              value={name}
              onInput={(e) => setName(e.target.value)}
              autoFocus
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t[kind].desc}</label>
            <input
              value={description}
              onInput={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>{t[kind].body}</label>
            <textarea
              rows={5}
              value={body}
              onInput={(e) => setBody(e.target.value)}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          {type === "plugin" && (
            <div>
              <label style={labelStyle}>{t[kind].icon}</label>
              <input
                value={icon}
                onInput={(e) => setIcon(e.target.value)}
                placeholder="Sparkles"
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>{t.scope}</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setScope("workspace")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background:
                    scope === "workspace"
                      ? "var(--colors-surface-dark-elevated)"
                      : "transparent",
                  border: `1px solid ${scope === "workspace" ? "var(--colors-hairline-strong)" : "var(--colors-hairline)"}`,
                  color:
                    scope === "workspace"
                      ? "var(--colors-ink)"
                      : "var(--colors-muted)",
                }}
              >
                <FolderDown size={13} strokeWidth={1.75} /> {t.workspace}
              </button>
              <button
                type="button"
                onClick={() => setScope("global")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "7px",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background:
                    scope === "global"
                      ? "var(--colors-surface-dark-elevated)"
                      : "transparent",
                  border: `1px solid ${scope === "global" ? "var(--colors-hairline-strong)" : "var(--colors-hairline)"}`,
                  color:
                    scope === "global"
                      ? "var(--colors-ink)"
                      : "var(--colors-muted)",
                }}
              >
                <Globe size={13} strokeWidth={1.75} /> {t.global}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--colors-error)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <AlertTriangle size={14} strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}

          <div
            style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                fontSize: "12.5px",
                fontFamily: "var(--font-mono)",
                borderRadius: "9999px",
                cursor: "pointer",
                background: "transparent",
                border: "1px solid var(--colors-hairline)",
                color: "var(--colors-muted)",
              }}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="send-btn-stark"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 20px",
                fontSize: "12.5px",
                background: "var(--colors-primary)",
                color: "var(--colors-on-primary)",
                border: "none",
                borderRadius: "9999px",
                cursor:
                  !name.trim() || isSubmitting ? "not-allowed" : "pointer",
                fontWeight: "500",
                opacity: !name.trim() || isSubmitting ? 0.6 : 1,
              }}
            >
              <Check size={14} strokeWidth={1.75} />
              {isSubmitting ? t.creating : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateRow({ onCreate, lang = "es" }) {
  const items = [
    { kind: "agent", label: lang === "es" ? "Agente" : "Agent", icon: Bot },
    { kind: "skill", label: lang === "es" ? "Skill" : "Skill", icon: Sparkles },
    {
      kind: "plugin",
      label: lang === "es" ? "Plugin" : "Plugin",
      icon: Puzzle,
    },
  ];
  return (
    <>
      <div
        style={{
          fontSize: "11px",
          color: "var(--colors-muted)",
          padding: "4px 8px",
          marginTop: "4px",
          borderTop: "1px solid var(--colors-hairline)",
        }}
      >
        {lang === "es" ? "Crear" : "Create"}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        {items.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            onClick={() => onCreate(kind)}
            title={label}
            style={{
              flex: 1,
              background: "transparent",
              border: "1px solid transparent",
              padding: "5px 6px",
              cursor: "pointer",
              color: "var(--colors-muted)",
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
            }}
          >
            <Icon size={12} strokeWidth={1.75} /> {label}
          </button>
        ))}
      </div>
    </>
  );
}
