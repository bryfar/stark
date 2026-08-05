import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { Monitor, Tablet, Smartphone, Code2, Eye, Copy, Download, RotateCcw, Check, Sparkles, Crosshair, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export function DesignView({ htmlCode, activePreset, activePage, onSelectPreset, onResetPreset, artifactType, onElementPicked }) {
  const [viewportMode, setViewportMode] = useState('desktop');
  const [viewTab, setViewTab] = useState('canvas');
  const [copied, setCopied] = useState(false);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [pickedElement, setPickedElement] = useState(null);
  const iframeRef = useRef(null);
  const totalSlides = 4;

  const pickerScript = `
    <style>
      .cd-pick-highlight {
        outline: 2px dashed #18181b !important;
        outline-offset: 1px !important;
        background: rgba(0, 0, 0, 0.05) !important;
      }
      .cd-pick-active * { cursor: crosshair !important; }
      .cd-pick-active { user-select: none !important; }
    </style>
    <script>
      (function() {
        if (window.__cdPickerReady) return;
        window.__cdPickerReady = true;
        var current = null;
        function clearHighlight() {
          if (current) {
            current.classList.remove('cd-pick-highlight');
            current = null;
          }
        }
        function cssSelector(el) {
          if (!el || el.nodeType !== 1) return '';
          var parts = [];
          var node = el;
          while (node && node.nodeType === 1 && node !== document.documentElement) {
            var part = node.tagName.toLowerCase();
            if (node.id) part += '#' + node.id;
            if (node.className && typeof node.className === 'string') {
              var cls = node.className.trim().split(/\\s+/).filter(function(c) { return c && c.indexOf('cd-pick') === -1; });
              if (cls.length) part += '.' + cls.join('.');
            }
            var parent = node.parentElement;
            if (parent) {
              var sibs = Array.prototype.slice.call(parent.children).filter(function(s) { return s.tagName === node.tagName; });
              if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(node) + 1) + ')';
            }
            parts.unshift(part);
            node = parent;
          }
          return parts.join(' > ');
        }
        function sendPicked(el) {
          var cs = window.getComputedStyle(el);
          var selector = cssSelector(el);
          var label = el.tagName.toLowerCase();
          if (el.id) label += '#' + el.id;
          else if (el.className && typeof el.className === 'string' && el.className.trim()) label += '.' + el.className.trim().split(/\\s+/)[0];
          var payload = {
            selector: selector,
            label: label,
            tagName: el.tagName.toLowerCase(),
            className: el.className || '',
            id: el.id || '',
            styles: {
              color: cs.color,
              backgroundColor: cs.backgroundColor,
              fontSize: cs.fontSize,
              fontFamily: cs.fontFamily,
              borderRadius: cs.borderRadius,
              padding: cs.padding,
              margin: cs.margin,
              display: cs.display
            },
            outerHTML: el.outerHTML.length > 2000 ? el.outerHTML.substring(0, 2000) + '...' : el.outerHTML,
            xpath: ''
          };
          try { window.parent.postMessage({ type: 'cd:picked', element: payload }, '*'); } catch (e) {}
        }
        document.documentElement.classList.add('cd-pick-active');
        document.addEventListener('mouseover', function(e) {
          clearHighlight();
          if (e.target && e.target.nodeType === 1 && e.target !== document.body) {
            current = e.target;
            current.classList.add('cd-pick-highlight');
          }
        }, true);
        document.addEventListener('click', function(e) {
          if (e.target && e.target.nodeType === 1 && e.target !== document.body) {
            e.preventDefault();
            e.stopPropagation();
            sendPicked(e.target);
            clearHighlight();
            document.documentElement.classList.remove('cd-pick-active');
          }
        }, true);
        document.addEventListener('mouseover', function(e) {
          if (e.target === document.body || e.target === document.documentElement) clearHighlight();
        }, true);
      })();
    <\/script>
  `;

  useEffect(() => {
    if (!isPickerActive) return;
    const handleMessage = (e) => {
      if (e.data && e.data.type === 'cd:picked' && e.data.element) {
        const info = e.data.element;
        setPickedElement(info);
        if (onElementPicked) onElementPicked(info);
        setIsPickerActive(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isPickerActive]);

  const presetOptions = [
    { value: 'dashboard-full', label: 'SaaS Dashboard Suite' },
    { value: 'docs', label: 'Docs & Knowledge Base' },
    { value: 'auth', label: 'Auth & Settings Suite' },
    { value: 'hero', label: 'Hero Section' },
    { value: 'dashboard', label: 'Dashboard Widget' },
    { value: 'form', label: 'Form Panel' },
    { value: 'grid', label: 'Feature Card Grid' },
    { value: 'pricing', label: 'Pricing Table' }
  ];

  // Open Design Page Suites Templates
  const pagesHtml = {
    home: `<!DOCTYPE html>
<html><head><style>
  body { font-family: monospace; margin: 0; background: #fafafa; color: #18181b; }
  nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; border-bottom: 1px solid rgba(0,0,0,0.08); background: #ffffff; }
  .hero { padding: 80px 24px; text-align: center; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 44px; font-weight: 700; letter-spacing: -1px; margin-top: 0; }
  p { font-size: 16px; color: #71717a; line-height: 1.6; margin-bottom: 32px; }
  .cta-btn { background: #18181b; color: white; border: none; padding: 14px 32px; border-radius: 9999px; font-family: monospace; font-size: 14px; font-weight: 600; cursor: pointer; }
  .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; padding: 64px 48px; max-width: 1100px; margin: 0 auto; }
  .feat-card { background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
  footer { padding: 40px 48px; border-top: 1px solid rgba(0,0,0,0.08); text-align: center; color: #a1a1aa; font-size: 12px; }
</style></head>
<body>
  <nav><div style="font-weight:700; font-size:16px;">Open Design — Home</div><button class="cta-btn" style="padding:8px 20px; font-size:12px;">Launch App</button></nav>
  <div class="hero">
    <h1>What do you want to design today?</h1>
    <p>Open Design ecosystem for building prototypes, hypeframes, and presentation decks with local LLMs.</p>
    <button class="cta-btn">Start Designing →</button>
  </div>
  <div class="features">
    <div class="feat-card"><h3>Prototype</h3><p>High fidelity interactive UI components.</p></div>
    <div class="feat-card"><h3>Hypeframe</h3><p>Clean structural blueprint wireframe mode.</p></div>
    <div class="feat-card"><h3>Deck 16:9</h3><p>Executive slide decks with metric charts.</p></div>
  </div>
  <footer>Stark Desktop — Open Design Home</footer>
</body></html>`,
    ds: `<!DOCTYPE html>
<html><head><style>
  body { font-family: monospace; margin: 0; background: #fafafa; color: #18181b; padding: 48px; }
  h1 { font-size: 32px; font-weight: 700; margin-top: 0; }
  .token-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
  .token-card { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); padding: 20px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
  .swatch { height: 48px; border-radius: 6px; margin-bottom: 12px; border: 1px solid rgba(0,0,0,0.1); }
</style></head>
<body>
  <h1>Stark Semantic Design System</h1>
  <p style="color:#71717a;">Living specification of color tokens, typography scales, and radii.</p>
  <div class="token-grid">
    <div class="token-card"><div class="swatch" style="background:#fafafa;"></div><strong>Canvas Background</strong><br><span style="font-size:12px;color:#71717a;">#fafafa</span></div>
    <div class="token-card"><div class="swatch" style="background:#ffffff;"></div><strong>Surface Card</strong><br><span style="font-size:12px;color:#71717a;">#ffffff</span></div>
    <div class="token-card"><div class="swatch" style="background:#18181b;"></div><strong>Ink Deep Primary</strong><br><span style="font-size:12px;color:#71717a;">#18181b</span></div>
    <div class="token-card"><div class="swatch" style="background:#f4f4f5;"></div><strong>Elevated Dark Soft</strong><br><span style="font-size:12px;color:#71717a;">#f4f4f5</span></div>
  </div>
</body></html>`,
    plugin: `<!DOCTYPE html>
<html><head><style>
  body { font-family: monospace; margin: 0; background: #141414; color: #f9fafb; padding: 48px; }
  h1 { font-size: 32px; font-weight: 700; margin-top: 0; }
  .plugin-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 24px; }
  .plugin-card { background: #202020; border: 1px solid #333333; padding: 28px; border-radius: 8px; }
  button { background: #383838; color: white; border: 1px solid #555555; padding: 8px 16px; border-radius: 4px; font-family: monospace; cursor: pointer; margin-top: 12px; }
</style></head>
<body>
  <h1>Open Design Plugin Hub</h1>
  <p style="color:#a0a0a5;">Extend your workflow with official Open Design plugins.</p>
  <div class="plugin-grid">
    <div class="plugin-card"><h3>Figma Token Sync</h3><p style="color:#a0a0a5;font-size:13px;">Synchronize color and typography variables bidirectionally with Figma.</p><button>Install Plugin</button></div>
    <div class="plugin-card"><h3>React TSX Exporter</h3><p style="color:#a0a0a5;font-size:13px;">Export designed components into modular React TypeScript components.</p><button>Install Plugin</button></div>
  </div>
</body></html>`,
    integrations: `<!DOCTYPE html>
<html><head><style>
  body { font-family: monospace; margin: 0; background: #fafafa; color: #18181b; padding: 48px; }
  h1 { font-size: 32px; font-weight: 700; margin-top: 0; }
  .integ-list { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
  .integ-item { background: #ffffff; border: 1px solid rgba(0,0,0,0.08); padding: 18px 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 12px 40px rgba(0,0,0,0.06); }
</style></head>
<body>
  <h1>Native Integrations</h1>
  <p style="color:#71717a;">Connect Open Design to your production deployment pipeline.</p>
  <div class="integ-list">
    <div class="integ-item"><span>Vercel Deployment Pipeline</span><strong style="font-size:12px;color:#71717a;">[Connected]</strong></div>
    <div class="integ-item"><span>Ollama Local LLM Engine</span><strong style="font-size:12px;color:#18181b;">[Active: Qwen 2.5]</strong></div>
    <div class="integ-item"><span>Tauri Desktop Sandbox</span><strong style="font-size:12px;color:#71717a;">[Enabled]</strong></div>
  </div>
</body></html>`
  };

  const getHypeframeHtml = () => `<!DOCTYPE html>
<html><head><style>
  * { box-sizing: border-box; }
  body { font-family: monospace; background: #f8fafc; color: #334155; margin: 0; padding: 24px; }
  .hype-box { border: 2px dashed #94a3b8; padding: 24px; border-radius: 8px; background: #ffffff; background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px; }
  .wire-btn { border: 2px solid #64748b; background: transparent; color: #334155; padding: 8px 16px; font-family: monospace; font-weight: bold; }
  .wire-card { border: 1px solid #cbd5e1; padding: 16px; background: #f1f5f9; margin: 12px 0; }
</style></head>
<body>
  <div class="hype-box">
    <div style="font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:12px;">[Hypeframe — Blueprint Wireframe Mode]</div>
    <div class="wire-card">
      <h2 style="margin-top:0;">UX Structural Layout Wireframe</h2>
      <p style="color:#64748b;">Low-fidelity blueprint focusing on information architecture and component placement.</p>
      <button class="wire-btn">Action Placeholder</button>
    </div>
  </div>
</body></html>`;

  const getDeckHtml = (slide) => `<!DOCTYPE html>
<html><head><style>
  body { font-family: monospace; margin: 0; background: #141414; color: #f9fafb; display: flex; justify-content: center; align-items: center; height: 100vh; }
  .slide-card { width: 100%; aspect-ratio: 16/9; max-width: 800px; background: #202020; border: 1px solid #333333; border-radius: 12px; padding: 48px; box-shadow: 0 16px 48px rgba(0,0,0,0.6); display: flex; flex-direction: column; justify-content: space-between; }
  h1 { font-size: 36px; margin-top: 0; font-weight: 700; }
  p { font-size: 16px; color: #a0a0a5; line-height: 1.6; }
  .slide-footer { display: flex; justify-content: space-between; font-size: 12px; color: #707075; border-top: 1px solid #2a2a2a; padding-top: 16px; }
</style></head>
<body>
  <div class="slide-card">
    <div>
      <span style="font-size:12px;color:#a0a0a5;">STARK DESKTOP — EXECUTIVE DECK</span>
      <h1>${slide === 1 ? 'Stark Desktop Architecture' : slide === 2 ? 'Local LLM & Ollama Engine' : slide === 3 ? '100% Monochrome Vibe System' : 'Roadmap & Next Steps'}</h1>
      <p>${slide === 1 ? 'Overview of deep seams, modular spatial layout, and local LLM acceleration.' : slide === 2 ? 'Zero cloud latency, offline execution, under 300MB RAM consumption.' : slide === 3 ? 'AAA contrast standards, diffuse soft shadows, clean Lucide iconography.' : 'Expanding full page suites, hypeframes, and presentation slide exports.'}</p>
    </div>
    <div class="slide-footer">
      <span>Stark Desktop — Open Design</span>
      <span>Slide ${slide} of ${totalSlides}</span>
    </div>
  </div>
</body></html>`;

  const currentDisplayHtml = artifactType === 'hypeframe'
    ? getHypeframeHtml()
    : artifactType === 'deck'
    ? getDeckHtml(currentSlide)
    : (htmlCode || pagesHtml[activePage] || pagesHtml.home);

  const displayHtml = isPickerActive && currentDisplayHtml
    ? currentDisplayHtml.replace('</body>', pickerScript + '</body>')
    : currentDisplayHtml;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentDisplayHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportHtml = () => {
    const blob = new Blob([currentDisplayHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stark-design-${activePreset || 'component'}-${artifactType || 'prototype'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--colors-canvas)', overflow: 'hidden' }}>
      {/* Studio Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--colors-surface-soft)', borderBottom: '1px solid var(--colors-hairline)', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>

        {/* Preset + Element Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CustomSelect
            options={presetOptions}
            value={activePreset || 'landing'}
            onChange={(val) => onSelectPreset && onSelectPreset(val)}
            placeholder="Preset"
          />
          <button
            onClick={() => setIsPickerActive(!isPickerActive)}
            title="Inspeccionar Elemento DOM"
            style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '5px 10px', background: isPickerActive ? 'var(--colors-primary)' : 'var(--colors-surface-dark)', color: isPickerActive ? 'var(--colors-on-primary)' : 'var(--colors-body-strong)', borderRadius: '4px', border: '1px solid var(--colors-hairline)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Crosshair size={13} strokeWidth={1.75} />
            <span>{isPickerActive ? 'Picker Activo' : 'Inspeccionar'}</span>
          </button>
        </div>

        {/* Picked Element Info */}
        {pickedElement && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--colors-surface-card)', border: '1px solid var(--colors-primary)', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--colors-ink)' }}>
            <MousePointerClick size={12} strokeWidth={1.75} style={{ color: 'var(--colors-primary)', flexShrink: 0 }} />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pickedElement.label || pickedElement.selector}
            </span>
            <button onClick={() => setPickedElement(null)} title="Quitar" style={{ background: 'none', border: 'none', color: 'var(--colors-muted)', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>
              ×
            </button>
          </div>
        )}
        {artifactType === 'deck' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--colors-surface-dark)', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--colors-hairline)' }}>
            <button onClick={() => setCurrentSlide((p) => Math.max(1, p - 1))} disabled={currentSlide === 1} style={{ background: 'transparent', border: 'none', color: 'var(--colors-ink)', cursor: 'pointer' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-body)' }}>
              {currentSlide} / {totalSlides}
            </span>
            <button onClick={() => setCurrentSlide((p) => Math.min(totalSlides, p + 1))} disabled={currentSlide === totalSlides} style={{ background: 'transparent', border: 'none', color: 'var(--colors-ink)', cursor: 'pointer' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Viewport Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--colors-surface-dark)', padding: '3px', borderRadius: '4px', border: '1px solid var(--colors-hairline)' }}>
          {[{ id: 'desktop', Icon: Monitor, label: 'Desktop' }, { id: 'tablet', Icon: Tablet, label: 'Tablet' }, { id: 'mobile', Icon: Smartphone, label: 'Mobile' }].map(({ id, Icon, label }) => (
            <button key={id} onClick={() => setViewportMode(id)} title={label}
              style={{ padding: '4px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', border: 'none', borderRadius: '4px', background: viewportMode === id ? 'var(--colors-surface-card-border)' : 'transparent', color: viewportMode === id ? 'var(--colors-ink-deep)' : 'var(--colors-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* View Tab + Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'var(--colors-surface-dark)', padding: '3px', borderRadius: '4px', border: '1px solid var(--colors-hairline)' }}>
            {[{ id: 'canvas', Icon: Eye, label: 'Lienzo' }, { id: 'code', Icon: Code2, label: 'Código' }].map(({ id, Icon, label }) => (
              <button key={id} onClick={() => setViewTab(id)}
                style={{ padding: '4px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)', border: 'none', borderRadius: '4px', background: viewTab === id ? 'var(--colors-surface-card-border)' : 'transparent', color: viewTab === id ? 'var(--colors-ink-deep)' : 'var(--colors-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Icon size={13} strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button onClick={handleCopyCode} title="Copiar Código HTML"
            style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '5px 10px', background: 'var(--colors-surface-dark)', color: 'var(--colors-body-strong)', borderRadius: '4px', border: '1px solid var(--colors-hairline)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.75} />}
            <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
          </button>

          <button onClick={handleExportHtml} title="Exportar HTML"
            style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '5px 10px', background: 'var(--colors-surface-dark)', color: 'var(--colors-body-strong)', borderRadius: '4px', border: '1px solid var(--colors-hairline)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={13} strokeWidth={1.75} />
            <span>Exportar</span>
          </button>

          <button onClick={onResetPreset} title="Restablecer"
            style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '5px 8px', background: 'var(--colors-surface-dark)', color: 'var(--colors-muted)', borderRadius: '4px', border: '1px solid var(--colors-hairline)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RotateCcw size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Canvas or Code View */}
      {viewTab === 'canvas' ? (
        <div style={{ flex: 1, padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto', background: 'var(--colors-surface-dark-soft)' }}>
          <div style={{ width: viewportMode === 'desktop' ? '100%' : viewportMode === 'tablet' ? '768px' : '375px', height: '100%', maxHeight: '820px', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.4)', border: isPickerActive ? '2px solid var(--colors-primary)' : '1px solid var(--colors-hairline-strong)', transition: 'all var(--transition-normal)' }}>
            <iframe ref={iframeRef} srcDoc={displayHtml} title="Open Design Preview Canvas" style={{ width: '100%', height: '100%', border: 'none', background: '#ffffff' }} />
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'var(--colors-surface-dark)' }}>
          <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', color: 'var(--colors-ink)', whiteSpace: 'pre-wrap' }}>
            {currentDisplayHtml}
          </pre>
        </div>
      )}
    </div>
  );
}
