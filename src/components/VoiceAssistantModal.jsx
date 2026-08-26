import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Settings,
} from "lucide-react";

export function VoiceAssistantModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [status, setStatus] = useState("listening"); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [micActive, setMicActive] = useState(true);
  const [soundActive, setSoundActive] = useState(true);
  const [transcript, setTranscript] = useState([
    { role: "user", content: "Hola, ¿puedes ayudarme con el código de Tauri?" },
    {
      role: "assistant",
      content:
        "¡Claro! Puedo ayudarte a depurar tus comandos de Tauri en Rust o a integrar el frontend de Preact. ¿Qué necesitas específicamente?",
    },
  ]);

  // Auto-scroll transcript container
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Simulate speaking/thinking states for UI demonstration
  useEffect(() => {
    if (status === "thinking") {
      const t = setTimeout(() => {
        setStatus("speaking");
        setTranscript((prev) => [
          ...prev,
          { role: "user", content: "Muéstrame un ejemplo de struct." },
        ]);
      }, 2000);
      return () => clearTimeout(t);
    } else if (status === "speaking") {
      const t = setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Aquí tienes un ejemplo de struct en Rust...",
          },
        ]);
        setStatus("listening");
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div
      className="voice-modal-backdrop"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-mono, monospace)",
        color: "#ffffff",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 32px",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Sparkles size={18} strokeWidth={1.75} style={{ color: "#888" }} />
          <span
            style={{ fontSize: "14px", letterSpacing: "0.05em", color: "#888" }}
          >
            STARK // VOICE_ASSISTANT
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="hover-white"
        >
          <X size={24} strokeWidth={1.75} />
        </button>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          position: "relative",
        }}
      >
        {/* Dynamic Voice Visualizer Wave */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "200px",
            width: "100%",
            marginBottom: "40px",
          }}
        >
          {status === "listening" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{
                    width: "4px",
                    height: "24px",
                    backgroundColor: "#ffffff",
                    animation: `pulseWave ${1 + (i % 3) * 0.3}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          )}
          {status === "thinking" && (
            <div
              style={{
                width: "48px",
                height: "48px",
                border: "2px solid #333",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          {status === "speaking" && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{
                    width: "4px",
                    height: "16px",
                    backgroundColor: "#ffffff",
                    animation: `pulseVoice ${0.5 + (i % 4) * 0.2}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div
          style={{
            fontSize: "12px",
            color: "#888",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          {status === "listening" && "Escuchando..."}
          {status === "thinking" && "Procesando respuesta..."}
          {status === "speaking" && "Asistente hablando"}
        </div>

        {/* Live Transcript Panel */}
        <div
          ref={scrollRef}
          style={{
            width: "100%",
            maxWidth: "640px",
            height: "220px",
            overflowY: "auto",
            border: "1px solid #1a1a1a",
            borderRadius: "4px",
            padding: "16px",
            backgroundColor: "#050505",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            scrollbarWidth: "none",
            fontSize: "13px",
            lineHeight: "1.6",
          }}
        >
          {transcript.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                color: msg.role === "user" ? "#888" : "#fff",
                textAlign: msg.role === "user" ? "right" : "left",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#555",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {msg.role === "user" ? "TÚ" : "STARK"}
              </span>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "32px",
          borderTop: "1px solid #1a1a1a",
          gap: "24px",
        }}
      >
        {/* Toggle Sound Output */}
        <button
          onClick={() => setSoundActive(!soundActive)}
          style={{
            background: "#111",
            border: "1px solid #222",
            color: soundActive ? "#fff" : "#ef4444",
            cursor: "pointer",
            padding: "12px",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="control-btn"
        >
          {soundActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        {/* Big Mic Button (Center) */}
        <button
          onClick={() => {
            const nextMic = !micActive;
            setMicActive(nextMic);
            if (nextMic) {
              setStatus("listening");
            } else {
              setStatus("thinking");
            }
          }}
          style={{
            background: micActive ? "#ffffff" : "#111",
            border: micActive ? "none" : "1px solid #222",
            color: micActive ? "#000000" : "#ef4444",
            cursor: "pointer",
            padding: "16px",
            borderRadius: "50%",
            width: "64px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: micActive ? "0 0 20px rgba(255,255,255,0.2)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          {micActive ? <Mic size={28} /> : <MicOff size={28} />}
        </button>

        {/* Voice Settings */}
        <button
          style={{
            background: "#111",
            border: "1px solid #222",
            color: "#888",
            cursor: "pointer",
            padding: "12px",
            borderRadius: "50%",
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="control-btn hover-white"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Embedded Animations Style */}
      <style>{`
        .hover-white:hover {
          color: #ffffff !important;
        }
        .control-btn:hover {
          background-color: #1a1a1a !important;
          border-color: #333 !important;
        }
        @keyframes pulseWave {
          0%, 100% { height: 12px; opacity: 0.4; }
          50% { height: 48px; opacity: 1; }
        }
        @keyframes pulseVoice {
          0%, 100% { height: 8px; }
          50% { height: 64px; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
