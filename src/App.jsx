import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { ChatView } from './components/ChatView';
import { CodeView } from './components/CodeView';
import { DesignView } from './components/DesignView';
import { DiffModal } from './components/DiffModal';
import { UnlockModal } from './components/UnlockModal';

export function App() {
  const [currentMode, setMode] = useState('chat');
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:1.5b');
  const [agentMode, setAgentMode] = useState('plan');
  const [reasoning, setReasoning] = useState(true);
  const [proposedEdit, setProposedEdit] = useState(null);
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

  const handleRejectEdit = () => {
    setProposedEdit(null);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar currentMode={currentMode} setMode={setMode} />
      
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
          {currentMode === 'chat' && (
            <ChatView
              selectedModel={selectedModel}
              selectedProvider={selectedProvider}
              agentMode={agentMode}
              reasoning={reasoning}
              setProposedEdit={setProposedEdit}
            />
          )}
          {currentMode === 'code' && <CodeView selectedModel={selectedModel} />}
          {currentMode === 'design' && <DesignView />}
        </div>
      </main>

      <DiffModal
        proposedEdit={proposedEdit}
        onApprove={handleApproveEdit}
        onReject={handleRejectEdit}
      />

      <UnlockModal
        isOpen={isLocked}
        onUnlock={() => setIsLocked(false)}
      />
    </div>
  );
}
