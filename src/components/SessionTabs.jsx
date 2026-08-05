import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { X, Plus } from 'lucide-react';

export function SessionTabs({ sessions, activeSessionId, onSelect, onNew, onClose }) {
  useEffect(() => {
    if (sessions && sessions.length === 0) {
      onNew();
    }
  }, [sessions, onNew]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      background: 'var(--colors-surface-soft)', 
      borderBottom: '1px solid var(--colors-hairline)',
      overflowX: 'auto',
      flexShrink: 0
    }}>
      {(sessions || []).map(session => {
        const isActive = session.id === activeSessionId;
        return (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              borderBottom: isActive ? '2px solid var(--colors-primary)' : '2px solid transparent',
              color: isActive ? 'var(--colors-ink)' : 'var(--colors-muted)',
              background: isActive ? 'var(--colors-surface-dark)' : 'transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.background = 'var(--colors-surface-card-border)';
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <span>{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(session.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--colors-hairline-strong)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
      <button
        onClick={onNew}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          color: 'var(--colors-muted)',
          cursor: 'pointer',
          padding: '8px 16px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--colors-surface-card-border)';
          e.currentTarget.style.color = 'var(--colors-ink)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--colors-muted)';
        }}
      >
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
