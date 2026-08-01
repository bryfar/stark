import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export function ChatView({ selectedModel, selectedProvider, agentMode, reasoning }) {
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: '¡Hola! Soy Crafter, tu agente ligero para Linux. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);

  useEffect(() => {
    let unlisten;
    async function setupListener() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen('chat-token', (event) => {
          const payload = event.payload;
          if (payload.token) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'assistant' && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + payload.token }
                ];
              } else {
                return [
                  ...prev,
                  { sender: 'assistant', text: payload.token, isStreaming: true }
                ];
              }
            });
          }

          if (payload.usage) {
            setTokensUsed((prev) => prev + payload.usage.total_tokens);
          }

          if (payload.error) {
            setMessages((prev) => [
              ...prev,
              { sender: 'assistant', text: `⚠️ Error: ${payload.error}` }
            ]);
            setIsLoading(false);
          }

          if (payload.done) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.isStreaming) {
                return [...prev.slice(0, -1), { ...last, isStreaming: false }];
              }
              return prev;
            });
            setIsLoading(false);
          }
        });
      } catch (e) {
        // Fallback for browser mode
      }
    }
    setupListener();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { sender: 'user', text: input };
    const currentInput = input;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const chatMessages = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      chatMessages.push({ role: 'user', content: currentInput });

      await invoke('send_chat_message', {
        payload: {
          provider: selectedProvider,
          model: selectedModel,
          messages: chatMessages,
          reasoning: reasoning,
          api_key: null
        }
      });
    } catch (err) {
      // Browser fallback simulation if not inside Tauri window
      setTimeout(() => {
        const modeBadge = agentMode === 'plan' ? '[Modo Plan - Solo Análisis]' : '[Modo Build - Edición Disco]';
        const reasoningBadge = reasoning ? ' (con CoT Reasoning)' : '';
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `${modeBadge}${reasoningBadge}\nRespuesta de ${selectedProvider} (${selectedModel}):\n\nRecibí tu consulta: "${currentInput}". La inferencia local está lista.`
          }
        ]);
        setIsLoading(false);
      }, 500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-wrapper">
      <div className="messages-list">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-bubble ${msg.sender}`}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="message-bubble assistant">
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {agentMode === 'plan' ? 'Analizando en Modo Plan...' : 'Generando propuesta en Modo Build...'}
            </span>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Modo: <strong>{agentMode.toUpperCase()}</strong> | Proveedor: <strong>{selectedProvider}</strong> ({selectedModel})</span>
          <span>Tokens gastados: <strong>{tokensUsed}</strong></span>
        </div>

        <div className="chat-input-box">
          <textarea
            className="chat-textarea"
            placeholder={agentMode === 'plan' ? 'Pide un diagnóstico o plan de arquitectura...' : 'Pide una modificación o edición de código...'}
            value={input}
            onInput={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="send-btn" onClick={handleSend} disabled={isLoading}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
