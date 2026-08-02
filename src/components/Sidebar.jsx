import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Home, Layers, Puzzle, Link as LinkIcon, Stethoscope, Activity, PanelLeftClose, MessageSquareCode, Plus, FileCode } from 'lucide-react';
import { Logo } from './Logo';

export function Sidebar({
  isSidebarOpen,
  onToggleSidebar,
  currentMode,
  onOpenDoctor,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  activeFile,
  setActiveFile,
  activePage,
  setActivePage,
  fileTree = [],
  isMaximized
}) {
  const pages = [
    { id: 'home',         icon: Home,     label: 'Home',          title: 'Home — Nuevo Chat General' },
    { id: 'ds',           icon: Layers,   label: 'Design System', title: 'Design System' },
    { id: 'plugin',       icon: Puzzle,   label: 'Plugin Hub',    title: 'Plugin Hub' },
    { id: 'integrations', icon: LinkIcon, label: 'Integrations',  title: 'Integrations' }
  ];

  return (
    <aside className={`app-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Level 1: Brand Header */}
        <div className="brand-header" style={{ flexShrink: 0, justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={36} />
            <div>
              <h1 className="brand-title">Stark</h1>
              <span style={{ fontSize: '10px', color: 'var(--colors-muted)', fontFamily: 'var(--font-mono)' }}>
                Desktop for Linux
              </span>
            </div>
          </div>

          <button
            onClick={onToggleSidebar}
            title="Ocultar Sidebar"
            style={{ background: 'transparent', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px' }}
          >
            <PanelLeftClose size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Level 2: Global Pages — Icon + Label rows (always visible) */}
        <div style={{ flexShrink: 0, marginBottom: '4px', paddingBottom: '8px', borderBottom: '1px solid var(--colors-hairline)' }}>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 10px', marginBottom: '4px' }}>
            Pages
          </div>
          {pages.map((p) => {
            const IconComp = p.icon;
            const isActive = activePage === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActivePage && setActivePage(p.id);
                  if (p.id === 'home') onNewChat && onNewChat();
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  marginBottom: '1px',
                  borderRadius: '5px',
                  border: 'none',
                  background: isActive ? 'var(--colors-surface-card)' : 'transparent',
                  color: isActive ? 'var(--colors-ink-deep)' : 'var(--colors-body)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? '500' : '400',
                  textAlign: 'left',
                  transition: 'background 120ms ease, color 120ms ease',
                  position: 'relative'
                }}
              >
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '4px',
                    bottom: '4px',
                    width: '2px',
                    borderRadius: '0 2px 2px 0',
                    background: 'var(--colors-ink)'
                  }} />
                )}
                <IconComp size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Level 3: Dynamic Lower Container */}
        {currentMode === 'chat' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <button className="new-chat-btn" onClick={onNewChat}>
              <Plus size={15} strokeWidth={1.75} />
              <span>Nuevo Chat</span>
            </button>
            <div className="history-section">
              <div className="history-title">Historial</div>
              {conversations && conversations.map((c) => (
                <div
                  key={c.id}
                  className={`history-item ${activeChatId === c.id ? 'active' : ''}`}
                  onClick={() => onSelectChat(c.id)}
                >
                  <MessageSquareCode size={13} strokeWidth={1.75} style={{ color: 'var(--colors-muted)' }} />
                  <span>{c.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentMode === 'code' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--colors-hairline)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '700', color: 'var(--colors-ink)' }}>Files</span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>{fileTree.length}</span>
            </div>
            {fileTree.length === 0 && (
              <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)', textAlign: 'center', padding: '24px 12px', lineHeight: '1.6' }}>
                Sin archivos indexados.<br />Abre un workspace para listarlos.
              </div>
            )}
            {fileTree.map((f) => {
              const isActive = activeFile === f.name;
              return (
                <div
                  key={f.name}
                  onClick={() => setActiveFile && setActiveFile(f.name)}
                  style={{
                    padding: '7px 10px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '12.5px',
                    color: isActive ? 'var(--colors-ink-deep)' : 'var(--colors-body)',
                    background: isActive ? 'var(--colors-surface-card)' : 'transparent',
                    border: isActive ? '1px solid var(--colors-hairline)' : '1px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <FileCode size={13} strokeWidth={1.75} style={{ color: isActive ? 'var(--colors-ink-deep)' : 'var(--colors-muted)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* In Design mode, sidebar lower is empty — chat lives in the side panel next to canvas */}
        {currentMode === 'design' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)', textAlign: 'center', lineHeight: '1.5' }}>
              Panel de diseño<br />activo al costado
            </span>
          </div>
        )}
      </div>

      {/* Persistent Footer */}
      <div className="sidebar-footer" style={{ flexShrink: 0, marginTop: 'auto' }}>
        <button className="doctor-btn-sidebar" onClick={onOpenDoctor}>
          <Stethoscope size={14} strokeWidth={1.75} />
          <span>Stark Doctor</span>
        </button>
        <div className="system-status">
          <div className="status-indicator">
            <Activity size={12} strokeWidth={1.75} style={{ color: 'var(--colors-body-strong)' }} />
            <span>Ollama / Local LLM</span>
          </div>
          <span>RAM &lt; 300MB</span>
        </div>
      </div>
    </aside>
  );
}
