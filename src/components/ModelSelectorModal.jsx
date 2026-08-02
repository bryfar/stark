import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { X, Check, Server, Download, Plus, Loader2 } from 'lucide-react';

export function ModelSelectorModal({
  isOpen,
  onClose,
  selectedProvider,
  selectedModel,
  onSelect,
  providersConfig,
  onOpenProviderManager
}) {
  const [localModels, setLocalModels] = useState(null);
  const [localStatus, setLocalStatus] = useState('detecting');
  const [installing, setInstalling] = useState(false);
  const [modelToInstall, setModelToInstall] = useState('');
  
  async function invoke(cmd, args) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(cmd, args);
    } catch (e) {
      throw e;
    }
  }

  async function detectLocal() {
    setLocalStatus('detecting');
    try {
      const list = await invoke('providers_detect_models', { providerId: 'ollama' });
      setLocalModels(list);
      setLocalStatus('ok');
    } catch (e) {
      setLocalModels(null);
      setLocalStatus('unavailable');
    }
  }

  useEffect(() => {
    if (isOpen) {
      detectLocal();
    }
  }, [isOpen]);

  async function installModel() {
    if (!modelToInstall.trim() || installing) return;
    setInstalling(true);
    try {
      await invoke('providers_install_model', { modelName: modelToInstall.trim() });
      setModelToInstall('');
      await detectLocal();
    } catch (e) {
      console.error(e);
    } finally {
      setInstalling(false);
    }
  }

  if (!isOpen) return null;

  const ollamaConfig = (providersConfig || []).find(p => p.id === 'ollama');
  const fallbackModels = ollamaConfig ? ollamaConfig.models : ['qwen2.5:1.5b', 'llama3.2:3b', 'phi3:mini', 'deepseek-coder:6.7b'];

  const displayedLocalModels = localStatus === 'ok' && localModels 
    ? localModels.map(m => m.name) 
    : fallbackModels;

  const remoteProviders = (providersConfig || []).filter(p => p.id !== 'ollama');

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="doctor-modal" style={{ maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="doctor-header">
          <div>
            <h2 className="doctor-title">Seleccionar Modelo</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer' }}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Local (Ollama) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Server size={14} strokeWidth={1.75} style={{ color: 'var(--colors-primary)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '700', color: 'var(--colors-ink)' }}>Local (Ollama)</span>
            <span style={{ fontSize: '10px', color: 'var(--colors-muted)', marginLeft: 'auto' }}>
              {localStatus === 'detecting' ? 'Detectando...' : localStatus === 'ok' ? 'Ollama detectado' : 'Ollama no disponible'}
            </span>
          </div>

          {displayedLocalModels.map(model => (
            <div 
              key={`ollama-${model}`}
              onClick={() => { onSelect('ollama', model); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--colors-surface-card)',
                border: selectedProvider === 'ollama' && selectedModel === model ? '1px solid #8c6253' : '1px solid var(--colors-hairline)',
                borderRadius: '4px', cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>{model}</span>
              {selectedProvider === 'ollama' && selectedModel === model && <Check size={14} strokeWidth={1.75} style={{ color: '#8c6253' }} />}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input 
              className="model-selector-select"
              value={modelToInstall}
              onInput={e => setModelToInstall(e.target.value)}
              placeholder="Ej. mistral:7b"
              style={{ flex: 1, padding: '6px 10px', fontSize: '11px', outline: 'none' }}
              disabled={installing}
            />
            <button 
              onClick={installModel}
              disabled={!modelToInstall.trim() || installing}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '6px 10px' }}
            >
              {installing ? <Loader2 size={12} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} strokeWidth={1.75} />}
              Instalar
            </button>
          </div>
        </div>

        {/* Remote Providers */}
        {remoteProviders.map(provider => (
          <div key={provider.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '700', color: 'var(--colors-ink)' }}>
              {provider.name}
            </span>
            {provider.models.map(model => (
              <div 
                key={`${provider.id}-${model}`}
                onClick={() => { onSelect(provider.id, model); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: 'var(--colors-surface-card)',
                  border: selectedProvider === provider.id && selectedModel === model ? '1px solid #8c6253' : '1px solid var(--colors-hairline)',
                  borderRadius: '4px', cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>{model}</span>
                {selectedProvider === provider.id && selectedModel === model && <Check size={14} strokeWidth={1.75} style={{ color: '#8c6253' }} />}
              </div>
            ))}
          </div>
        ))}

        {/* Add custom provider */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--colors-hairline)', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => { onClose(); onOpenProviderManager(); }}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 16px', width: '100%', justifyContent: 'center' }}
          >
            <Plus size={14} strokeWidth={1.75} />
            Añadir Custom Provider
          </button>
        </div>
      </div>
    </div>
  );
}
