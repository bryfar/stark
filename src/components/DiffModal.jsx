import { h } from "preact";
import { diffLines } from "diff";
import { FileText, Check, X } from "lucide-react";

export function DiffModal({ proposedEdit, onApprove, onReject }) {
  if (!proposedEdit) return null;

  const { filePath, originalContent, newContent, description } = proposedEdit;

  // Generate real line-by-line diff
  const diff = diffLines(originalContent || "", newContent || "");

  return (
    <div className="modal-backdrop" onClick={onReject}>
      <div
        className="doctor-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "800px" }}
      >
        <div className="doctor-header">
          <div className="doctor-title-group">
            <FileText
              size={18}
              strokeWidth={1.75}
              style={{ color: "var(--colors-body-strong)" }}
            />
            <div>
              <h3 className="doctor-title">Aprobación de Edición Propuesta</h3>
              <p className="doctor-subtitle">
                Modo Build — Inspecciona los cambios antes de aplicar a disco
              </p>
            </div>
          </div>
          <button className="doctor-close-btn" onClick={onReject}>
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div
          style={{
            padding: "0 0 16px 0",
            fontSize: "13.5px",
            fontFamily: "var(--font-mono)",
            color: "var(--colors-body-strong)",
          }}
        >
          <span style={{ color: "var(--colors-muted)" }}>Archivo destino:</span>{" "}
          <code
            style={{
              background: "var(--colors-surface-soft)",
              padding: "2px 8px",
              borderRadius: "4px",
              color: "var(--colors-ink)",
            }}
          >
            {filePath}
          </code>
        </div>

        {description && (
          <p
            style={{
              fontSize: "13px",
              fontStyle: "italic",
              color: "var(--colors-muted)",
              marginTop: "0",
              marginBottom: "16px",
            }}
          >
            {description}
          </p>
        )}

        <div
          style={{
            backgroundColor: "var(--colors-surface-dark)",
            borderRadius: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            border: "1px solid var(--colors-hairline)",
            maxHeight: "400px",
            overflowY: "auto",
            lineHeight: "1.5",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {diff.map((part, index) => {
                const lines = part.value.split("\n");
                // Remove trailing empty line if it splits with trailing newline
                if (
                  lines[lines.length - 1] === "" &&
                  index === diff.length - 1
                ) {
                  lines.pop();
                } else if (lines[lines.length - 1] === "") {
                  lines.pop();
                }

                let backgroundColor = "transparent";
                let color = "var(--colors-body-strong)";
                let prefix = " ";

                if (part.added) {
                  backgroundColor = "rgba(16, 185, 129, 0.1)";
                  color = "#10b981";
                  prefix = "+";
                } else if (part.removed) {
                  backgroundColor = "rgba(239, 68, 68, 0.1)";
                  color = "#ef4444";
                  prefix = "-";
                }

                return lines.map((line, lineIdx) => (
                  <tr key={`${index}-${lineIdx}`} style={{ backgroundColor }}>
                    <td
                      style={{
                        width: "30px",
                        textAlign: "right",
                        paddingRight: "12px",
                        paddingLeft: "12px",
                        color: "var(--colors-muted)",
                        userSelect: "none",
                        borderRight: "1px solid var(--colors-hairline-soft)",
                        fontSize: "11px",
                      }}
                    >
                      {prefix}
                    </td>
                    <td
                      style={{
                        paddingLeft: "12px",
                        color,
                        whiteSpace: "pre-wrap",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {line}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        <div className="doctor-footer" style={{ marginTop: "20px" }}>
          <button
            className="btn-secondary"
            onClick={onReject}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <X size={14} strokeWidth={1.75} />
            Rechazar
          </button>
          <button
            className="btn-stark"
            onClick={() => onApprove(proposedEdit)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--colors-primary)",
              color: "var(--colors-on-primary)",
            }}
          >
            <Check size={14} strokeWidth={1.75} />
            Aprobar y aplicar a disco
          </button>
        </div>
      </div>
    </div>
  );
}
