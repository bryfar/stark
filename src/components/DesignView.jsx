import { h } from 'preact';
import { useState } from 'preact/hooks';

export function DesignView() {
  const [htmlCode, setHtmlCode] = useState(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0f172a; color: #fff; }
    .card { background: #1e293b; padding: 24px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; border: 1px solid #334155; }
    button { background: #8b5cf6; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🎨 Crafter Design Canvas</h2>
    <p>Visualiza en vivo los componentes UI generados por el agente.</p>
    <button onclick="alert('¡Componente Interactivo!')">Probar Botón</button>
  </div>
</body>
</html>`);

  const [prompt, setPrompt] = useState('');

  const handleGenerateUI = () => {
    if (!prompt.trim()) return;
    setHtmlCode(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #064e3b; color: #ecfdf5; }
    .box { background: #065f46; padding: 32px; border-radius: 16px; border: 1px solid #10b981; text-align: center; }
    h1 { margin-top: 0; font-size: 24px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>✨ Generado: ${prompt}</h1>
    <p>Diseño de componente estilizado y adaptado dinámicamente.</p>
  </div>
</body>
</html>`);
    setPrompt('');
  };

  return (
    <div className="design-wrapper">
      <div className="design-chat-panel">
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', fontWeight: '600', fontSize: '14px' }}>
          Asistente de Diseño UI
        </div>
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Pide cualquier interfaz, botón o layout en HTML/CSS para previsualizarlo en tiempo real en el lienzo de la derecha.
        </div>
        <div className="chat-input-container">
          <div className="chat-input-box">
            <textarea
              className="chat-textarea"
              placeholder="Describe el diseño UI deseado..."
              value={prompt}
              onInput={(e) => setPrompt(e.target.value)}
            />
            <button className="send-btn" onClick={handleGenerateUI}>Generar</button>
          </div>
        </div>
      </div>

      <div className="design-preview-panel">
        <div className="preview-bar">
          <span>Lienzo Aislado (Iframe Sandbox)</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span>Desktop 100%</span>
          </div>
        </div>
        <iframe
          className="preview-iframe"
          sandbox="allow-scripts"
          srcDoc={htmlCode}
          title="Design Preview"
        />
      </div>
    </div>
  );
}
