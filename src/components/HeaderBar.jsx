import { h } from 'preact';
import { MessageSquare, Code2, Layout, Minus, Square, X } from 'lucide-react';
import { translations } from '../i18n';

export function HeaderBar({ currentMode, setMode, isSidebarOpen, onToggleSidebar, lang = 'es' }) {
  const t = translations[lang] ? translations[lang].header : translations.es.header;
  const tSidebar = translations[lang] ? translations[lang].sidebar : translations.es.sidebar;

  const modes = [
    { id: 'chat', label: tSidebar.chat, icon: MessageSquare },
    { id: 'code', label: tSidebar.code, icon: Code2 },
    { id: 'design', label: tSidebar.design, icon: Layout }
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        {/* Brand text removed */}
      </div>

      {/* Centered Workspace Mode Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifySelf: 'flex-end', justifyContent: 'flex-end' }}>

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
