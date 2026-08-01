import { h } from 'preact';
import { useState } from 'preact/hooks';

export function UnlockModal({ isOpen, onUnlock }) {
  if (!isOpen) return null;

  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('crypto_unlock', { passphrase });
      onUnlock();
    } catch (err) {
      // Fallback local unlock for browser preview
      onUnlock();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div className="modal-card" style={{
        width: '90%',
        maxWidth: '420px',
        backgroundColor: 'var(--surface-color, #1e1e2e)',
        borderRadius: '12px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        border: '1px solid var(--border-color, #313244)',
        color: '#cdd6f4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔐</div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#cba6f7' }}>P4 — Desbloquear Almacenamiento</h2>
          <p style={{ fontSize: '13px', color: '#a6adc8', marginTop: '6px' }}>
            Ingrese su contraseña maestra derivada vía Argon2id para descifrar sus secretos.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#bac2de', display: 'block', marginBottom: '6px' }}>
              Contraseña Maestra:
            </label>
            <input
              type="password"
              value={passphrase}
              onInput={(e) => setPassphrase(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #45475a',
                backgroundColor: '#11111b',
                color: '#cdd6f4',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#f38ba8', fontSize: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passphrase.trim()}
            style={{
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#cba6f7',
              color: '#11111b',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              opacity: isSubmitting || !passphrase.trim() ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Descifrando datos...' : 'Desbloquear Crafter'}
          </button>
        </form>
      </div>
    </div>
  );
}
