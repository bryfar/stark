import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export function HeaderBar({
  selectedModel,
  setSelectedModel,
  selectedProvider,
  setSelectedProvider,
  agentMode,
  setAgentMode,
  reasoning,
  setReasoning,
}) {
  const [hardwareTier, setHardwareTier] = useState('Detectando...');

  useEffect(() => {
    async function loadHardware() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const info = await invoke('hardware_detect');
        setHardwareTier(`${info.tier} (${Math.round(info.total_ram_mb / 1024)}GB RAM)`);
      } catch (e) {
        setHardwareTier('Standard (16GB RAM)');
      }
    }
    loadHardware();
  }, []);

  return (
    <header className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Proveedor:</span>
        <select
          className="model-selector-select"
          value={selectedProvider}
          onChange={(e) => {
            const prov = e.target.value;
            setSelectedProvider(prov);
            if (prov === 'ollama') setSelectedModel('qwen2.5:1.5b');
            else if (prov === 'openai') setSelectedModel('gpt-4o');
            else if (prov === 'anthropic') setSelectedModel('claude-3-5-sonnet-20241022');
            else if (prov === 'gemini') setSelectedModel('gemini-1.5-flash');
          }}
        >
          <option value="ollama">Ollama (Local http://localhost:11434)</option>
          <option value="openai">OpenAI (Cloud API)</option>
          <option value="anthropic">Anthropic (Claude API)</option>
          <option value="gemini">Google Gemini (API)</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Modelo:</span>
        <select
          className="model-selector-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {selectedProvider === 'ollama' && (
            <>
              <option value="qwen2.5:1.5b">Qwen 2.5 1.5B (Lite Q4)</option>
              <option value="llama3.2:3b">Llama 3.2 3B (Basic Q4)</option>
              <option value="phi3:mini">Phi-3 Mini (3.8B)</option>
              <option value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</option>
            </>
          )}
          {selectedProvider === 'openai' && (
            <>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="o1-mini">o1-mini (Reasoning)</option>
            </>
          )}
          {selectedProvider === 'anthropic' && (
            <>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
            </>
          )}
          {selectedProvider === 'gemini' && (
            <>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </>
          )}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        <span style={{ fontSize: '11px', padding: '3px 8px', background: '#313244', color: '#a6e3a1', borderRadius: '12px' }}>
          🖥️ Tier: {hardwareTier}
        </span>

        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reasoning}
            onChange={(e) => setReasoning(e.target.checked)}
          />
          CoT Reasoning
        </label>

        <div style={{ display: 'flex', background: 'var(--surface-color)', padding: '2px', borderRadius: '6px' }}>
          <button
            className={`btn-mode ${agentMode === 'plan' ? 'active' : ''}`}
            onClick={() => setAgentMode('plan')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              background: agentMode === 'plan' ? 'var(--primary-color)' : 'transparent',
              color: agentMode === 'plan' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Modo Plan
          </button>
          <button
            className={`btn-mode ${agentMode === 'build' ? 'active' : ''}`}
            onClick={() => setAgentMode('build')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              border: 'none',
              borderRadius: '4px',
              background: agentMode === 'build' ? 'var(--primary-color)' : 'transparent',
              color: agentMode === 'build' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Modo Build
          </button>
        </div>
      </div>
    </header>
  );
}
