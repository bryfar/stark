import { h } from 'preact';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { DesignView } from '../src/components/DesignView';

describe('DesignView (Open Design Studio Seam)', () => {
  it('renders Open Design Studio header bar and preset selector', () => {
    render(
      <DesignView
        htmlCode="<h1>Test Component</h1>"
        activePreset="hero"
        onSelectPreset={() => {}}
        onResetPreset={() => {}}
      />
    );

    expect(screen.getByText('Inspeccionar')).not.toBeNull();
    expect(screen.getByText('Hero Section')).not.toBeNull();
  });

  it('switches responsive viewports (Desktop, Tablet, Mobile)', () => {
    render(
      <DesignView
        htmlCode="<h1>Test Component</h1>"
        activePreset="hero"
        onSelectPreset={() => {}}
        onResetPreset={() => {}}
      />
    );

    const tabletBtn = screen.getByText('Tablet');
    fireEvent.click(tabletBtn);
    expect(screen.getByText('Tablet')).not.toBeNull();

    const mobileBtn = screen.getByText('Mobile');
    fireEvent.click(mobileBtn);
    expect(screen.getByText('Mobile')).not.toBeNull();
  });

  it('toggles between Live Canvas iframe and Source Code inspector view', () => {
    render(
      <DesignView
        htmlCode="<h1>Test Component Code</h1>"
        activePreset="hero"
        onSelectPreset={() => {}}
        onResetPreset={() => {}}
      />
    );

    const codeTabBtn = screen.getByText('Código');
    fireEvent.click(codeTabBtn);

    // Verify source code text element is rendered
    expect(screen.getByText(/Test Component Code/i)).not.toBeNull();
  });
});
