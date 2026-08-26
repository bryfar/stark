import { h } from "preact";
import { useState } from "preact/hooks";

export function TerminalModal({ proposedCommand, onApprove, onReject }) {
  if (!proposedCommand) return null;

  const { command } = proposedCommand;
  const [perimeterMode, setPerimeterMode] = useState(true);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [output, setOutput] = useState([]);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setFinished(false);
    setOutput([]);

    const { listen } = await import("@tauri-apps/api/event");
    let unlistenOut;
    let unlistenErr;
    try {
      unlistenOut = await listen("terminal:stdout", (event) => {
        if (event.payload?.line)
          setOutput((prev) => [...prev, event.payload.line]);
      });
    } catch {}
    try {
      unlistenErr = await listen("terminal:stderr", (event) => {
        if (event.payload?.line)
          setOutput((prev) => [...prev, event.payload.line]);
      });
    } catch {}

    try {
      if (onApprove) await onApprove(command, perimeterMode);
    } catch (err) {
      setOutput((prev) => [...prev, `[Error]: ${String(err)}`]);
    } finally {
      try {
        unlistenOut && unlistenOut();
      } catch {}
      try {
        unlistenErr && unlistenErr();
      } catch {}
      setRunning(false);
      setFinished(true);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => !running && onReject()}>
      <div
        className="doctor-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px" }}
      >
        <div className="doctor-header">
          <div className="doctor-title-group">
            <span className="doctor-icon">[Terminal]</span>
            <div>
              <h3 className="doctor-title">Ejecución de Comando en Sandbox</h3>
              <p className="doctor-subtitle">
                {running
                  ? "Ejecutando..."
                  : finished
                    ? "Finalizado"
                    : "Aislamiento de kernel Linux bwrap / firejail"}
              </p>
            </div>
          </div>
          <button
            className="doctor-close-btn"
            onClick={() => !running && onReject()}
          >
            [✕]
          </button>
        </div>

        <p
          style={{
            fontSize: "13.5px",
            fontFamily: "var(--font-mono)",
            color: "var(--colors-body-strong)",
          }}
        >
          El agente solicita ejecutar el siguiente comando en la terminal
          sandbox:
        </p>

        <div
          style={{
            backgroundColor: "var(--colors-surface-dark)",
            borderRadius: "4px",
            padding: "14px 18px",
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            color: "var(--colors-ink-deep)",
            border: "1px solid var(--colors-hairline)",
          }}
        >
          $ {command}
        </div>

        <div
          style={{
            fontSize: "13px",
            fontFamily: "var(--font-mono)",
            color: "var(--colors-body)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "10px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={perimeterMode}
              disabled={running}
              onChange={(e) => setPerimeterMode(e.target.checked)}
            />
            [Secured: Aislamiento Perimetral (Bloquear red externa)]
          </label>
        </div>

        {output.length > 0 && (
          <div
            style={{
              marginTop: "12px",
              backgroundColor: "var(--colors-surface-dark)",
              borderRadius: "4px",
              padding: "12px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: "12.5px",
              lineHeight: "1.55",
              whiteSpace: "pre-wrap",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        <div className="doctor-footer">
          {running ? (
            <button className="btn-secondary" disabled>
              [Ejecutando...]
            </button>
          ) : finished ? (
            <button className="btn-stark" onClick={onReject}>
              [Cerrar]
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={onReject}>
                [Cancelar Comando]
              </button>
              <button className="btn-stark" onClick={handleRun}>
                [Ejecutar en Sandbox]
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
