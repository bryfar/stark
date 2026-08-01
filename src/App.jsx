import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { ChatView } from './components/ChatView';
import { CodeView } from './components/CodeView';
import { DesignView } from './components/DesignView';

export function App() {
  const [currentMode, setMode] = useState('chat');
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('qwen2.5:1.5b');
  const [agentMode, setAgentMode] = useState('plan');
  const [reasoning, setReasoning] = useState(true);

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
            />
          )}
          {currentMode === 'code' && <CodeView selectedModel={selectedModel} />}
          {currentMode === 'design' && <DesignView />}
        </div>
      </main>
    </div>
  );
}
