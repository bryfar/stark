import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Link as LinkIcon, Check, Plus, RefreshCw } from 'lucide-react';

// Mirrors Open Design's Integrations page:
// Connect external systems and MCP tools; use Open Design from any IDE, script, or automation.
const INTEGRATIONS = [
  {
    id: 'ollama',
    name: 'Ollama Local LLM',
    desc: 'Runs local LLM inference under 300MB RAM. Zero cloud latency.',
    status: 'connected',
    detail: 'Active: Qwen 2.5 1.5B',
    category: 'LLM Engine',
  },
  {
    id: 'tauri',
    name: 'Tauri Desktop Runtime',
    desc: 'Sandboxed native filesystem and IPC bridge for desktop-grade artifacts.',
    status: 'connected',
    detail: 'Tauri v2 — Linux',
    category: 'Runtime',
  },
  {
    id: 'vercel',
    name: 'Vercel Deploy Pipeline',
    desc: 'Push generated HTML/CSS prototypes to a Vercel project on export.',
    status: 'disconnected',
    detail: 'Not configured',
    category: 'Deployment',
  },
  {
    id: 'github',
    name: 'GitHub Repository Sync',
    desc: 'Index, read, and write files directly from your active GitHub repo.',
    status: 'disconnected',
    detail: 'Not configured',
    category: 'Source Control',
  },
  {
    id: 'figma',
    name: 'Figma MCP Bridge',
    desc: 'Pull Figma variables and frames into your DESIGN.md brand contract.',
    status: 'disconnected',
    detail: 'Requires Figma Personal Token',
    category: 'Design Tools',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude API',
    desc: 'BYOK connection to Claude 3.5 Sonnet for advanced iteration prompts.',
    status: 'disconnected',
    detail: 'API key not set',
    category: 'LLM Engine',
  },
];

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const toggleConnect = (id) => {
    setIntegrations(prev => prev.map(i =>
      i.id === id ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' } : i
    ));
  };

  const connected = integrations.filter(i => i.status === 'connected');
  const disconnected = integrations.filter(i => i.status !== 'connected');

  const IntegrationCard = ({ integ }) => (
    <div style={{ background: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '10px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--colors-ink-deep)' }}>{integ.name}</span>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '2px 7px', background: 'var(--colors-surface-dark)', borderRadius: '9999px', border: '1px solid var(--colors-hairline)', color: 'var(--colors-body)' }}>
            {integ.category}
          </span>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: '12.5px', color: 'var(--colors-body)', lineHeight: '1.5' }}>{integ.desc}</p>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: integ.status === 'connected' ? 'var(--colors-body-strong, var(--colors-ink))' : 'var(--colors-muted)' }}>
          {integ.detail}
        </span>
      </div>
      <button
        onClick={() => toggleConnect(integ.id)}
        style={{
          padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)',
          border: '1px solid var(--colors-hairline)', cursor: 'pointer', fontWeight: '600',
          background: integ.status === 'connected' ? 'var(--colors-surface-dark)' : 'var(--colors-ink)',
          color: integ.status === 'connected' ? 'var(--colors-body)' : 'var(--colors-canvas)',
          display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
          flexShrink: 0, transition: 'all 120ms'
        }}
      >
        {integ.status === 'connected'
          ? <><Check size={11} strokeWidth={2} /> Connected</>
          : <><Plus size={11} strokeWidth={2} /> Connect</>
        }
      </button>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--colors-canvas)', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '700', color: 'var(--colors-ink-deep)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LinkIcon size={18} strokeWidth={1.75} />
          Integrations
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--colors-body)', fontFamily: 'var(--font-mono)' }}>
          Connect external systems and MCP tools. Use Stark from any IDE, script, or automation.
        </p>
      </div>

      {/* Connected */}
      {connected.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--colors-muted)', marginBottom: '10px' }}>
            Connected — {connected.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {connected.map(i => <IntegrationCard key={i.id} integ={i} />)}
          </div>
        </div>
      )}

      {/* Available */}
      <div>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--colors-muted)', marginBottom: '10px' }}>
          Available — {disconnected.length}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {disconnected.map(i => <IntegrationCard key={i.id} integ={i} />)}
        </div>
      </div>
    </div>
  );
}
