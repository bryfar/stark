import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { Logo } from "./Logo";
import {
  Home,
  SwatchBook,
  Plug,
  FolderOpen,
  Puzzle,
  MessageSquare,
  Code,
  Palette,
  Plus,
  PanelLeft,
  X,
  Pin,
  PinOff,
  Clock,
  Settings,
  Rocket,
  Server,
  Mic,
  BarChart3,
  Package,
} from "lucide-react";
import { translations } from "../i18n";

export function Sidebar({
  currentMode,
  setMode,
  isMaximized,
  setIsMaximized,
  activePage,
  setActivePage,
  onOpenSettings,
  onOpenGettingStarted,
  onOpenProviderManager,
  onOpenVoiceAssistant,
  conversations = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  lang = "es",
  chatMessages = {},
}) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const overlayRef = useRef(null);

  const t = translations[lang]
    ? translations[lang].sidebar
    : translations.es.sidebar;

  const modes = [
    {
      id: "chat",
      label: t.chat,
      icon: <MessageSquare size={16} strokeWidth={1.75} />,
      badge: "Fast",
    },
    {
      id: "code",
      label: t.code,
      icon: <Code size={16} strokeWidth={1.75} />,
      badge: "Workspace",
    },
    {
      id: "design",
      label: t.design,
      icon: <Palette size={16} strokeWidth={1.75} />,
      badge: "Live Canvas",
    },
  ];

  const pages = [
    { id: "home", icon: <Home size={18} strokeWidth={1.75} />, label: "Home" },
    {
      id: "ds",
      icon: <SwatchBook size={18} strokeWidth={1.75} />,
      label: "Design System",
    },
    {
      id: "plugin",
      icon: <Plug size={18} strokeWidth={1.75} />,
      label: "Plugin Hub",
    },
    {
      id: "projects",
      icon: <FolderOpen size={18} strokeWidth={1.75} />,
      label: "Projects",
    },
    {
      id: "integrations",
      icon: <Puzzle size={18} strokeWidth={1.75} />,
      label: "Integrations",
    },
    {
      id: "usage",
      icon: <BarChart3 size={18} strokeWidth={1.75} />,
      label: "Uso de Tokens",
    },
    {
      id: "skills",
      icon: <Package size={18} strokeWidth={1.75} />,
      label: "Skills",
    },
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        !isPinned &&
        isOverlayOpen &&
        overlayRef.current &&
        !overlayRef.current.contains(e.target)
      ) {
        setIsOverlayOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape" && isOverlayOpen && !isPinned) {
        setIsOverlayOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOverlayOpen, isPinned]);

  const handleRailHover = () => {
    if (!isMaximized && !isPinned) setIsOverlayOpen(true);
  };

  const handleRailClick = () => {
    if (!isMaximized) {
      setIsPinned(!isPinned);
      setIsOverlayOpen(true);
    }
  };

  const handleToggleMaximize = () => {
    if (setIsMaximized) {
      setIsMaximized(!isMaximized);
    }
  };

  return (
    <div
      style={{ display: "contents" }}
      onMouseLeave={() => {
        if (!isPinned) setIsOverlayOpen(false);
      }}
    >
      <aside
        className="app-sidebar-compact"
        onMouseEnter={handleRailHover}
        onClick={handleRailClick}
      >
        <button
          className="compact-rail-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleMaximize();
          }}
          title="Expand Sidebar"
        >
          <PanelLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="compact-rail-icons" style={{ flex: 1 }}>
          {pages.map((p) => (
            <button
              key={p.id}
              className={`compact-icon-btn ${activePage === p.id ? "active" : ""}`}
              title={p.label}
              onClick={(e) => {
                e.stopPropagation();
                setActivePage(p.id);
              }}
            >
              {p.icon}
            </button>
          ))}
        </div>

        <button
          className="compact-icon-btn"
          title="Asistente de Voz"
          onClick={(e) => {
            e.stopPropagation();
            onOpenVoiceAssistant && onOpenVoiceAssistant();
          }}
        >
          <Mic size={18} strokeWidth={1.75} />
        </button>
        <button
          className="compact-icon-btn"
          title="Configuración"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings && onOpenSettings();
          }}
        >
          <Settings size={18} strokeWidth={1.75} />
        </button>
        <button
          className="compact-icon-btn"
          title="Getting Started"
          onClick={(e) => {
            e.stopPropagation();
            onOpenGettingStarted && onOpenGettingStarted();
          }}
        >
          <Rocket size={18} strokeWidth={1.75} />
        </button>
      </aside>

      {(isOverlayOpen || isPinned || isMaximized) && (
        <div className="sidebar-overlay-panel" ref={overlayRef}>
          <div className="overlay-header">
            <Logo size={24} />
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                fontFamily: "var(--font-mono)",
              }}
            >
              Stark
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
              <button
                className="overlay-icon-btn"
                onClick={() => setIsPinned(!isPinned)}
                title={isPinned ? "Unpin" : "Pin"}
              >
                {isPinned ? (
                  <PinOff size={16} strokeWidth={1.75} />
                ) : (
                  <Pin size={16} strokeWidth={1.75} />
                )}
              </button>
              <button
                className="overlay-icon-btn"
                onClick={() => {
                  setIsOverlayOpen(false);
                  setIsPinned(false);
                  if (setIsMaximized) setIsMaximized(false);
                }}
                title="Close"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="overlay-modes">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`sidebar-mode-btn ${currentMode === m.id ? "active" : ""}`}
                onClick={() => setMode && setMode(m.id)}
              >
                <span style={{ display: "flex" }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <button
            className="new-chat-btn"
            onClick={() => onNewChat && onNewChat()}
          >
            <Plus size={16} strokeWidth={1.75} />
            <span>{t.newChat}</span>
          </button>

          <div className="overlay-section">
            <div className="section-title">{t.pages}</div>
            {pages.map((p) => (
              <button
                key={p.id}
                className={`sidebar-option-btn ${activePage === p.id ? "active" : ""}`}
                onClick={() => setActivePage(p.id)}
              >
                <span
                  style={{
                    display: "flex",
                    opacity: activePage === p.id ? 1 : 0.7,
                  }}
                >
                  {p.icon}
                </span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div
            className="overlay-section"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div className="section-title">{t.history}</div>
            <div style={{ padding: "0 12px 10px 12px" }}>
              <input
                type="text"
                placeholder={
                  lang === "es" ? "Buscar chats..." : "Search chats..."
                }
                value={searchQuery}
                onInput={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "12px",
                  background: "var(--colors-surface-dark-soft)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "6px",
                  color: "var(--colors-ink)",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(() => {
                const filtered = conversations.filter((c) => {
                  const q = searchQuery.toLowerCase().trim();
                  if (!q) return true;
                  const matchesTitle = (c.title || "")
                    .toLowerCase()
                    .includes(q);
                  const msgs = chatMessages[c.id] || [];
                  const matchesMessage = msgs.some((m) =>
                    (m.text || "").toLowerCase().includes(q)
                  );
                  return matchesTitle || matchesMessage;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="history-item">
                      <Clock size={14} strokeWidth={1.75} />
                      <span>{t.olderChats}</span>
                    </div>
                  );
                }

                return filtered.map((c) => (
                  <div
                    key={c.id}
                    className={`history-item ${activeChatId === c.id ? "active" : ""}`}
                    onClick={() => onSelectChat && onSelectChat(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <MessageSquare size={14} strokeWidth={1.75} />
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title || "Nueva conversación"}
                    </span>
                    <button
                      className="overlay-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat && onDeleteChat(c.id);
                      }}
                      title="Eliminar"
                    >
                      <X size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>

          <div
            className="sidebar-footer"
            style={{
              marginTop: "auto",
              paddingTop: "12px",
              borderTop: "1px solid var(--colors-hairline)",
            }}
          >
            <button
              className="sidebar-option-btn"
              onClick={() => onOpenProviderManager && onOpenProviderManager()}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Server size={16} strokeWidth={1.75} />
              <span>Proveedores</span>
            </button>
            <button
              className="sidebar-option-btn"
              onClick={() => onOpenVoiceAssistant && onOpenVoiceAssistant()}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Mic size={16} strokeWidth={1.75} />
              <span>Asistente de Voz</span>
            </button>
            <button
              className="sidebar-option-btn"
              onClick={() => onOpenSettings && onOpenSettings()}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Settings size={16} strokeWidth={1.75} />
              <span>{t.settings}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
