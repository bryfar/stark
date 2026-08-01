import { h } from 'preact';
import { useState } from 'preact/hooks';

export function TerminalModal({ proposedCommand, onApprove, onReject }) {
  if (!proposedCommand) return null;

  const { command, workspacePath } = proposedCommand;
  const [perimeterMode, setPerimeterMode] = useState(true);

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1500
    }}>
      <div className="modal-card" style={{
        width: '80%',
        maxWidth: '700px',
        backgroundColor: 'var(--surface-color, #1e1e2e)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        border: '1px solid var(--border-color, #313244)',
        color: '#cdd6f4'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#fab387' }}>P3 — Ejecución de Comando en Sandbox</h3>
          <span style={{ fontSize: '12px', padding: '4px 8px', background: '#313244', borderRadius: '4px' }}>
            Aislamiento Kernel (bwrap/firejail)
          </span>
        </div>

        <p style={{ fontSize: '13px', margin: 0, color: '#a6adc8' }}>
          El agente solicita ejecutar el siguiente comando en la terminal:
        </p>

        <div style={{
          backgroundColor: '#11111b',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#a6e3a1',
          border: '1px solid #313244'
        }}>
          $ {command}
        </div>

        <div style={{ fontSize: '12px', color: '#bac2de', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={perimeterMode}
              onChange={(e) => setPerimeterMode(e.target.checked)}
            />
            Aislamiento Perimetral (Bloquear red externa en contenedor)
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={onReject}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#45475a',
              color: '#cdd6f4',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Cancelar Comando
          </button>
          <button
            onClick={() => onApprove(command, perimeterMode)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#fab387',
              color: '#11111b',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Ejecutar en Sandbox
          </button>
        </div>
      </div>
    </div>
  );
}
