import { h } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { CustomSelect } from '../src/components/CustomSelect';

describe('CustomSelect (Dropup Component Seam)', () => {
  const options = [
    { value: 'ollama', label: 'Local Ollama' },
    { value: 'anthropic', label: 'Anthropic API' }
  ];

  it('renders placeholder or selected option label', () => {
    render(<CustomSelect options={options} value="ollama" onChange={() => {}} placeholder="Proveedor" />);
    expect(screen.getByText('Local Ollama')).not.toBeNull();
  });

  it('toggles dropup options list when clicked and enforces Mandatory Dropup positioning', () => {
    render(<CustomSelect options={options} value="ollama" onChange={() => {}} placeholder="Proveedor" />);
    
    // Dropup list not open initially
    expect(screen.queryByText('Anthropic API')).toBeNull();

    // Click trigger to open
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    // Dropup option now visible
    const optionItem = screen.getByText('Anthropic API');
    expect(optionItem).not.toBeNull();

    // Verify Dropup container positioning (bottom: calc(100% + 6px))
    const dropupContainer = optionItem.closest('.custom-select-options-list');
    expect(dropupContainer.style.bottom).toBe('calc(100% + 6px)');
  });

  it('invokes onChange callback with selected value', () => {
    const handleChange = vi.fn();
    render(<CustomSelect options={options} value="ollama" onChange={handleChange} placeholder="Proveedor" />);

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const optionItem = screen.getByText('Anthropic API');
    fireEvent.click(optionItem);

    expect(handleChange).toHaveBeenCalledWith('anthropic');
  });
});
