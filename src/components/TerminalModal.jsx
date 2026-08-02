import { h } from 'preact';
import { useState } from 'preact/hooks';

export function TerminalModal({ proposedCommand, onApprove, onReject }) {
  if (!proposedCommand) return null;

  const { command, workspacePath } = proposedCommand;
  const [perimeterMode, setPerimeterMode] = useState(true);

  return (
    <div className="modal-backdrop" onClick={onReject}>
      <div className="doctor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="doctor-header">
          <div className="doctor-title-group">
            <span className="doctor-icon">[Terminal]</span>
            <div>
              <h3 className="doctor-title">Ejecución de Comando en Sandbox</h3>
              <p className="doctor-subtitle">Aislamiento de kernel Linux bwrap / firejail — Stark Security</p>
            </div>
          </div>
          <button className="doctor-close-btn" onClick={onReject}>[✕]</button>
        </div>

        <p style={{ fontSize: '13.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-body-strong)' }}>
          El agente solicita ejecutar el siguiente comando en la terminal sandbox:
        </p>

        <div style={{
          backgroundColor: 'var(--colors-surface-dark)',
          borderRadius: '4px',
          padding: '14px 18px',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'var(--colors-ink-deep)',
          border: '1px solid var(--colors-hairline)'
        }}>
          $ {command}
        </div>

        <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--colors-body)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={perimeterMode}
              onChange={(e) => setPerimeterMode(e.target.checked)}
            />
            [Secured: Aislamiento Perimetral (Bloquear red externa)]
          </label>
        </div>

        <div className="doctor-footer">
          <button className="btn-secondary" onClick={onReject}>
            [Cancelar Comando]
          </button>
          <button className="btn-stark" onClick={() => onApprove(command, perimeterMode)}>
            [Ejecutar en Sandbox]
          </button>
        </div>
      </div>
    </div>
  );
}
