import { h } from "preact";
import {
  Rocket,
  ArrowRight,
  X,
  Zap,
  HardDrive,
  Cloud,
  MapPin,
  Globe,
} from "lucide-react";

export function GettingStartedModal({
  isOpen,
  onClose,
  onConnectProvider,
  ollamaInstalled = false,
}) {
  if (!isOpen) return null;

  const handleConnect = () => {
    onClose();
    onConnectProvider();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="doctor-modal"
        style={{ maxWidth: "540px", padding: "0", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 28px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "var(--colors-surface-dark)",
                border: "1px solid var(--colors-hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Rocket
                size={18}
                strokeWidth={1.75}
                style={{ color: "var(--colors-ink)" }}
              />
            </div>
            <h2
              className="doctor-title"
              style={{ margin: 0, fontSize: "18px" }}
            >
              Como empezar
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--colors-muted)",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "0 28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Card 1: Ollama local */}
          <div
            style={{
              padding: "16px",
              background: "var(--colors-surface-dark)",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <HardDrive
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--colors-primary)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--colors-ink)",
                }}
              >
                Ollama local - ilimitado y sin internet
              </span>
            </div>
            <p
              style={{
                margin: "0 0 8px 0",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--colors-body)",
                lineHeight: "1.6",
              }}
            >
              {ollamaInstalled
                ? "Ollama detectado. Elige un modelo local en el selector y corre sin limite ni cuota."
                : "Instala Ollama para correr modelos localmente. Sin cuota diaria, sin internet, 100 por ciento privado."}
            </p>
            {!ollamaInstalled && (
              <code
                style={{
                  display: "block",
                  background: "var(--colors-surface-dark-elevated)",
                  border: "1px solid var(--colors-hairline)",
                  borderRadius: "4px",
                  padding: "8px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--colors-body-strong)",
                }}
              >
                curl -fsSL https://ollama.com/install.sh | sh
              </code>
            )}
          </div>

          {/* Card 2: Modelos gratuitos incluidos */}
          <div
            style={{
              padding: "16px",
              background: "var(--colors-surface-dark)",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Zap
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--colors-ink)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--colors-ink)",
                }}
              >
                Modelos gratuitos por API
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "var(--colors-body)",
                lineHeight: "1.6",
              }}
            >
              Crafter agrupa docenas de modelos gratuitos via OpenRouter,
              OpenCode Zen y Pollinations. Crea una cuenta gratuita y guarda tu
              API key en el selector de modelos. Te limita a 10.000 tokens al
              dia en el tier gratuito.
            </p>
          </div>

          {/* Card 3: Gateways */}
          <div
            style={{
              padding: "16px",
              background: "var(--colors-surface-dark)",
              border: "1px solid var(--colors-hairline)",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Globe
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--colors-body)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--colors-ink)",
                }}
              >
                Gateways y proveedores
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <MapPin
                size={13}
                strokeWidth={1.75}
                style={{ color: "var(--colors-body)" }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--colors-body)",
                }}
              >
                OpenRouter, OpenCode Zen, Pollinations, OpenAI, Anthropic,
                Gemini, Groq, Mistral, LM Studio, Ollama.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 28px 20px",
            borderTop: "1px solid var(--colors-hairline)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleConnect}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              fontSize: "12.5px",
              fontWeight: "600",
              background: "var(--colors-primary)",
              color: "var(--colors-canvas)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              transition: "all var(--transition-fast)",
            }}
          >
            Conectar proveedor
            <ArrowRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}
