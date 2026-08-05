import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { X, Check, Server, Download, Plus, Loader2, Globe, HardDrive } from 'lucide-react';

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
      setModelToInstall('');
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
  const fallbackModels = ollamaConfig
    ? ollamaConfig.models
    : ['qwen2.5:1.5b', 'llama3.2:3b', 'phi3:mini', 'deepseek-coder:6.7b'];

  const displayedLocalModels =
    localStatus === 'ok' && localModels
      ? localModels.map(m => ({ name: m.name, size: m.size }))
      : fallbackModels.map(m => ({ name: m, size: '' }));

  const remoteProviders = (providersConfig || []).filter(p => p.id !== 'ollama');

  const handleSelect = (provider, model) => {
    onSelect(provider, model);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="doctor-modal"
        style={{ maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto', padding: '0' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--colors-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="doctor-title" style={{ margin: 0, fontSize: '16px' }}>Seleccionar Modelo</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 20px' }}>

          {/* Local (Ollama) Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <HardDrive size={14} strokeWidth={1.75} style={{ color: 'var(--colors-primary)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '700', color: 'var(--colors-ink)' }}>Local (Ollama)</span>
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-mono)', marginLeft: 'auto',
                color: localStatus === 'ok' ? 'var(--colors-success, #10b981)' : localStatus === 'detecting' ? 'var(--colors-muted)' : 'var(--colors-error, #ef4444)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {localStatus === 'detecting' && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}
                {localStatus === 'detecting' ? 'Detectando...' : localStatus === 'ok' ? 'Detectado' : 'No disponible'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {displayedLocalModels.map(model => (
                <div
                  key={`ollama-${model.name}`}
                  onClick={() => handleSelect('ollama', model.name)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'var(--colors-surface-card)',
                    border: selectedProvider === 'ollama' && selectedModel === model.name
                      ? '1px solid var(--colors-primary)' : '1px solid var(--colors-hairline)',
                    borderRadius: '6px', cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)', fontWeight: selectedProvider === 'ollama' && selectedModel === model.name ? '600' : '400' }}>{model.name}</span>
                    {model.size && <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>{model.size}</span>}
                  </div>
                  {selectedProvider === 'ollama' && selectedModel === model.name && <Check size={14} strokeWidth={1.75} style={{ color: 'var(--colors-primary)' }} />}
                </div>
              ))}
            </div>

            {/* Install model */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                className="model-selector-select"
                value={modelToInstall}
                onInput={e => setModelToInstall(e.target.value)}
                placeholder="nombre:tag (ej. mistral:7b)"
                style={{ flex: 1, padding: '6px 10px', fontSize: '11px', outline: 'none', borderRadius: '6px' }}
                disabled={installing}
                onKeyDown={e => { if (e.key === 'Enter') installModel(); }}
              />
              <button
                onClick={installModel}
                disabled={!modelToInstall.trim() || installing}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '6px 12px', borderRadius: '6px' }}
              >
                {installing ? <Loader2 size={12} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} strokeWidth={1.75} />}
                Instalar
              </button>
            </div>
          </div>

          {/* Remote Providers */}
          {remoteProviders.length > 0 && (
            <div style={{ borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
              {remoteProviders.map(provider => (
                <div key={provider.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Globe size={14} strokeWidth={1.75} style={{ color: 'var(--colors-body)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '700', color: 'var(--colors-ink)' }}>{provider.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {provider.models.map(model => (
                      <div
                        key={`${provider.id}-${model}`}
                        onClick={() => handleSelect(provider.id, model)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', background: 'var(--colors-surface-card)',
                          border: selectedProvider === provider.id && selectedModel === model
                            ? '1px solid var(--colors-primary)' : '1px solid var(--colors-hairline)',
                          borderRadius: '6px', cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>{model}</span>
                        {selectedProvider === provider.id && selectedModel === model && <Check size={14} strokeWidth={1.75} style={{ color: 'var(--colors-primary)' }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Provider */}
          <div style={{ borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
            <button
              onClick={() => { onClose(); onOpenProviderManager(); }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', padding: '10px 16px', width: '100%', justifyContent: 'center', borderRadius: '6px' }}
            >
              <Plus size={14} strokeWidth={1.75} />
              Añadir Custom Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
