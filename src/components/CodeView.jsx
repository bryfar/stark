import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import { CustomSelect } from './CustomSelect';
import { Folder, Plus, ArrowUp, Mic, ChevronUp } from 'lucide-react';

export function CodeView({ selectedModel, activeFile, onOpenModelSelector }) {
  const [logs, setLogs] = useState([]);

  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const [runLocation, setRunLocation] = useState('local');
  const [workDir, setWorkDir] = useState('~/workspace');
  const [extraFolders, setExtraFolders] = useState([]);
  const [selectedMode, setSelectedMode] = useState('manual');
  const [pendingMode, setPendingMode] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
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

  const handleRunCommand = async (cmdToRun) => {
    const commandText = cmdToRun || input;
    if (!commandText.trim()) return;

    setIsExecuting(true);
    setLogs((prev) => [
      ...prev,
      { type: 'command', text: `$ ${commandText} (${runLocation === 'ssh' ? 'SSH Host' : 'Local Sandbox'})` }
    ]);
    setInput('');
    setTokensUsed(prev => prev + Math.floor(commandText.length / 4) + 22);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (runLocation === 'ssh') {
        const res = await invoke('terminal_execute_ssh', {
          cmdStr: commandText,
          host: 'localhost',
          timeoutSecs: 30
        });
        setLogs((prev) => [
          ...prev,
          { type: res.exit_code === 0 ? 'success' : 'error', text: `SSH Exit Code ${res.exit_code} stdout: ${res.stdout}\nstderr: ${res.stderr}` }
        ]);
      } else {
        const res = await invoke('terminal_execute', {
          cmdStr: commandText,
          workspacePath: '/home/bryan/Downloads/Repos/crafter-repo',
          perimeterMode: true,
          timeoutSecs: 30
        });
        setLogs((prev) => [
          ...prev,
          { type: res.exit_code === 0 ? 'success' : 'error', text: `Local Exit Code ${res.exit_code} stdout: ${res.stdout}\nstderr: ${res.stderr}` }
        ]);
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: `Error: ${err}` }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([{ type: 'system', text: 'Consola limpiada.' }]);
  };

  const handleWorkDirClick = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true });
      if (selected) setWorkDir(selected);
    } catch (e) {
      setWorkDir('/mock/path/from/browser');
    }
  };

  const handleAddFolder = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true });
      if (selected && !extraFolders.includes(selected)) {
        setExtraFolders([...extraFolders, selected]);
      }
    } catch (e) {
      setExtraFolders([...extraFolders, '/mock/extra/path']);
    }
  };

  const modeOptions = [
    { value: 'manual', label: 'Manual' },
    { value: 'plan', label: 'Plan' },
    { value: 'accept-edits', label: 'Accept Edits' },
    { value: 'auto', label: 'Auto' },
    { value: 'bypass', label: 'Bypass Permissions' }
  ];

  const handleModeChange = (newMode) => {
    if (newMode === 'auto' || newMode === 'bypass') {
      setPendingMode(newMode);
    } else {
      setSelectedMode(newMode);
    }
  };

  const confirmMode = () => {
    setSelectedMode(pendingMode);
    setPendingMode(null);
  };
  
  const cancelMode = () => {
    setPendingMode(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--colors-canvas)', position: 'relative' }}>
      {/* Terminal Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: '700', color: 'var(--colors-ink)' }}>
            Sandbox Console Workbench
          </span>
          <span className="badge-offline" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
            Perímetro Activo
          </span>
          {activeFile && (
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>
              Focus: {activeFile}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-secondary" onClick={handleClearLogs} style={{ fontSize: '11.5px', padding: '4px 10px' }}>
            Limpiar Consola
          </button>
        </div>
      </div>

      {/* Console Log Display */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--colors-surface-dark)' }}>
        {logs.length === 0 && (
          <div style={{ color: 'var(--colors-muted)', textAlign: 'center', padding: '48px 0', lineHeight: '1.7' }}>
            Consola limpia.<br />Ejecuta un comando para comenzar.
          </div>
        )}
        {logs.map((l, i) => (
          <div
            key={i}
            style={{
              color: l.type === 'command' ? 'var(--colors-ink-deep)' : l.type === 'success' ? 'var(--colors-body-strong)' : 'var(--colors-muted)',
              lineHeight: '1.5',
              padding: l.type === 'command' ? '6px 10px' : '0',
              background: l.type === 'command' ? 'var(--colors-surface-dark-elevated)' : 'transparent',
              borderRadius: '4px',
              border: l.type === 'command' ? '1px solid var(--colors-hairline)' : 'none'
            }}
          >
            {l.text}
          </div>
        ))}

        {isExecuting && (
          <div style={{ color: 'var(--colors-body)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            Executing command in bwrap sandbox...
          </div>
        )}
      </div>

      {/* Prompt Container */}
      <div style={{ padding: '16px 20px', background: 'var(--colors-surface-soft)', borderTop: '1px solid var(--colors-hairline)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
        {/* Top Row */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
           {/* Segmented Toggle: Where Stark Run */}
           <div style={{ display: 'flex', background: 'var(--colors-surface-dark)', borderRadius: '4px', padding: '2px', border: '1px solid var(--colors-hairline)' }}>
             <button onClick={() => setRunLocation('local')} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '3px', background: runLocation === 'local' ? 'var(--colors-surface-card-border)' : 'transparent', color: runLocation === 'local' ? 'var(--colors-ink)' : 'var(--colors-muted)', cursor: 'pointer', border: 'none' }}>Local</button>
             <button onClick={() => setRunLocation('ssh')} style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '3px', background: runLocation === 'ssh' ? 'var(--colors-surface-card-border)' : 'transparent', color: runLocation === 'ssh' ? 'var(--colors-ink)' : 'var(--colors-muted)', cursor: 'pointer', border: 'none' }}>SSH</button>
           </div>
           
           {/* Work Directory */}
           <button onClick={handleWorkDirClick} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 8px' }}>
             <Folder size={14} strokeWidth={1.75} />
             {workDir}
           </button>
           
           {/* Add Folder */}
           <button onClick={handleAddFolder} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 8px' }}>
             <Plus size={14} strokeWidth={1.75} />
             Add folder
           </button>
                      {/* Dangerous Mode Badge */}
            {(selectedMode === 'auto' || selectedMode === 'bypass') && (
              <span style={{ marginLeft: 'auto', background: 'var(--colors-primary, #ffffff)', color: 'var(--colors-canvas, #1e1e1e)', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                {selectedMode === 'auto' ? 'Auto activo' : 'Bypass activo'}
              </span>
            )}
         </div>
         
         {/* Textarea Box */}
         <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--colors-surface-dark)', border: '1px solid var(--colors-hairline)', borderRadius: '6px' }}>
            <textarea
              value={input}
              onInput={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleRunCommand();
                }
              }}
              placeholder="Escribe una instrucción..."
              style={{ width: '100%', minHeight: '80px', padding: '12px', background: 'transparent', border: 'none', color: 'var(--colors-ink)', fontSize: '13px', fontFamily: 'var(--font-mono)', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
             <div style={{ padding: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="send-btn-stark" 
                onClick={() => handleRunCommand()} 
                disabled={isExecuting}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--colors-primary, #ffffff)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--colors-canvas, #1e1e1e)', padding: 0 }}
              >
                {isExecuting ? <span style={{ fontSize: '10px' }}>...</span> : <ArrowUp size={16} strokeWidth={1.75} />}
              </button>
             </div>
          </div>
          
          {/* Bottom Row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
               <CustomSelect 
                 options={modeOptions} 
                 value={selectedMode} 
                 onChange={handleModeChange} 
                 compact 
               />
               <button className="btn-secondary" style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Plus size={16} strokeWidth={1.75} />
               </button>
               <button 
                 onClick={handleMicClick}
                 className="btn-secondary" 
                 style={{ 
                   padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                   background: isRecording ? 'var(--colors-primary, #ffffff)' : 'transparent',
                   color: isRecording ? 'var(--colors-canvas, #1e1e1e)' : 'inherit'
                 }}
                 title={isRecording ? "Detener grabación y transcribir" : "Instala whisper para dictado"}
               >
                 <Mic size={16} strokeWidth={1.75} style={{ color: isRecording ? 'var(--colors-canvas, #1e1e1e)' : 'inherit' }} />
               </button>
             </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>
                Tokens: {tokensUsed}
              </span>
              <button 
                 onClick={onOpenModelSelector}
                 className="btn-secondary"
                 style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                 {selectedModel || 'Select model'} <ChevronUp size={12} />
              </button>
            </div>
        </div>
      </div>

      {pendingMode && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--colors-surface-soft)', padding: '20px', borderRadius: '8px', border: '1px solid var(--colors-hairline)', maxWidth: '300px' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--colors-ink)', lineHeight: '1.4' }}>
              Vas a permitir que Stark ejecute sin aprobaciones. ¿Continuar?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={cancelMode} style={{ padding: '6px 12px', cursor: 'pointer' }}>Cancelar</button>
              <button className="send-btn-stark" onClick={confirmMode} style={{ padding: '6px 12px', cursor: 'pointer' }}>Continuar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
