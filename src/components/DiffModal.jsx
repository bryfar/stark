import { h } from 'preact';

export function DiffModal({ proposedEdit, onApprove, onReject }) {
  if (!proposedEdit) return null;

  const { filePath, originalContent, newContent, description } = proposedEdit;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="modal-card" style={{
        width: '80%',
        maxWidth: '800px',
        maxHeight: '85vh',
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
          <h3 style={{ margin: 0, fontSize: '18px', color: '#cba6f7' }}>P2 — Aprobación de Edición Propuesta</h3>
          <span style={{ fontSize: '12px', padding: '4px 8px', background: '#313244', borderRadius: '4px' }}>
            Modo Build
          </span>
        </div>

        <p style={{ fontSize: '13px', margin: 0, color: '#a6adc8' }}>
          <strong>Archivo:</strong> <code>{filePath}</code>
        </p>

        {description && (
          <p style={{ fontSize: '13px', margin: 0, fontStyle: 'italic', color: '#bac2de' }}>
            {description}
          </p>
        )}

        <div className="diff-view" style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: '#11111b',
          borderRadius: '8px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '13px',
          whiteSpace: 'pre-wrap',
          border: '1px solid #1e1e2e'
        }}>
          {originalContent && (
            <div style={{ color: '#f38ba8', marginBottom: '8px' }}>
              <strong>--- Contenido Original ---</strong>
              <div>- {originalContent}</div>
            </div>
          )}
          <div style={{ color: '#a6e3a1' }}>
            <strong>+++ Nuevo Contenido Propuesto +++</strong>
            <div>+ {newContent}</div>
          </div>
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
            Rechazar
          </button>
          <button
            onClick={() => onApprove(proposedEdit)}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#a6e3a1',
              color: '#11111b',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Aprobar y Aplicar a Disco
          </button>
        </div>
      </div>
    </div>
  );
}
