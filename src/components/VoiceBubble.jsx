import { Mic, Square, X } from "lucide-react";

// Burbuja de dictado: feedback visible de lo que se está hablando.
// Se ancla encima del contenedor del prompt (dropup, nunca hacia abajo)
// con position:absolute; el padre debe tener position:relative.

const BAR_FACTORS = [0.45, 0.75, 1, 0.7, 0.5];

function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VoiceBubble({
  status,
  elapsed,
  level,
  error,
  onStop,
  onCancel,
}) {
  if (status === "idle" && !error) return null;

  const isRecording = status === "recording";
  const isTranscribing = status === "transcribing";
  const isError =
    status === "error" || (!isRecording && !isTranscribing && !!error);

  const stateLabel = isError
    ? "Error de dictado"
    : isTranscribing
      ? "Transcribiendo..."
      : "Escuchando";

  return (
    <div
      className="voice-bubble"
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "10px",
        right: "10px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        background: "var(--colors-surface-dark-elevated)",
        border: `1px solid ${isError ? "var(--colors-danger, #b3555a)" : "var(--colors-primary, #ffffff)"}`,
        borderRadius: "10px",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
        fontFamily: "var(--font-mono)",
        zIndex: 60,
      }}
    >
      {isTranscribing ? (
        <span
          style={{
            width: "14px",
            height: "14px",
            flexShrink: 0,
            border: "2px solid var(--colors-muted)",
            borderTopColor: "var(--colors-primary, #ffffff)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      ) : (
        <span
          style={{
            width: "14px",
            height: "14px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: isError
              ? "var(--colors-danger, #b3555a)"
              : "var(--colors-primary, #ffffff)",
            color: "var(--colors-canvas, #1e1e1e)",
            animation: isRecording
              ? "voicePulse 1.2s ease-in-out infinite"
              : undefined,
          }}
        >
          <Mic size={9} strokeWidth={1.75} />
        </span>
      )}

      {!isError && (
        <span
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "2px",
            height: "16px",
            flexShrink: 0,
          }}
        >
          {BAR_FACTORS.map((factor, i) => (
            <span
              key={i}
              style={{
                width: "3px",
                borderRadius: "1px",
                background: "var(--colors-primary, #ffffff)",
                opacity: isRecording ? 0.95 : 0.35,
                height: `${Math.max(3, Math.round(16 * factor * (isRecording ? Math.max(level, 0.12) : 0.12)))}px`,
                transition: "height 90ms linear",
              }}
            />
          ))}
        </span>
      )}

      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: "11px",
          color: isError
            ? "var(--colors-danger, #d98a8e)"
            : "var(--colors-body-strong)",
        }}
        title={isError ? String(error) : undefined}
      >
        {isError
          ? String(error || "Error de dictado")
          : `${stateLabel} - habla ahora, se inserta al detener`}
      </span>

      {isRecording && (
        <span
          style={{
            fontSize: "10.5px",
            color: "var(--colors-muted)",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {formatElapsed(elapsed)}
        </span>
      )}

      {isRecording && (
        <button
          onClick={onStop}
          title="Detener e insertar transcripcion"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "var(--colors-primary, #ffffff)",
            border: "none",
            color: "var(--colors-canvas, #1e1e1e)",
            cursor: "pointer",
          }}
        >
          <Square size={10} strokeWidth={1.75} fill="currentColor" />
        </button>
      )}

      <button
        onClick={onCancel}
        title={isError ? "Cerrar" : "Cancelar dictado"}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          background: "transparent",
          border: "1px solid var(--colors-hairline)",
          color: "var(--colors-muted)",
          cursor: "pointer",
        }}
      >
        <X size={11} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export default VoiceBubble;
