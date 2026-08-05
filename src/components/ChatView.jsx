import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { Paperclip, Sparkles, Send, Brain, ChevronDown, ChevronUp, Cpu, X, Settings2, Image as ImageIcon, Video, Presentation, Mic, ArrowUp, Plus } from 'lucide-react';
import { Logo } from './Logo';
import { CustomSelect } from './CustomSelect';
import { translations } from '../i18n';

export function ChatView({
  selectedModel,
  setSelectedModel,
  selectedProvider,
  setSelectedProvider,
  agentMode,
  setAgentMode,
  reasoning,
  setReasoning,
  setProposedEdit,
  setProposedCommand,
  providersConfig,
  onOpenProviderManager,
  onOpenModelSelector,
  activeChatId,
  messages,
  onMessagesChange,
  onEnsureChat,
  onSetChatTitle,
  lang = 'es'
}) {
  const t = translations[lang] ? translations[lang].chat : translations.es.chat;
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [openThinkingIdx, setOpenThinkingIdx] = useState({});
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dropupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (isDropupOpen && dropupRef.current && !dropupRef.current.contains(e.target)) {
        setIsDropupOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropupOpen]);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = reader.result.split(',')[1];
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            const text = await invoke('voice_transcribe', { audioBase64: base64Data });
            setInput(prev => prev ? `${prev} ${text}` : text);
          } catch (e) {
            alert(e);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const chatIdRef = useRef(activeChatId);
  useEffect(() => {
    chatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    setInput('');
    setAttachments([]);
    setTokensUsed(0);
    setSelectedSkill(null);
  }, [activeChatId]);

  useEffect(() => {
    async function loadSkills() {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const list = await invoke('skills_list', { workspacePath: '/home/bryan/Downloads/Repos/crafter-repo' });
        setAvailableSkills(list);
      } catch (e) {
        setAvailableSkills([
          { name: 'design-md', description: 'Analizar y sintetizar sistemas de diseño' },
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
            onMessagesChange(chatIdRef.current, (prev) => {
              const list = prev || [];
              const last = list[list.length - 1];
              if (last && last.sender === 'assistant' && last.isStreaming) {
                return [
                  ...list.slice(0, -1),
                  { ...last, text: last.text + payload.token }
                ];
              }
              return [
                ...list,
                { sender: 'assistant', text: payload.token, isStreaming: true }
              ];
            });
          }

          if (payload.usage) {
            setTokensUsed((prev) => prev + payload.usage.total_tokens);
          }

          if (payload.error) {
            onMessagesChange(chatIdRef.current, (prev) => [
              ...(prev || []),
              { sender: 'assistant', text: `Error: ${payload.error}` }
            ]);
            setIsLoading(false);
          }

          if (payload.done) {
            onMessagesChange(chatIdRef.current, (prev) => {
              const list = prev || [];
              const last = list[list.length - 1];
              if (last && last.isStreaming) {
                return [...list.slice(0, -1), { ...last, isStreaming: false }];
              }
              return list;
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
        alert(`El archivo ${file.name} excede el límite de 5MB`);
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

  const toggleThinking = (idx) => {
    setOpenThinkingIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
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

    const chatId = activeChatId || onEnsureChat();

    const userMsg = { sender: 'user', text: fullPrompt };
    onMessagesChange(chatId, (prev) => [...(prev || []), userMsg]);
    if (!(messages || []).some((m) => m.sender === 'user')) {
      onSetChatTitle(chatId, fullPrompt.replace(/\s*\n\s*/g, ' ').slice(0, 42));
    }
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const chatMessages = (messages || []).map((m) => ({
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
        const modeBadge = agentMode === 'plan' ? 'Modo Plan - Análisis' : 'Modo Build - Edición Disco';
        const reasoningContent = reasoning
          ? `CoT Reasoning (Pasos de Razonamiento):\n1. Inspección del contexto del prompt.\n2. Selección de la estrategia en ${modeBadge}.\n3. Generación de respuesta optimizada para ${selectedProvider} (${selectedModel}).`
          : null;

        onMessagesChange(chatId, (prev) => [
          ...(prev || []),
          {
            sender: 'assistant',
            thinking: reasoningContent,
            text: `**${modeBadge}**\nRespuesta generada para tu solicitud con el proveedor **${selectedProvider}** (${selectedModel}).\n\n¿Quieres que prepare una edición en el workspace o ejecute un test en la terminal sandbox?`,
            actions: agentMode === 'build' ? [
              {
                label: 'Ver Diff Propuesto',
                type: 'edit',
                edit: {
                  filePath: 'src/App.jsx',
                  originalContent: '// Archivo original',
                  newContent: '// Archivo modificado por Stark',
                  description: 'Actualizar integración de UI de Stark Design System'
                }
              },
              {
                label: 'Iniciar Terminal Sandbox',
                type: 'command',
                command: {
                  command: 'npm run dev',
                  workspacePath: '/home/bryan/Downloads/Repos/crafter-repo'
                }
              }
            ] : []
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

  const isLocal = selectedProvider === 'ollama';

  const providerOptions = providersConfig && providersConfig.length > 0
    ? providersConfig.map((p) => ({ value: p.id, label: p.name }))
    : [
      { value: 'ollama', label: 'Ollama Local' },
      { value: 'anthropic', label: 'Anthropic API' },
      { value: 'openai', label: 'OpenAI API' },
      { value: 'gemini', label: 'Google Gemini' }
    ];

  const activeProviderConfig = (providersConfig || []).find((p) => p.id === selectedProvider);
  const providerModels = activeProviderConfig ? activeProviderConfig.models : [];

  const modelOptions = providerModels.length > 0
    ? providerModels.map((m) => ({ value: m, label: m }))
    : selectedProvider === 'ollama' ? [
      { value: 'qwen2.5:1.5b', label: 'Qwen 2.5 1.5B' },
      { value: 'llama3.2:3b', label: 'Llama 3.2 3B' },
      { value: 'phi3:mini', label: 'Phi-3 Mini' },
      { value: 'deepseek-coder:6.7b', label: 'DeepSeek 6.7B' }
    ] : selectedProvider === 'anthropic' ? [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
    ] : selectedProvider === 'openai' ? [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'o1-mini', label: 'o1-mini' }
    ] : [
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
    ];

  const handleProviderChange = (prov) => {
    setSelectedProvider(prov);
    const cfg = (providersConfig || []).find((p) => p.id === prov);
    if (cfg && cfg.models && cfg.models.length > 0) {
      setSelectedModel(cfg.models[0]);
    } else if (prov === 'ollama') setSelectedModel('qwen2.5:1.5b');
    else if (prov === 'anthropic') setSelectedModel('claude-3-5-sonnet-20241022');
    else if (prov === 'openai') setSelectedModel('gpt-4o');
    else if (prov === 'gemini') setSelectedModel('gemini-1.5-flash');
  };

  const skillOptions = [
    { value: '', label: 'Skill: Seleccionar' },
    ...availableSkills.map((s) => ({
      value: s.name,
      label: `/${s.name} — ${s.description.slice(0, 22)}`
    }))
  ];

  const pluginInjectors = [
    { label: 'Plugin UI', icon: Sparkles, stub: 'Diseña un prototipo interactivo de componente UI con métricas en vivo...' },
    { label: 'Plugin Image', icon: ImageIcon, stub: 'Genera un wireframe visual de baja fidelidad en estilo plano azul blueprint...' },
    { label: 'Plugin Video', icon: Video, stub: 'Añade animaciones CSS y micro-interacciones de entrada al componente...' },
    { label: 'Plugin Deck', icon: Presentation, stub: 'Genera una presentación ejecutiva de 4 diapositivas en relación 16:9...' }
  ];

  return (
    <div className="chat-wrapper">
      <div className="messages-list">
        {messages.length === 0 && !isLoading && (
          <div className="chat-empty-state">
            <Logo size={84} />
            <h1 className="app-brand-wordmark">Stark</h1>
            <span style={{ fontSize: '13px', color: 'var(--colors-muted)', fontFamily: 'var(--font-mono)' }}>
              {t.subtitle}
            </span>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message-bubble ${msg.sender}`}>
            {/* Thinking Accordion */}
            {msg.thinking && (
              <div className="thinking-block">
                <div className="thinking-header" onClick={() => toggleThinking(idx)}>
                  <Brain size={14} strokeWidth={1.75} style={{ color: 'var(--colors-body-strong)' }} />
                  <span>{t.reasoning} (CoT)</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
                    {openThinkingIdx[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                </div>
                {openThinkingIdx[idx] && (
                  <div className="thinking-content">
                    {msg.thinking}
                  </div>
                )}
              </div>
            )}

            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

            {/* Interactive Action Buttons */}
            {msg.actions && msg.actions.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {msg.actions.map((act, aIdx) => (
                  <button
                    key={aIdx}
                    className="btn-secondary"
                    onClick={() => {
                      if (act.type === 'edit') setProposedEdit(act.edit);
                      else if (act.type === 'command') setProposedCommand(act.command);
                    }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="message-bubble assistant">
            <div className="thinking-block">
              <div className="thinking-header">
                <Brain size={14} strokeWidth={1.75} />
                <span>{lang === 'es' ? 'Razonando respuesta en' : 'Reasoning response in'} {agentMode === 'plan' ? t.planMode : t.buildMode}...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Hero Studio Prompt Container */}
      <div className="chat-input-container">
        {/* Floating Card */}
        <div className="chat-input-card">
          {/* Top Control Bar inside Prompt Container */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--colors-hairline)', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={onOpenModelSelector}
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {selectedModel || t.noModel} <ChevronUp size={14} />
              </button>


              <span className={isLocal ? 'badge-offline' : 'badge-cloud'} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={12} strokeWidth={1.75} />
                <span>{isLocal ? 'Offline' : 'Cloud'}</span>
              </span>
            </div>

            </div>

          {/* Main Prompt Textarea */}
          <textarea
            className="chat-textarea"
            placeholder={agentMode === 'plan' 
              ? (lang === 'es' ? '¿Qué quieres diseñar o analizar hoy? Escribe una consulta o instrucción...' : 'What do you want to design or analyze today? Type a query or instruction...')
              : (lang === 'es' ? 'Describe la modificación de código para editar a disco en Stark...' : 'Describe the code modification to write to disk in Stark...')}
            value={input}
            onInput={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />

          {/* Active Skill & Attachments Pills removed from here */}

          {/* Bottom Toolbar inside Prompt Container */}
          <div className="chat-input-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div 
                ref={dropupRef} 
                style={{ position: 'relative' }}
                onMouseLeave={() => setIsDropupOpen(false)}
              >
                <button 
                   onClick={() => setIsDropupOpen(!isDropupOpen)}
                   style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--colors-surface-dark-elevated)', border: '1px solid var(--colors-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--colors-ink)' }}
                >
                  <Plus size={16} strokeWidth={1.75} />
                </button>
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => { handleFileUpload(e); setIsDropupOpen(false); }}
                  accept=".txt,.pdf,.log,.md,.js,.ts,.rs,.png,.jpg,.jpeg"
                />

                {isDropupOpen && (
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, background: 'var(--colors-surface-dark-elevated)', border: '1px solid var(--colors-hairline)', borderRadius: '8px', padding: '6px', minWidth: '160px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <button 
                       onClick={() => { fileInputRef.current?.click(); }}
                       style={{ background: 'transparent', border: 'none', padding: '6px 8px', textAlign: 'left', cursor: 'pointer', color: 'var(--colors-ink)', fontSize: '12px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                    >
                      <Paperclip size={14} style={{ marginRight: '6px' }} /> {lang === 'es' ? 'Adjuntar archivos' : 'Attach files'}
                    </button>
                    
                    <div style={{ fontSize: '11px', color: 'var(--colors-muted)', padding: '4px 8px', marginTop: '4px', borderTop: '1px solid var(--colors-hairline)' }}>Skills</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '120px', overflowY: 'auto' }}>
                      {availableSkills.map(s => (
                         <button 
                           key={s.name}
                           onClick={() => { setSelectedSkill(s); setIsDropupOpen(false); }}
                           style={{ background: 'transparent', border: 'none', padding: '6px 8px', textAlign: 'left', cursor: 'pointer', color: 'var(--colors-ink)', fontSize: '12px', borderRadius: '4px' }}
                         >
                            {"/"}{s.name}
                         </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mode-toggle-group" style={{ margin: 0 }}>
                <button
                  className={`btn-mode-toggle ${agentMode === 'plan' ? 'active' : ''}`}
                  onClick={() => setAgentMode('plan')}
                >
                  {t.planMode}
                </button>
                <button
                  className={`btn-mode-toggle ${agentMode === 'build' ? 'active' : ''}`}
                  onClick={() => setAgentMode('build')}
                >
                  {t.buildMode}
                </button>
              </div>

              <button
                onClick={() => setReasoning(!reasoning)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  fontSize: '12px', padding: '4px 8px', borderRadius: '16px',
                  background: reasoning ? 'var(--colors-surface-dark-elevated)' : 'transparent',
                  border: reasoning ? '1px solid var(--colors-hairline-strong)' : '1px solid transparent',
                  color: reasoning ? 'var(--colors-ink)' : 'var(--colors-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <Brain size={14} strokeWidth={1.75} />
                CoT
              </button>

              {selectedSkill && (
                <span style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', background: 'var(--colors-surface-dark-elevated)', color: 'var(--colors-ink-deep)', padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--colors-hairline-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={12} strokeWidth={1.75} />
                  <span>{"/"}{selectedSkill.name}</span>
                  <button onClick={() => setSelectedSkill(null)} style={{ background: 'transparent', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </span>
              )}
              {attachments.map((att, i) => (
                <span key={i} style={{ fontSize: '11.5px', fontFamily: 'var(--font-mono)', background: 'var(--colors-surface-dark-elevated)', color: 'var(--colors-ink)', padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--colors-hairline)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Doc: {att.name}</span>
                  <button onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer', display: 'flex' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>
                 Tokens: {tokensUsed}
               </span>
               {input.trim() === '' ? (
                 <button 
                   onClick={handleMicClick}
                   style={{ 
                     width: '32px', height: '32px', borderRadius: '50%', 
                     background: isRecording ? 'var(--colors-primary, #ffffff)' : 'transparent', 
                     border: '1px solid var(--colors-hairline)', 
                     display: 'flex', alignItems: 'center', justifyContent: 'center', 
                     cursor: 'pointer', color: isRecording ? 'var(--colors-canvas, #1e1e1e)' : 'var(--colors-ink)'
                   }}
                   title={isRecording ? (lang === 'es' ? "Detener grabación y transcribir" : "Stop recording and transcribe") : (lang === 'es' ? "Instala whisper para dictado" : "Install whisper for dictation")}
                 >
                   <Mic size={16} strokeWidth={1.75} style={{ color: isRecording ? 'var(--colors-canvas, #1e1e1e)' : 'inherit' }} />
                 </button>
               ) : (
                 <button 
                   onClick={handleSend}
                   disabled={isLoading}
                   style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--colors-primary, #ffffff)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--colors-canvas, #1e1e1e)' }}
                 >
                   {isLoading ? <span style={{ fontSize: '10px' }}>...</span> : <ArrowUp size={16} strokeWidth={1.75} />}
                 </button>
               )}
            </div>
          </div>
        </div>

        {input.trim() === '' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '14px' }}>
            {pluginInjectors.map((plug, pIdx) => {
              const IconComp = plug.icon;
              return (
                <button
                  key={pIdx}
                  className="suggestion-chip"
                  onClick={() => setInput(plug.stub)}
                >
                  <IconComp size={13} strokeWidth={1.75} style={{ color: 'var(--colors-muted)' }} />
                  <span>{plug.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
