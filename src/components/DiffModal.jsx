import { h } from 'preact';

export function DiffModal({ proposedEdit, onApprove, onReject }) {
  if (!proposedEdit) return null;

  const { filePath, originalContent, newContent, description } = proposedEdit;

  return (
    <div className="modal-backdrop" onClick={onReject}>
      <div className="doctor-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="doctor-header">
          <div className="doctor-title-group">
            <span className="doctor-icon">[Diff]</span>
            <div>
              <h3 className="doctor-title">Aprobación de Edición Propuesta</h3>
              <p className="doctor-subtitle">Modo Build — Inspecciona los cambios antes de aplicar a disco en Stark</p>
            </div>
          </div>
          <button className="doctor-close-btn" onClick={onReject}>[✕]</button>
        </div>

        <p style={{ fontSize: '13.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-body-strong)' }}>
          <strong>[Archivo de destino]:</strong> <code style={{ background: 'var(--colors-surface-dark-elevated)', padding: '2px 8px', borderRadius: '4px', color: 'var(--colors-ink-deep)' }}>{filePath}</code>
        </p>

        {description && (
          <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--colors-muted)' }}>
            {description}
          </p>
        )}

        <div style={{
          backgroundColor: 'var(--colors-surface-dark)',
          borderRadius: '4px',
          padding: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          whiteSpace: 'pre-wrap',
          border: '1px solid var(--colors-hairline)',
          maxHeight: '350px',
          overflowY: 'auto'
        }}>
          {originalContent && (
            <div style={{ color: 'var(--colors-muted)', marginBottom: '12px' }}>
              <strong>--- Contenido Original ---</strong>
              <div>- {originalContent}</div>
            </div>
          )}
          <div style={{ color: 'var(--colors-ink-deep)' }}>
            <strong>+++ Nuevo Contenido Propuesto +++</strong>
            <div>+ {newContent}</div>
          </div>
        </div>

        <div className="doctor-footer">
          <button className="btn-secondary" onClick={onReject}>
            [Rechazar]
          </button>
          <button className="btn-stark" onClick={() => onApprove(proposedEdit)}>
            [Aprobar y Aplicar a Disco]
          </button>
        </div>
      </div>
    </div>
  );
}
