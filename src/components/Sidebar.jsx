import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { 
  Home, SwatchBook, Plug, FolderOpen, Puzzle, 
  MessageSquare, Code, Palette, Plus, PanelLeft, X, Pin, PinOff, Clock
} from 'lucide-react';

export function Sidebar({ currentMode, setMode, isMaximized, setIsMaximized, activePage, setActivePage }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const overlayRef = useRef(null);

  const modes = [
    { id: 'chat', label: 'Chat General', icon: <MessageSquare size={16} strokeWidth={1.75} />, badge: 'Fast' },
    { id: 'code', label: 'Modo Code', icon: <Code size={16} strokeWidth={1.75} />, badge: 'Workspace' },
    { id: 'design', label: 'Modo Design', icon: <Palette size={16} strokeWidth={1.75} />, badge: 'Live Canvas' }
  ];

  const pages = [
    { id: 'home', icon: <Home size={18} strokeWidth={1.75} />, label: 'Home' },
    { id: 'design-system', icon: <SwatchBook size={18} strokeWidth={1.75} />, label: 'Design System' },
    { id: 'plugin-hub', icon: <Plug size={18} strokeWidth={1.75} />, label: 'Plugin Hub' },
    { id: 'projects', icon: <FolderOpen size={18} strokeWidth={1.75} />, label: 'Projects' },
    { id: 'integrations', icon: <Puzzle size={18} strokeWidth={1.75} />, label: 'Integrations' }
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (!isPinned && isOverlayOpen && overlayRef.current && !overlayRef.current.contains(e.target)) {
        setIsOverlayOpen(false);
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape' && isOverlayOpen && !isPinned) {
        setIsOverlayOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
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
    setIsMaximized(!isMaximized);
  };

  if (isMaximized) {
    return (
      <aside className="app-sidebar">
        <div>
          <div className="brand-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="brand-icon">C</div>
              <div>
                <h1 className="brand-title">Crafter</h1>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Linux Lightweight Desktop</span>
              </div>
            </div>
            <button onClick={handleToggleMaximize} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <PanelLeft size={18} strokeWidth={1.75} />
            </button>
          </div>

          <nav className="mode-selector">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`mode-btn ${currentMode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span style={{display:'flex'}}>{m.icon}</span>
                <span>{m.label}</span>
                <span className="mode-badge">{m.badge}</span>
              </button>
            ))}
          </nav>
          
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>Pages</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pages.map((p) => (
                <button
                  key={p.id}
                  className={`mode-btn ${activePage === p.id ? 'active' : ''}`}
                  onClick={() => setActivePage(p.id)}
                  style={{ padding: '8px 12px' }}
                >
                  <span style={{display:'flex', opacity: 0.7}}>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-indicator">
              <span className="dot"></span>
              <span>Ollama / Hybrid LLM</span>
            </div>
            <span>RAM &lt; 300MB</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside 
        className="app-sidebar-compact" 
        onMouseEnter={handleRailHover}
        onClick={handleRailClick}
      >
        <button className="compact-rail-btn" onClick={(e) => { e.stopPropagation(); handleToggleMaximize(); }} title="Expand Sidebar">
          <PanelLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="compact-rail-icons">
          {pages.map(p => (
            <button 
              key={p.id} 
              className={`compact-icon-btn ${activePage === p.id ? 'active' : ''}`}
              title={p.label}
              onClick={(e) => { e.stopPropagation(); setActivePage(p.id); }}
            >
              {p.icon}
            </button>
          ))}
        </div>
      </aside>

      {(isOverlayOpen || isPinned) && (
        <div className="sidebar-overlay-panel" ref={overlayRef}>
          <div className="overlay-header">
            <div className="brand-icon" style={{ width: 24, height: 24, fontSize: 12 }}>C</div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Crafter</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <button className="overlay-icon-btn" onClick={() => setIsPinned(!isPinned)} title={isPinned ? "Unpin" : "Pin"}>
                {isPinned ? <PinOff size={16} strokeWidth={1.75} /> : <Pin size={16} strokeWidth={1.75} />}
              </button>
              <button className="overlay-icon-btn" onClick={() => { setIsOverlayOpen(false); setIsPinned(false); }} title="Close">
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="overlay-modes">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`mode-btn ${currentMode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
                style={{ padding: '8px 10px' }}
              >
                <span style={{display:'flex'}}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <button className="new-chat-btn">
            <Plus size={16} strokeWidth={1.75} />
            <span>New Chat</span>
          </button>

          <div className="overlay-section">
            <div className="section-title">Pages</div>
            {pages.map(p => (
              <button 
                key={p.id}
                className={`page-btn ${activePage === p.id ? 'active' : ''}`}
                onClick={() => setActivePage(p.id)}
              >
                <span style={{display:'flex', opacity: 0.7}}>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="overlay-section" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="section-title">History</div>
            <div className="history-item">
              <MessageSquare size={14} strokeWidth={1.75} />
              <span>Update layout components</span>
            </div>
            <div className="history-item">
              <MessageSquare size={14} strokeWidth={1.75} />
              <span>Fix navigation bug</span>
            </div>
            <div className="history-item">
              <Clock size={14} strokeWidth={1.75} />
              <span>Older chats...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
