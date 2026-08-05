import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Download, Star, ExternalLink, Puzzle } from 'lucide-react';

// Mirrors Open Design's Plugin page:
// Browse, install, and distribute workflow plugins to extend generation on demand.
const PLUGINS = [
  {
    id: 'figma-token-sync',
    name: 'Figma Token Sync',
    author: 'open-design',
    desc: 'Synchronize color and typography variables bidirectionally with Figma design files.',
    category: 'Design Tokens',
    stars: 412,
    installed: false,
  },
  {
    id: 'react-tsx-exporter',
    name: 'React TSX Exporter',
    author: 'open-design',
    desc: 'Export generated HTML prototypes as modular React TypeScript component trees.',
    category: 'Export',
    stars: 289,
    installed: true,
  },
  {
    id: 'tailwind-mapper',
    name: 'Tailwind CSS Mapper',
    author: 'community',
    desc: 'Map Stark semantic tokens to Tailwind CSS utility classes automatically.',
    category: 'CSS',
    stars: 177,
    installed: false,
  },
  {
    id: 'pptx-export',
    name: 'PPTX Deck Export',
    author: 'open-design',
    desc: 'Export Deck 16:9 artifacts to fully-editable PowerPoint PPTX files.',
    category: 'Export',
    stars: 341,
    installed: false,
  },
  {
    id: 'motion-hyperframe',
    name: 'HyperFrame Motion',
    author: 'open-design',
    desc: 'Animate HTML prototypes into MP4 video using CSS keyframe sequences.',
    category: 'Animation',
    stars: 208,
    installed: false,
  },
  {
    id: 'storybook-bridge',
    name: 'Storybook Bridge',
    author: 'community',
    desc: 'Push generated components directly into your Storybook stories catalog.',
    category: 'Dev Tools',
    stars: 95,
    installed: false,
  },
];

export function PluginHubPage() {
  const [plugins, setPlugins] = useState(PLUGINS);
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(PLUGINS.map(p => p.category)))];

  const filtered = filter === 'All' ? plugins : plugins.filter(p => p.category === filter);

  const toggleInstall = (id) => {
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, installed: !p.installed } : p));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--colors-canvas)', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '700', color: 'var(--colors-ink-deep)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Puzzle size={18} strokeWidth={1.75} />
          Plugin Hub
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--colors-body)', fontFamily: 'var(--font-mono)' }}>
          Browse, install, and distribute workflow plugins to extend generation on demand.
        </p>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '5px 14px', borderRadius: '9999px', fontSize: '12px', fontFamily: 'var(--font-mono)',
              border: '1px solid var(--colors-hairline)',
              background: filter === cat ? 'var(--colors-surface-card-border, var(--colors-ink))' : 'var(--colors-surface-card)',
              color: filter === cat ? 'var(--colors-ink-deep)' : 'var(--colors-body)',
              cursor: 'pointer', fontWeight: filter === cat ? '600' : '400',
              transition: 'all 120ms'
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Plugin grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.map(plugin => (
          <div key={plugin.id} style={{ background: 'var(--colors-surface-card)', border: '1px solid var(--colors-hairline)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--colors-ink-deep)', marginBottom: '2px' }}>{plugin.name}</div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>by {plugin.author}</div>
              </div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '3px 8px', background: 'var(--colors-surface-dark)', borderRadius: '9999px', border: '1px solid var(--colors-hairline)', color: 'var(--colors-body)' }}>
                {plugin.category}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--colors-body)', lineHeight: '1.55' }}>{plugin.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--colors-muted)' }}>
                <Star size={11} strokeWidth={1.75} />
                <span>{plugin.stars}</span>
              </div>
              <button
                onClick={() => toggleInstall(plugin.id)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--colors-hairline)',
                  background: plugin.installed ? 'var(--colors-surface-dark)' : 'var(--colors-ink)',
                  color: plugin.installed ? 'var(--colors-body)' : 'var(--colors-canvas)',
                  cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'all 120ms'
                }}
              >
                <Download size={11} strokeWidth={1.75} />
                {plugin.installed ? 'Installed' : 'Install'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
