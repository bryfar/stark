import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Layers, Plus, RefreshCw, ChevronRight } from 'lucide-react';

// Mirrors Open Design's Design System page:
// Browse and edit the DESIGN.md brand contract that shapes every generated artifact.
export function DesignSystemPage({ onClose }) {
  const [activeSection, setActiveSection] = useState('colors');

  const sections = [
    { id: 'colors', label: 'Color Tokens' },
    { id: 'typography', label: 'Typography' },
    { id: 'spacing', label: 'Spacing Scale' },
    { id: 'radius', label: 'Border Radius' },
    { id: 'shadows', label: 'Elevation' },
    { id: 'motion', label: 'Motion' },
  ];

  const colorTokens = [
    { name: '--colors-canvas',            value: '#0e0e0e', desc: 'App background' },
    { name: '--colors-surface-soft',      value: '#111111', desc: 'Sidebar surface' },
    { name: '--colors-surface-dark',      value: '#161616', desc: 'Input & panel bg' },
    { name: '--colors-surface-card',      value: '#1c1c1c', desc: 'Card background' },
    { name: '--colors-hairline',          value: '#252525', desc: 'Subtle divider' },
    { name: '--colors-ink',               value: '#e4e4e4', desc: 'Primary text' },
    { name: '--colors-ink-deep',          value: '#ffffff', desc: 'Emphasized text' },
    { name: '--colors-body',              value: '#a0a0a0', desc: 'Body copy' },
    { name: '--colors-muted',             value: '#555555', desc: 'Placeholder / muted' },
  ];

  const typographyTokens = [
    { name: '--font-sans',  value: 'Inter, system-ui, sans-serif' },
    { name: '--font-mono',  value: '"Berkeley Mono", "Fira Code", monospace' },
    { name: '--text-xs',    value: '11px / 1.4' },
    { name: '--text-sm',    value: '13px / 1.5' },
    { name: '--text-base',  value: '14px / 1.6' },
    { name: '--text-lg',    value: '16px / 1.5' },
    { name: '--text-xl',    value: '20px / 1.3' },
  ];

  const spacingTokens = [
    '4px', '8px', '12px', '16px', '20px', '24px', '32px', '48px', '64px'
  ];

  const radiusTokens = [
    { name: '--radius-sm',   value: '4px' },
    { name: '--radius-md',   value: '6px' },
    { name: '--radius-lg',   value: '8px' },
    { name: '--radius-xl',   value: '12px' },
    { name: '--radius-pill', value: '9999px' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', background: 'var(--colors-canvas)', overflow: 'hidden' }}>

      {/* Left rail — section list */}
      <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--colors-hairline)', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ padding: '0 16px 16px', fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--colors-muted)' }}>
          Design System
        </div>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              width: '100%', padding: '7px 16px', border: 'none', textAlign: 'left',
              background: activeSection === s.id ? 'var(--colors-surface-card)' : 'transparent',
              color: activeSection === s.id ? 'var(--colors-ink-deep)' : 'var(--colors-body)',
              fontFamily: 'var(--font-mono)', fontSize: '12.5px', cursor: 'pointer',
              fontWeight: activeSection === s.id ? '600' : '400',
              borderLeft: activeSection === s.id ? '2px solid var(--colors-ink)' : '2px solid transparent',
              transition: 'all 100ms'
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {activeSection === 'colors' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '700', color: 'var(--colors-ink-deep)' }}>Color Tokens</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--colors-body)', fontFamily: 'var(--font-mono)' }}>
                Semantic color contract from DESIGN.md — applied to every generated artifact.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {colorTokens.map(tok => (
                <div key={tok.name} style={{ background: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '8px', padding: '16px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: tok.value, flexShrink: 0, border: '1px solid var(--colors-hairline)' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--colors-muted)', marginBottom: '3px' }}>{tok.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--colors-ink)', fontWeight: '600' }}>{tok.value}</div>
                    <div style={{ fontSize: '12px', color: 'var(--colors-body)', marginTop: '2px' }}>{tok.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'typography' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: 'var(--colors-ink-deep)' }}>Typography</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {typographyTokens.map(tok => (
                <div key={tok.name} style={{ background: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '8px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--colors-muted)' }}>{tok.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--colors-ink)', fontWeight: '600' }}>{tok.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'spacing' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: 'var(--colors-ink-deep)' }}>Spacing Scale</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {spacingTokens.map(s => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'var(--colors-ink)', borderRadius: '2px', width: s, height: s, minWidth: '4px', minHeight: '4px' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--colors-muted)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'radius' && (
          <div>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', color: 'var(--colors-ink-deep)' }}>Border Radius</h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {radiusTokens.map(tok => (
                <div key={tok.name} style={{ background: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', padding: '24px', borderRadius: tok.value, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--colors-muted)' }}>{tok.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--colors-ink)', fontWeight: '600' }}>{tok.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeSection === 'shadows' || activeSection === 'motion') && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--colors-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            Coming soon — {activeSection} tokens.
          </div>
        )}
      </div>
    </div>
  );
}
