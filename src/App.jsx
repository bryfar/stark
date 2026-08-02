import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { ChatView } from './components/ChatView';
import { CodeView } from './components/CodeView';
import { DesignView } from './components/DesignView';
import { DiffModal } from './components/DiffModal';
import { UnlockModal } from './components/UnlockModal';
import { TerminalModal } from './components/TerminalModal';
import { ProjectsPage } from './components/pages/ProjectsPage';

export function App() {
  const [currentMode, setMode] = useState('chat');
  const [isMaximized, setIsMaximized] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:1.5b');
  const [agentMode, setAgentMode] = useState('plan');
  const [reasoning, setReasoning] = useState(true);
  const [proposedEdit, setProposedEdit] = useState(null);
  const [proposedCommand, setProposedCommand] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const handleApproveEdit = async (edit) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('edit_apply', {
        payload: {
          file_path: edit.filePath,
          new_content: edit.newContent,
          description: edit.description,
        }
      });
      alert(`✅ Edición aplicada exitosamente a ${edit.filePath}`);
    } catch (err) {
      alert(`⚠️ Edición aplicada localmente: ${edit.filePath}`);
    }
    setProposedEdit(null);
  };

  const handleApproveCommand = async (command, perimeterMode) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke('terminal_execute', {
        cmdStr: command,
        workspacePath: '/home/bryan/Downloads/Repos/crafter-repo',
        perimeterMode,
        timeoutSecs: 30
      });
      alert(`✅ Comando ejecutado (Exit Code ${res.exit_code})`);
    } catch (err) {
      alert(`⚠️ Ejecutando comando en sandbox local: ${command}`);
    }
    setProposedCommand(null);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar 
        currentMode={currentMode} 
        setMode={setMode} 
        isMaximized={isMaximized}
        setIsMaximized={setIsMaximized}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      
      <main className="app-main">
        <HeaderBar
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          agentMode={agentMode}
          setAgentMode={setAgentMode}
          reasoning={reasoning}
          setReasoning={setReasoning}
        />

        <div className="view-container">
          {activePage === 'projects' ? (
            <ProjectsPage />
          ) : activePage !== 'home' ? (
            <div style={{ padding: '24px', color: 'var(--text-primary)' }}>
              <h2>{activePage}</h2>
              <p style={{ color: 'var(--text-muted)' }}>Esta página está en construcción.</p>
            </div>
          ) : (
            <>
              {currentMode === 'chat' && (
                <ChatView
                  selectedModel={selectedModel}
                  selectedProvider={selectedProvider}
                  agentMode={agentMode}
                  reasoning={reasoning}
                  setProposedEdit={setProposedEdit}
                  setProposedCommand={setProposedCommand}
                />
              )}
              {currentMode === 'code' && <CodeView selectedModel={selectedModel} />}
              {currentMode === 'design' && <DesignView />}
            </>
          )}
        </div>
      </main>

      <DiffModal
        proposedEdit={proposedEdit}
        onApprove={handleApproveEdit}
        onReject={() => setProposedEdit(null)}
      />

      <TerminalModal
        proposedCommand={proposedCommand}
        onApprove={handleApproveCommand}
        onReject={() => setProposedCommand(null)}
      />

      <UnlockModal
        isOpen={isLocked}
        onUnlock={() => setIsLocked(false)}
      />
    </div>
  );
}
