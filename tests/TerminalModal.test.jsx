import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/preact";
import { TerminalModal } from "../src/components/TerminalModal";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

describe("TerminalModal (sandbox approval & live streaming)", () => {
  it("renders the proposed command before execution", () => {
    render(
      <TerminalModal
        proposedCommand={{ command: "npm run build", workspacePath: "/tmp" }}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getByText(/npm run build/)).not.toBeNull();
    expect(screen.getByText(/Aislamiento de kernel Linux/)).not.toBeNull();
  });

  it("switches to running, then finished with a close button", async () => {
    let resolveApprove;
    const handleApprove = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveApprove = resolve;
      });
    });

    render(
      <TerminalModal
        proposedCommand={{ command: "echo hi", workspacePath: "/tmp" }}
        onApprove={handleApprove}
        onReject={() => {}}
      />
    );

    fireEvent.click(screen.getByText("[Ejecutar en Sandbox]"));
    expect(screen.getByText("[Ejecutando...]")).not.toBeNull();

    await new Promise((r) => setTimeout(r, 0));
    expect(resolveApprove).toBeDefined();
    resolveApprove();
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByText("[Cerrar]")).not.toBeNull();
    expect(handleApprove).toHaveBeenCalledWith("echo hi", true);
  });

  it("calls onReject when cancel is clicked", () => {
    const handleReject = vi.fn();
    render(
      <TerminalModal
        proposedCommand={{ command: "rm -rf /tmp/x", workspacePath: "/tmp" }}
        onApprove={() => {}}
        onReject={handleReject}
      />
    );

    fireEvent.click(screen.getByText("[Cancelar Comando]"));
    expect(handleReject).toHaveBeenCalled();
  });
});
