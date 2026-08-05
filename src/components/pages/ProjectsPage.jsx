import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Folder, Plus, Trash2, GitBranch, Clock, HardDrive, Play, ArrowLeft } from 'lucide-react';
import { translations } from '../../i18n';

export function ProjectsPage({ lang = 'es' }) {
  const [projects, setProjects] = useState([]);
  const [newPath, setNewPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [focusedId, setFocusedId] = useState('proj-1');

  useEffect(() => {
    const stored = localStorage.getItem('stark_projects');
    if (stored) {
      setProjects(JSON.parse(stored));
    } else {
      const defaults = [
        {
          id: 'proj-1',
          name: 'crafter-repo',
          path: '/home/bryan/Downloads/Repos/crafter-repo',
          branch: 'main',
          lastCommit: 'Fix contrast active states',
          time: '2 mins ago',
          size: '12.4 MB'
        },
        {
          id: 'proj-2',
          name: 'stark-core',
          path: '/home/bryan/projects/stark-core',
          branch: 'dev',
          lastCommit: 'Add bubblewrap executor',
          time: '1 hour ago',
          size: '8.1 MB'
        },
        {
          id: 'proj-3',
          name: 'antigravity-editor',
          path: '/home/bryan/projects/antigravity-editor',
          branch: 'feature/i18n',
          lastCommit: 'Localize settings modal',
          time: '1 day ago',
          size: '42.5 MB'
        }
      ];
      setProjects(defaults);
      localStorage.setItem('stark_projects', JSON.stringify(defaults));
    }
  }, []);

  const saveProjects = (list) => {
    setProjects(list);
    localStorage.setItem('stark_projects', JSON.stringify(list));
  };

  const handleAddProject = async () => {
    let path = newPath.trim();
    if (!path) {
      // Try to open Tauri dialog if available
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false
        });
        if (selected) {
          path = selected;
        } else {
          return;
        }
      } catch (e) {
        alert(lang === 'es' ? 'Por favor escribe una ruta o ejecuta en Tauri' : 'Please type a path or run in Tauri');
        return;
      }
    }

    const name = path.split('/').pop() || 'project';
    const newProj = {
      id: `proj-${Date.now()}`,
      name,
      path,
      branch: 'main',
      lastCommit: 'Initial workspace check-in',
      time: 'Just now',
      size: '1.2 MB'
    };

    const updated = [...projects, newProj];
    saveProjects(updated);
    setNewPath('');
    setIsAdding(false);
  };

  const handleDeleteProject = (id, e) => {
    e.stopPropagation();
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    if (focusedId === id && updated.length > 0) {
      setFocusedId(updated[0].id);
    }
  };

  const handleFocusProject = (id) => {
    setFocusedId(id);
  };

  const isEs = lang === 'es';

  return (
    <div style={{ padding: '32px', color: 'var(--colors-ink)', width: '100%', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: '700', margin: 0 }}>
            {isEs ? 'Explorador de Proyectos' : 'Projects Explorer'}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--colors-muted)', margin: '4px 0 0 0' }}>
            {isEs ? 'Administra y cambia el foco entre repositorios de desarrollo locales' : 'Manage and switch focus between local development repositories'}
          </p>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="send-btn-stark"
          style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} strokeWidth={1.75} />
          <span>{isEs ? 'Agregar Proyecto' : 'Add Project'}</span>
        </button>
      </div>

      {/* Add Project inline form */}
      {isAdding && (
        <div style={{ background: 'var(--colors-surface-dark-soft)', border: '1px solid var(--colors-hairline)', borderRadius: '6px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '12px', margin: 0, fontWeight: '700' }}>
            {isEs ? 'Registrar nuevo repositorio local' : 'Register new local repository'}
          </h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              className="model-selector-select"
              placeholder={isEs ? '/ruta/absoluta/al/proyecto' : '/absolute/path/to/project'}
              value={newPath}
              onInput={(e) => setNewPath(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', fontSize: '12px' }}
            />
            <button 
              onClick={handleAddProject} 
              className="send-btn-stark"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              {isEs ? 'Confirmar' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {projects.map((proj) => {
          const isFocused = proj.id === focusedId;
          return (
            <div 
              key={proj.id}
              onClick={() => handleFocusProject(proj.id)}
              style={{
                background: isFocused ? 'var(--colors-surface-dark-elevated, #3a3a3a)' : 'var(--colors-surface-dark, #111111)',
                border: isFocused ? '1px solid var(--colors-primary)' : '1px solid var(--colors-hairline)',
                borderRadius: '6px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                {/* Folder icon with active highlight */}
                <div style={{ 
                  width: '38px', height: '38px', borderRadius: '4px', 
                  background: isFocused ? 'var(--colors-primary)' : 'var(--colors-surface-dark-soft)',
                  color: isFocused ? 'var(--colors-on-primary)' : 'var(--colors-ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Folder size={18} strokeWidth={1.75} />
                </div>

                {/* Text meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--colors-ink)' }}>{proj.name}</span>
                    {isFocused && (
                      <span style={{ 
                        fontSize: '9px', textTransform: 'uppercase', background: 'var(--colors-primary)', 
                        color: 'var(--colors-on-primary)', padding: '2px 6px', borderRadius: '10px', fontWeight: '700'
                      }}>
                        {isEs ? 'Activo' : 'Active'}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--colors-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.path}
                  </span>
                </div>
              </div>

              {/* Git & Size Metas */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                
                {/* Git branch info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '11px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--colors-ink)', fontWeight: '600' }}>
                    <GitBranch size={12} strokeWidth={1.75} style={{ color: 'var(--colors-muted)' }} />
                    {proj.branch}
                  </span>
                  <span style={{ color: 'var(--colors-muted)', fontSize: '10px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {proj.lastCommit}
                  </span>
                </div>

                {/* Last commit time & size */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '11px', color: 'var(--colors-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} strokeWidth={1.75} />
                    {proj.time}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive size={12} strokeWidth={1.75} />
                    {proj.size}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                  {!isFocused && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleFocusProject(proj.id); }}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title={isEs ? 'Establecer foco' : 'Focus workspace'}
                    >
                      <Play size={10} strokeWidth={1.75} />
                      <span>Focus</span>
                    </button>
                  )}
                  <button 
                    onClick={(e) => handleDeleteProject(proj.id, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--colors-error)', cursor: 'pointer', padding: '6px' }}
                    title={isEs ? 'Eliminar' : 'Remove'}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
