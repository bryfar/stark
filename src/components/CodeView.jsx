import { h } from 'preact';
import { useState } from 'preact/hooks';

export function CodeView({ selectedModel }) {
  const [logs, setLogs] = useState([
    { type: 'info', text: 'Modo Code iniciado. Acceso acotado a la raíz del workspace.' }
  ]);
  const [pendingCommand, setPendingCommand] = useState(null);
  const [input, setInput] = useState('');

  const handleProposeCommand = () => {
    if (!input.trim()) return;
    setPendingCommand(input);
  };

  const handleApproveCommand = () => {
    setLogs((prev) => [
      ...prev,
      { type: 'command', text: `$ ${pendingCommand}` },
      { type: 'success', text: `[Simulación Rust std::process::Command]: Ejecutado exitosamente con exit code 0.` }
    ]);
    setPendingCommand(null);
    setInput('');
  };

  const handleRejectCommand = () => {
    setLogs((prev) => [
      ...prev,
      { type: 'warning', text: `Comando cancelado por el usuario: ${pendingCommand}` }
    ]);
    setPendingCommand(null);
  };

  return (
    <div className="code-wrapper">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Log de Operaciones de Workspace & Terminal</h3>
        <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logs.map((l, i) => (
            <div key={i} style={{ color: l.type === 'command' ? 'var(--accent-cyan)' : l.type === 'warning' ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
              {l.text}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Escribe una tarea de código o comando shell a proponer (ej: cargo check)..."
          className="model-selector-select"
          style={{ flex: 1, padding: '10px 14px' }}
          value={input}
          onInput={(e) => setInput(e.target.value)}
        />
        <button className="send-btn" onClick={handleProposeCommand}>Proponer Comando</button>
      </div>

      {pendingCommand && (
        <div className="command-modal-backdrop">
          <div className="command-modal">
            <h4 className="command-title">⚠️ Aprobación de Ejecución de Terminal</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              El agente de código solicita ejecutar el siguiente comando en el sistema:
            </p>
            <div className="command-box">{pendingCommand}</div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleRejectCommand}>Cancelar</button>
              <button className="btn-success" onClick={handleApproveCommand}>Aprobar y Ejecutar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
