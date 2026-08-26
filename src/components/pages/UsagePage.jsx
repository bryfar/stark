import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import { BarChart3, RefreshCw, Trash2, Database } from 'lucide-react';

export function UsagePage() {
  const [records, setRecords] = useState([]);
  const [byModel, setByModel] = useState([]);
  const [byOp, setByOp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('model');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recs, modelData, opData] = await Promise.all([
        invoke('usage_records'),
        invoke('usage_by_model'),
        invoke('usage_by_op'),
      ]);
      setRecords(recs);
      setByModel(modelData);
      setByOp(opData);
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalTokens = byModel.reduce((s, m) => s + m.total_tokens, 0);
  const totalRequests = byModel.reduce((s, m) => s + m.request_count, 0);

  const maxTokens = Math.max(...byModel.map(m => m.total_tokens), 1);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <BarChart3 size={22} strokeWidth={1.75} />
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>
          Uso de Tokens
        </h1>
        <button
          onClick={load}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            background: 'var(--colors-surface-dark)',
            border: '1px solid var(--colors-hairline)',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: loading ? 'wait' : 'pointer',
            color: 'var(--colors-ink)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <RefreshCw size={12} strokeWidth={1.75} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--colors-surface-dark)', border: '1px solid var(--colors-hairline)', borderRadius: '6px', marginBottom: '16px', fontSize: '11px', color: 'var(--colors-muted)' }}>
          Error: {error}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Total Tokens" value={totalTokens.toLocaleString()} />
        <StatCard label="Peticiones" value={totalRequests.toLocaleString()} />
        <StatCard label="Modelos" value={byModel.length.toString()} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '4px' }}>
        {['model', 'op'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? 'var(--colors-primary, #fff)' : 'transparent',
              color: activeTab === tab ? 'var(--colors-canvas, #1e1e1e)' : 'var(--colors-muted)',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            {tab === 'model' ? 'Por Modelo' : 'Por Operacion'}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      {activeTab === 'model' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {byModel.map(m => (
            <BarRow key={m.key} label={m.key} value={m.total_tokens} max={maxTokens} count={m.request_count} />
          ))}
          {byModel.length === 0 && !loading && (
            <EmptyState />
          )}
        </div>
      )}

      {activeTab === 'op' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {byOp.map(o => (
            <BarRow key={o.key} label={o.key} value={o.total_tokens} max={maxTokens} count={o.request_count} />
          ))}
          {byOp.length === 0 && !loading && (
            <EmptyState />
          )}
        </div>
      )}

      {/* Recent records */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>
          Registros Recientes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {records.slice(-20).reverse().map((r, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 80px 80px 80px',
                gap: '8px',
                padding: '8px 10px',
                background: 'var(--colors-surface-dark)',
                border: '1px solid var(--colors-hairline)',
                borderRadius: '4px',
                fontSize: '10.5px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--colors-body)',
                alignItems: 'center',
              }}
            >
              <span style={{ color: 'var(--colors-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ts}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.model}</span>
              <span style={{ textAlign: 'right' }}>{r.prompt_tokens.toLocaleString()}</span>
              <span style={{ textAlign: 'right' }}>{r.completion_tokens.toLocaleString()}</span>
              <span style={{ textAlign: 'right', fontWeight: 600 }}>{r.total_tokens.toLocaleString()}</span>
            </div>
          ))}
          {records.length === 0 && !loading && (
            <EmptyState />
          )}
        </div>
        {records.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px 80px 80px', gap: '8px', padding: '4px 10px', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>
            <span>Timestamp</span>
            <span>Modelo</span>
            <span style={{ textAlign: 'right' }}>Prompt</span>
            <span style={{ textAlign: 'right' }}>Compl.</span>
            <span style={{ textAlign: 'right' }}>Total</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{
      padding: '16px',
      background: 'var(--colors-surface-dark)',
      border: '1px solid var(--colors-hairline)',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>{value}</div>
      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function BarRow({ label, value, max, count }) {
  const pct = Math.max((value / max) * 100, 2);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '160px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: '20px', background: 'var(--colors-surface-dark)', border: '1px solid var(--colors-hairline)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--colors-primary, #fff)', borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <div style={{ width: '80px', textAlign: 'right', fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>
        {value.toLocaleString()} ({count})
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--colors-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
      <Database size={20} strokeWidth={1.75} style={{ marginBottom: '8px', opacity: 0.5 }} />
      <div>No hay registros de uso aun.</div>
      <div style={{ marginTop: '4px', opacity: 0.6 }}>Los registros se crean automaticamente al usar el agente.</div>
    </div>
  );
}

export default UsagePage;
