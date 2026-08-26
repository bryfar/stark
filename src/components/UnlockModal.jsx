import { h } from "preact";
import { useState } from "preact/hooks";
import { KeyRound, Lock, AlertTriangle } from "lucide-react";

export function UnlockModal({ isOpen, onUnlock }) {
  if (!isOpen) return null;

  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const isTauri =
        typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("crypto_unlock", { passphrase });
      }
      setIsSubmitting(false);
      onUnlock();
    } catch (err) {
      setIsSubmitting(false);
      let msg = String(err);
      try {
        msg = err?.message || String(err);
      } catch {
        // noop
      }
      setError(msg);
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="doctor-modal"
        style={{ maxWidth: "420px", padding: "24px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                padding: "10px",
                borderRadius: "50%",
                background: "var(--colors-surface-soft)",
                border: "1px solid var(--colors-hairline)",
              }}
            >
              <Lock
                size={20}
                strokeWidth={1.75}
                style={{ color: "var(--colors-ink)" }}
              />
            </div>
          </div>
          <h2
            className="doctor-title"
            style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}
          >
            Desbloquear Almacenamiento
          </h2>
          <p
            style={{
              fontSize: "12.5px",
              fontFamily: "var(--font-mono)",
              color: "var(--colors-muted)",
              marginTop: "8px",
              lineHeight: "1.5",
            }}
          >
            Ingresa tu contraseña maestra derivada via Argon2id para descifrar
            tus credenciales y configuraciones.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div>
            <label
              style={{
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                color: "var(--colors-body-strong)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Contraseña Maestra
            </label>
            <input
              type="password"
              value={passphrase}
              onInput={(e) => setPassphrase(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="model-selector-select"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                color: "var(--colors-ink)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--colors-error)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <AlertTriangle size={14} strokeWidth={1.75} />
              <span>Error: {error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !passphrase.trim()}
            className="send-btn-stark"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "10px",
              fontSize: "13.5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--colors-primary)",
              color: "var(--colors-on-primary)",
              border: "none",
              borderRadius: "9999px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            <KeyRound size={14} strokeWidth={1.75} />
            {isSubmitting ? "Descifrando..." : "Desbloquear"}
          </button>
        </form>
      </div>
    </div>
  );
}
