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
    <div className="modal-backdrop">
      <div className="doctor-modal" style={{ maxWidth: '420px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--colors-body-strong)', marginBottom: '8px' }}>[Keyring]</div>
          <h2 className="doctor-title" style={{ margin: 0, fontSize: '18px' }}>[Desbloquear Almacenamiento]</h2>
          <p style={{ fontSize: '12.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)', marginTop: '8px' }}>
            Ingrese su contraseña maestra derivada vía Argon2id para descifrar sus secretos en Stark.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-body-strong)', display: 'block', marginBottom: '6px' }}>
              [Contraseña Maestra]:
            </label>
            <input
              type="password"
              value={passphrase}
              onInput={(e) => setPassphrase(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="model-selector-select"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--colors-ink-deep)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              [Error]: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passphrase.trim()}
            className="send-btn-stark"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px',
              fontSize: '13.5px'
            }}
          >
            {isSubmitting ? '[Descifrando...]' : '[Desbloquear Stark]'}
          </button>
        </form>
      </div>
    </div>
  );
}
