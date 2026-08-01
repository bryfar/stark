import { h } from 'preact';

export function Sidebar({ currentMode, setMode }) {
  const modes = [
    { id: 'chat', label: 'Chat General', icon: '💬', badge: 'Fast' },
    { id: 'code', label: 'Modo Code', icon: '⚡', badge: 'Workspace' },
    { id: 'design', label: 'Modo Design', icon: '🎨', badge: 'Live Canvas' }
  ];

  return (
    <aside className="app-sidebar">
      <div>
        <div className="brand-header">
          <div className="brand-icon">C</div>
          <div>
            <h1 className="brand-title">Crafter</h1>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Linux Lightweight Desktop</span>
          </div>
        </div>

        <nav className="mode-selector">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`mode-btn ${currentMode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
              <span className="mode-badge">{m.badge}</span>
            </button>
          ))}
        </nav>
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
