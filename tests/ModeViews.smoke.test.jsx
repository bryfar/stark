import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/preact";
import { h } from "preact";
import { CodeView } from "../src/components/CodeView";
import { DesignChatPanel } from "../src/components/DesignChatPanel";
import { DesignView } from "../src/components/DesignView";

// Mock Tauri dynamic imports so effects resolve instantly
if (typeof window !== "undefined") {
  window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {
    transformCallback: () => () => {},
    invoke: () => Promise.resolve([]),
  };
}

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

describe("Smoke: mode views mount", () => {
  it("CodeView mounts without crashing", () => {
    const start = performance.now();
    const { container } = render(
      <CodeView
        selectedModel="test-model"
        activeFile={null}
        onOpenModelSelector={() => {}}
        activeSessionId="s1"
        workspacePath="/tmp/ws"
      />
    );
    const elapsed = performance.now() - start;
    console.log("CodeView mount ms:", Math.round(elapsed));
    expect(container.firstChild).toBeTruthy();
  });

  it("DesignChatPanel mounts without crashing", () => {
    const start = performance.now();
    const { container } = render(
      <DesignChatPanel
        activePreset="landing"
        onPresetSelect={() => {}}
        onGenerateDesignUI={() => {}}
        designVersions={[]}
        onRestoreVersion={() => {}}
        artifactType="html"
        onArtifactTypeChange={() => {}}
        selectedProvider="ollama"
        setSelectedProvider={() => {}}
        selectedModel="m"
        setSelectedModel={() => {}}
        reasoning={true}
        setReasoning={() => {}}
        tokenUsage={{ used: 0 }}
        pickedElement={null}
        onClearPickedElement={() => {}}
        providersConfig={[]}
        onOpenProviderManager={() => {}}
      />
    );
    const elapsed = performance.now() - start;
    console.log("DesignChatPanel mount ms:", Math.round(elapsed));
    expect(container.firstChild).toBeTruthy();
  });

  it("DesignView mounts without crashing", () => {
    const start = performance.now();
    const { container } = render(
      <DesignView
        htmlCode="<html><body><h1>test</h1></body></html>"
        activePreset="landing"
        activePage="home"
        onSelectPreset={() => {}}
        onResetPreset={() => {}}
        artifactType="html"
        onElementPicked={() => {}}
        activeSessionId="s1"
      />
    );
    const elapsed = performance.now() - start;
    console.log("DesignView mount ms:", Math.round(elapsed));
    expect(container.firstChild).toBeTruthy();
  });
});
