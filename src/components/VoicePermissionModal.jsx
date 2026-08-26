import { MicOff, Terminal, RefreshCw, X } from "lucide-react";

// Modal que aparece cuando el webview deniega el micrófono.
// Ofrece dos salidas reales: reintentar el permiso o grabar por el sistema
// (parecord/ffmpeg vía Rust), que no depende del permiso del navegador.

export function VoicePermissionModal({
  visible,
  reason,
  onRetry,
  onSystemRecord,
  onClose,
}) {
  if (!visible) return null;

  return (
    <div
      className="voice-permission-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Permiso de microfono"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(460px, calc(100vw - 48px))",
          background: "var(--colors-surface-card)",
          border: "1px solid var(--colors-hairline-strong)",
          borderRadius: "10px",
          padding: "22px 24px",
          fontFamily: "var(--font-mono)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--colors-surface-dark-elevated)",
              border: "1px solid var(--colors-hairline)",
              flexShrink: 0,
            }}
          >
            <MicOff size={15} strokeWidth={1.75} />
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--colors-ink)",
              flex: 1,
            }}
          >
            Permiso de microfono denegado
          </h2>
          <button
            onClick={onClose}
            title="Cerrar"
            style={{
              background: "transparent",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--colors-muted)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={12} strokeWidth={1.75} />
          </button>
        </div>

        <p
          style={{
            margin: "0 0 8px",
            fontSize: "11.5px",
            lineHeight: 1.6,
            color: "var(--colors-body)",
          }}
        >
          El visor web de Tauri denegó el acceso al micrófono sin mostrar
          diálogo (limitación conocida de WebKitGTK en Linux). No se bloqueó
          nada a nivel de sistema: es una restricción del componente embebido.
        </p>

        {reason && (
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "10.5px",
              color: "var(--colors-muted)",
              padding: "7px 9px",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "5px",
              background: "var(--colors-surface-dark)",
              overflowWrap: "break-word",
            }}
          >
            {reason}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={onSystemRecord}
            title="Graba con parecord/ffmpeg fuera del webview y transcribe con voxtype"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "10px 12px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              textAlign: "left",
              background: "var(--colors-primary, #ffffff)",
              color: "var(--colors-canvas, #1e1e1e)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <Terminal size={14} strokeWidth={1.75} />
            <span style={{ flex: 1 }}>
              <strong>Grabar por el sistema</strong>
              <span
                style={{
                  display: "block",
                  fontSize: "10.5px",
                  opacity: 0.8,
                  marginTop: "2px",
                }}
              >
                10 segundos con parecord/ffmpeg, sin permisos del navegador
              </span>
            </span>
          </button>

          <button
            onClick={onRetry}
            title="Vuelve a pedir acceso al microfono"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              padding: "10px 12px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              textAlign: "left",
              background: "var(--colors-surface-dark)",
              color: "var(--colors-ink)",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} strokeWidth={1.75} />
            <span style={{ flex: 1 }}>
              Reintentar micrófono del navegador
              <span
                style={{
                  display: "block",
                  fontSize: "10.5px",
                  color: "var(--colors-muted)",
                  marginTop: "2px",
                }}
              >
                Útil si ya ajustaste los permisos del portal
              </span>
            </span>
          </button>
        </div>

        <p
          style={{
            margin: "14px 0 0",
            fontSize: "10px",
            color: "var(--colors-muted)",
            lineHeight: 1.5,
          }}
        >
          La transcripción corre 100% local con voxtype. Si aún no está
          instalado, la burbuja te lo indicará al terminar de grabar.
        </p>
      </div>
    </div>
  );
}

export default VoicePermissionModal;
