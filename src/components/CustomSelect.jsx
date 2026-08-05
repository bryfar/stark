import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

export function CustomSelect({ options, value, onChange, placeholder, style, className, compact }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Custom Trigger Box */}
      <button
        type="button"
        className={`custom-select-trigger ${className || ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: compact ? '4px 8px' : '8px 14px',
          background: 'var(--colors-surface-dark)',
          border: '1px solid var(--colors-hairline)',
          borderRadius: '4px',
          color: 'var(--colors-ink)',
          fontSize: compact ? '11px' : '13px',
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          width: '100%',
          outline: 'none',
          transition: 'all var(--transition-fast)'
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder || 'Seleccionar'}</span>
        <span style={{ color: 'var(--colors-body)', marginLeft: '6px', display: 'flex', alignItems: 'center' }}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>

      {/* Floating Monochrome Dropup Menu (Opens Upwards) */}
      {isOpen && (
        <div
          className="custom-select-options-list"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            minWidth: '220px',
            backgroundColor: 'var(--colors-surface-dark)',
            border: '1px solid var(--colors-hairline-strong)',
            borderRadius: '4px',
            boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px 0'
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                style={{
                  padding: '9px 14px',
                  fontSize: '12.5px',
                  fontFamily: 'var(--font-mono)',
                  color: isSelected ? 'var(--colors-ink-deep)' : 'var(--colors-body-strong)',
                  backgroundColor: isSelected ? 'var(--colors-surface-card-border)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.1s ease, color 0.1s ease'
                }}
              >
                <span style={{ display: 'inline-flex', width: '14px' }}>
                  {isSelected && <Check size={13} strokeWidth={2} />}
                </span>
                <span>{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
