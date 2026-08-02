import { h } from 'preact';
import { PanelLeftClose, PanelLeftOpen, Stethoscope, MessageSquare, Code2, Layout, Sun, Moon, Minus, Square, X } from 'lucide-react';

export function HeaderBar({ currentMode, setMode, onOpenDoctor, isSidebarOpen, onToggleSidebar, theme, onToggleTheme }) {
  const modes = [
    { id: 'chat', label: 'Chat General', icon: MessageSquare },
    { id: 'code', label: 'Modo Code', icon: Code2 },
    { id: 'design', label: 'Modo Design', icon: Layout }
  ];

  const windowAction = async (action) => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      if (action === 'minimize') await win.minimize();
      else if (action === 'maximize') await win.toggleMaximize();
      else if (action === 'close') await win.close();
    } catch (e) {
      // Browser preview: no Tauri window API
    }
  };

  return (
    <header className="header-bar" data-tauri-drag-region>
      {/* Sidebar Toggle & Brand Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? 'Ocultar Sidebar' : 'Mostrar Sidebar'}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            padding: '5px 10px',
            background: 'var(--colors-surface-dark)',
            color: 'var(--colors-body-strong)',
            borderRadius: '4px',
            border: '1px solid var(--colors-hairline)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {isSidebarOpen ? <PanelLeftClose size={14} strokeWidth={1.75} /> : <PanelLeftOpen size={14} strokeWidth={1.75} />}
          <span>Sidebar</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="header-brand" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '700', color: 'var(--colors-ink)' }}>
            Stark Workspace
          </span>
        </div>
      </div>

      {/* Centered Workspace Mode Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          const IconComp = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 18px',
                borderRadius: '4px',
                border: isActive ? '1px solid var(--colors-hairline-strong)' : '1px solid transparent',
                background: isActive ? 'var(--colors-surface-card)' : 'transparent',
                color: isActive ? 'var(--colors-ink-deep)' : 'var(--colors-body)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '400',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <IconComp size={14} strokeWidth={1.75} style={{ color: isActive ? 'var(--colors-ink-deep)' : 'var(--colors-muted)' }} />
              <span className="header-mode-label">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Theme Switcher & System Diagnostic Trigger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onToggleTheme}
          title="Alternar Tema (Dark Monocromo ↔ Open Design Light)"
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            padding: '5px 10px',
            background: 'var(--colors-surface-dark)',
            color: 'var(--colors-body-strong)',
            borderRadius: '4px',
            border: '1px solid var(--colors-hairline)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {theme === 'light' ? <Moon size={14} strokeWidth={1.75} /> : <Sun size={14} strokeWidth={1.75} />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>

        <button
          onClick={onOpenDoctor}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            padding: '5px 12px',
            background: 'var(--colors-surface-dark)',
            color: 'var(--colors-body-strong)',
            borderRadius: '4px',
            border: '1px solid var(--colors-hairline)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Stethoscope size={14} strokeWidth={1.75} />
          <span>Stark Doctor</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '8px', borderLeft: '1px solid var(--colors-hairline)', paddingLeft: '8px' }}>
          <button
            onClick={() => windowAction('minimize')}
            aria-label="Minimizar"
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer',
              color: 'var(--colors-body-strong)'
            }}
          >
            <Minus size={14} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => windowAction('maximize')}
            aria-label="Maximizar"
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer',
              color: 'var(--colors-body-strong)'
            }}
          >
            <Square size={12} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => windowAction('close')}
            aria-label="Cerrar"
            style={{
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer',
              color: 'var(--colors-body-strong)'
            }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
