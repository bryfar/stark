import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export function ChatView({ selectedModel, selectedProvider, agentMode, reasoning, setProposedEdit, setProposedCommand }) {
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: '¡Hola! Soy Crafter, tu agente ligero para Linux. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    async function loadSkills() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const list = await invoke('skills_list', { workspacePath: '/home/bryan/Downloads/Repos/crafter-repo' });
        setAvailableSkills(list);
      } catch (e) {
        setAvailableSkills([
          { name: 'to-spec', description: 'Generar especificaciones PRD' },
          { name: 'to-tickets', description: 'Generar tickets tracer-bullet' },
          { name: 'code-review', description: 'Revisión en 2 ejes Standards / Spec' },
          { name: 'implement', description: 'Desarrollar soluciones con TDD' }
        ]);
      }
    }
    loadSkills();
  }, []);

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

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`⚠️ El archivo ${file.name} excede el límite de 5MB`);
        return null;
      }
      return {
        name: file.name,
        size: Math.round(file.size / 1024) + ' KB',
        type: file.type || 'text/plain'
      };
    }).filter(Boolean);

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isLoading) return;

    let fullPrompt = input;
    if (selectedSkill) {
      fullPrompt = `[Skill Activa: /${selectedSkill.name}]\n${fullPrompt}`;
    }
    if (attachments.length > 0) {
      const attNames = attachments.map((a) => a.name).join(', ');
      fullPrompt += `\n\n[Adjuntos incluidos: ${attNames}]`;
    }

    const userMsg = { sender: 'user', text: fullPrompt };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const chatMessages = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      chatMessages.push({ role: 'user', content: fullPrompt });

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
      setTimeout(() => {
        const modeBadge = agentMode === 'plan' ? '[Modo Plan - Solo Análisis]' : '[Modo Build - Edición Disco]';
        const reasoningBadge = reasoning ? ' (con CoT Reasoning)' : '';
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `${modeBadge}${reasoningBadge}\nRespuesta de ${selectedProvider} (${selectedModel}):\n\nProcesé tu mensaje con los adjuntos y habilidades indicadas.`
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
              {agentMode === 'plan' ? 'Analizando en Modo Plan...' : 'Generando respuesta en Modo Build...'}
            </span>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        {/* Barra de Skills y Adjuntos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Skill:</span>
          <select
            style={{
              fontSize: '12px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#313244',
              color: '#cdd6f4',
              border: '1px solid #45475a'
            }}
            value={selectedSkill ? selectedSkill.name : ''}
            onChange={(e) => {
              const skill = availableSkills.find((s) => s.name === e.target.value);
              setSelectedSkill(skill || null);
            }}
          >
            <option value="">Ninguna skill seleccionada</option>
            {availableSkills.map((s) => (
              <option key={s.name} value={s.name}>
                /{s.name} — {s.description.slice(0, 35)}...
              </option>
            ))}
          </select>

          {attachments.map((att, i) => (
            <span key={i} style={{ fontSize: '11px', background: '#45475a', padding: '2px 6px', borderRadius: '4px', color: '#a6e3a1' }}>
              📄 {att.name} ({att.size})
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Modo: <strong>{agentMode.toUpperCase()}</strong> | Proveedor: <strong>{selectedProvider}</strong> ({selectedModel})</span>
          <span>Tokens gastados: <strong>{tokensUsed}</strong></span>
        </div>

        <div className="chat-input-box">
          <label style={{ cursor: 'pointer', padding: '6px 10px', fontSize: '16px', display: 'flex', alignItems: 'center' }}>
            📎
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".txt,.pdf,.log,.md,.js,.ts,.rs,.png,.jpg,.jpeg"
            />
          </label>

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
