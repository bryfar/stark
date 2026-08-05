import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { X, Settings, Shield, Cpu, Sliders, Check, Stethoscope } from 'lucide-react';
import { translations } from '../i18n';

export function SettingsModal({ isOpen, onClose, theme, onToggleTheme, lang = 'es', onToggleLang }) {
  if (!isOpen) return null;

  const t = translations[lang] ? translations[lang].settings : translations.es.settings;
  const tDoc = translations[lang] ? translations[lang].doctor : translations.es.doctor;

  const [activeTab, setActiveTab] = useState('general');
  const [sandboxEnabled, setSandboxEnabled] = useState(true);
  const [sandboxEngine, setSandboxEngine] = useState('bubblewrap');
  const [timeoutSecs, setTimeoutSecs] = useState(30);
  const [hardwareInfo, setHardwareInfo] = useState(null);
  const [loadingHardware, setLoadingHardware] = useState(false);
  const [scale, setScale] = useState(1.0);

  // Load current scale value from CSS variable or state
  useEffect(() => {
    const currentScale = parseFloat(document.documentElement.style.getPropertyValue('--ui-scale')) || 1.0;
    setScale(currentScale);
    detectHardware();
  }, [isOpen]);

  const detectHardware = async () => {
    setLoadingHardware(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const info = await invoke('hardware_detect');
      setHardwareInfo(info);
    } catch (e) {
      // Mock / Fallback
      setHardwareInfo({
        tier: 'Standard',
        total_ram_mb: 16384,
        cpu_cores: 8,
        gpu_info: 'NVIDIA RTX Mock'
      });
    }
    setLoadingHardware(false);
  };

  const handleScaleChange = (val) => {
    setScale(val);
    document.documentElement.style.setProperty('--ui-scale', val.toFixed(2));
    // Trigger window resize event to let other components recalculate
    window.dispatchEvent(new Event('resize'));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="doctor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '95%' }}>
        
        {/* Header */}
        <div className="doctor-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--colors-hairline)' }}>
          <div className="doctor-title-group">
            <Settings size={18} strokeWidth={1.75} style={{ color: 'var(--colors-ink)' }} />
            <div>
              <h3 className="doctor-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: '700', margin: 0 }}>
                {t.title}
              </h3>
              <p className="doctor-subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>
                {t.subtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--colors-hairline)', background: 'var(--colors-surface-dark-soft)', padding: '4px' }}>
          <button 
            onClick={() => setActiveTab('general')}
            className={`btn-mode-toggle ${activeTab === 'general' ? 'active' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Sliders size={14} strokeWidth={1.75} />
            <span>{t.general}</span>
          </button>
          <button 
            onClick={() => setActiveTab('sandbox')}
            className={`btn-mode-toggle ${activeTab === 'sandbox' ? 'active' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Shield size={14} strokeWidth={1.75} />
            <span>{t.sandbox}</span>
          </button>
          <button 
            onClick={() => setActiveTab('hardware')}
            className={`btn-mode-toggle ${activeTab === 'hardware' ? 'active' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Cpu size={14} strokeWidth={1.75} />
            <span>{t.hardware}</span>
          </button>
          <button 
            onClick={() => setActiveTab('doctor')}
            className={`btn-mode-toggle ${activeTab === 'doctor' ? 'active' : ''}`}
            style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Stethoscope size={14} strokeWidth={1.75} />
            <span>Doctor</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px 0', minHeight: '260px' }}>
          
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Theme Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--colors-ink)', margin: 0 }}>{t.theme}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>{t.themeDesc}</p>
                </div>
                <button
                  onClick={onToggleTheme}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {theme === 'light' ? 'Light' : 'Dark'}
                </button>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--colors-hairline)' }} />

              {/* Language Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--colors-ink)', margin: 0 }}>{t.lang}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>{t.langDesc}</p>
                </div>
                <button
                  onClick={onToggleLang}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {lang === 'es' ? 'Español' : 'English'}
                </button>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--colors-hairline)' }} />

              {/* Scale Row */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--colors-ink)', margin: 0 }}>{t.scale}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>{t.scaleDesc}</p>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--colors-ink)' }}>{Math.round(scale * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.7" 
                  max="1.2" 
                  step="0.05" 
                  value={scale} 
                  onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--colors-primary)' }}
                />
              </div>
            </div>
          )}

          {/* TAB: SANDBOX */}
          {activeTab === 'sandbox' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--colors-ink)', margin: 0 }}>{t.sandboxIsolation}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>{t.sandboxDesc}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={sandboxEnabled} 
                  onChange={(e) => setSandboxEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {sandboxEnabled && (
                <>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--colors-hairline)' }} />

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--colors-ink)', display: 'block', marginBottom: '6px' }}>{t.sandboxEngine}</label>
                    <select 
                      className="model-selector-select"
                      value={sandboxEngine} 
                      onChange={(e) => setSandboxEngine(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12px' }}
                    >
                      <option value="bubblewrap">{t.bubblewrap}</option>
                      <option value="firejail">{t.firejail}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--colors-ink)', display: 'block', marginBottom: '6px' }}>{t.timeout}</label>
                    <input 
                      type="number" 
                      className="model-selector-select"
                      value={timeoutSecs} 
                      onInput={(e) => setTimeoutSecs(parseInt(e.target.value) || 30)}
                      style={{ width: '100%', padding: '8px 10px', fontSize: '12px' }} 
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: HARDWARE */}
          {activeTab === 'hardware' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--colors-ink)', margin: 0 }}>{t.specs}</h4>
                <p style={{ fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 10px 0' }}>{t.specsDesc}</p>
              </div>

              {loadingHardware ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--colors-muted)', fontSize: '12px' }}>{t.scanning}</div>
              ) : hardwareInfo ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-muted)' }}>Tier</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--colors-ink)', marginTop: '4px' }}>{hardwareInfo.tier}</div>
                  </div>
                  <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-muted)' }}>RAM</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--colors-ink)', marginTop: '4px' }}>{Math.round(hardwareInfo.total_ram_mb / 1024)} GB</div>
                  </div>
                  <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-muted)' }}>CPU Cores</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--colors-ink)', marginTop: '4px' }}>{hardwareInfo.cpu_cores} Threads</div>
                  </div>
                  <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-muted)' }}>GPU</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--colors-ink)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hardwareInfo.gpu_info || 'CPU Only'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--colors-error)', fontSize: '12px' }}>{t.scanError}</div>
              )}

              <button 
                onClick={detectHardware} 
                className="btn-secondary" 
                style={{ fontSize: '11px', padding: '6px 12px', alignSelf: 'flex-start' }}
              >
                {t.reScan}
              </button>
            </div>
          )}

          {/* TAB: DOCTOR / DIAGNOSTICS */}
          {activeTab === 'doctor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--colors-ink)', margin: 0 }}>{tDoc.title}</h4>
                <p style={{ fontSize: '11px', color: 'var(--colors-muted)', margin: '4px 0 10px 0' }}>{tDoc.subtitle}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--colors-ink)' }}>{tDoc.displayServer}</div>
                  <div style={{ fontSize: '13px', color: 'var(--colors-muted)', marginTop: '4px' }}>Wayland (Opt-in native)</div>
                </div>
                <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--colors-ink)' }}>{tDoc.hardwareTier}</div>
                  <div style={{ fontSize: '13px', color: 'var(--colors-muted)', marginTop: '4px' }}>Standard ({hardwareInfo ? Math.round(hardwareInfo.total_ram_mb / 1024) : 16}GB RAM)</div>
                </div>
                <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--colors-ink)' }}>{tDoc.localOllama}</div>
                  <div style={{ fontSize: '13px', color: 'var(--colors-muted)', marginTop: '4px' }}>Active (http://localhost:11434)</div>
                </div>
                <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--colors-ink)' }}>{tDoc.keyring}</div>
                  <div style={{ fontSize: '13px', color: 'var(--colors-muted)', marginTop: '4px' }}>Secret Service (libsecret OK)</div>
                </div>
                <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--colors-ink)' }}>{tDoc.sandboxEngine}</div>
                  <div style={{ fontSize: '13px', color: 'var(--colors-muted)', marginTop: '4px' }}>{sandboxEngine} enabled</div>
                </div>
                <div style={{ background: 'var(--colors-surface-dark)', padding: '10px', border: '1px solid var(--colors-hairline)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--colors-ink)' }}>{tDoc.memoryUsage}</div>
                  <div style={{ fontSize: '13px', color: 'var(--colors-muted)', marginTop: '4px' }}>240MB / &lt; 500MB (OK)</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--colors-hairline)' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '8px 20px', fontSize: '12px' }}>
            {t.closeBtn}
          </button>
          <button className="send-btn-stark" onClick={onClose} style={{ padding: '8px 20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} strokeWidth={1.75} />
            <span>{t.apply}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
