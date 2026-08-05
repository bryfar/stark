import { h } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { HeaderBar } from '../src/components/HeaderBar';

describe('HeaderBar (Navbar & Theme Switcher Seam)', () => {
  it('renders mode tabs without text brackets', () => {
    render(
      <HeaderBar
        currentMode="chat"
        setMode={() => {}}
        onOpenDoctor={() => {}}
        isSidebarOpen={true}
        onToggleSidebar={() => {}}
        theme="dark"
        onToggleTheme={() => {}}
      />
    );

    expect(screen.getByText('Chat General')).not.toBeNull();
    expect(screen.getByText('Modo Code')).not.toBeNull();
    expect(screen.getByText('Modo Design')).not.toBeNull();
  });

  it('triggers setMode when a mode tab is clicked', () => {
    const handleSetMode = vi.fn();
    render(
      <HeaderBar
        currentMode="chat"
        setMode={handleSetMode}
        onOpenDoctor={() => {}}
        isSidebarOpen={true}
        onToggleSidebar={() => {}}
        theme="dark"
        onToggleTheme={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Modo Code'));
    expect(handleSetMode).toHaveBeenCalledWith('code');
  });

  it('triggers theme toggle callback when theme button is clicked', () => {
    const handleToggleTheme = vi.fn();
    render(
      <HeaderBar
        currentMode="chat"
        setMode={() => {}}
        onOpenDoctor={() => {}}
        isSidebarOpen={true}
        onToggleSidebar={() => {}}
        theme="dark"
        onToggleTheme={handleToggleTheme}
      />
    );

    const themeBtn = screen.getByText('Light');
    fireEvent.click(themeBtn);
    expect(handleToggleTheme).toHaveBeenCalled();
  });
});
