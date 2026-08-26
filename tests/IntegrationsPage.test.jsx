import { h } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/preact";
import { IntegrationsPage } from "../src/components/pages/IntegrationsPage";

// Mock Tauri dynamic imports
if (typeof window !== "undefined") {
  window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {
    transformCallback: () => () => {},
    invoke: () => Promise.resolve([]),
  };
}

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd, args) => {
    if (cmd === "storage_load") {
      return Promise.resolve(
        localStorage.getItem(`stark_fallback_${args.key}`) || ""
      );
    }
    if (cmd === "storage_save") {
      localStorage.setItem(`stark_fallback_${args.key}`, args.value);
      return Promise.resolve(true);
    }
    return Promise.resolve([]);
  }),
}));

describe("IntegrationsPage - MCP Server Manager", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders correctly with default integrations and empty MCP servers list", async () => {
    render(<IntegrationsPage />);
    expect(screen.getByText("Integrations")).not.toBeNull();
    expect(
      screen.getByText("Model Context Protocol (MCP) Servers")
    ).not.toBeNull();
    expect(
      screen.getByText(
        "No MCP servers registered yet. Use the form to register one."
      )
    ).not.toBeNull();
  });

  it("adds a new MCP server successfully", async () => {
    render(<IntegrationsPage />);

    // Fill in the form
    const nameInput = screen.getByLabelText("Server Name");
    const commandInput = screen.getByLabelText("Start Command");
    const envInput = screen.getByLabelText("Environment Variables (JSON)");

    fireEvent.input(nameInput, { target: { value: "Test Server" } });
    fireEvent.input(commandInput, {
      target: { value: "npx -y some-mcp-server" },
    });
    fireEvent.input(envInput, { target: { value: '{"KEY": "VALUE"}' } });

    // Submit form
    const submitBtn = screen.getByText("Add Server");
    fireEvent.click(submitBtn);

    // Check if the server is displayed in the list
    await waitFor(() => {
      expect(screen.getByText("Test Server")).not.toBeNull();
      expect(screen.getByText("npx -y some-mcp-server")).not.toBeNull();
      expect(
        screen.queryByText(
          "No MCP servers registered yet. Use the form to register one."
        )
      ).toBeNull();
    });
  });

  it("shows error on invalid JSON environment variables", async () => {
    render(<IntegrationsPage />);

    const nameInput = screen.getByLabelText("Server Name");
    const commandInput = screen.getByLabelText("Start Command");
    const envInput = screen.getByLabelText("Environment Variables (JSON)");

    fireEvent.input(nameInput, { target: { value: "Bad Server" } });
    fireEvent.input(commandInput, {
      target: { value: "npx -y some-mcp-server" },
    });
    fireEvent.input(envInput, { target: { value: "{invalid-json}" } });

    const submitBtn = screen.getByText("Add Server");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid Environment Variables JSON/)
      ).not.toBeNull();
    });
  });

  it("toggles and deletes an MCP server", async () => {
    // Seed localStorage
    const initialConfig = [
      {
        id: "mcp-1",
        name: "Seed Server",
        command: "npx -y seed-mcp",
        env: {},
        enabled: true,
      },
    ];
    localStorage.setItem(
      "stark_fallback_mcp_servers_config",
      JSON.stringify(initialConfig)
    );

    render(<IntegrationsPage />);

    // Seed server should be visible
    await waitFor(() => {
      expect(screen.getByText("Seed Server")).not.toBeNull();
    });

    // Toggle server state
    const toggleBtn = screen.getByTitle("Disable Server");
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      // Toggle should now show enable title
      expect(screen.getByTitle("Enable Server")).not.toBeNull();
    });

    // Delete server
    const deleteBtn = screen.getByTitle("Delete Server");
    fireEvent.click(deleteBtn);

    // Verify it is gone
    await waitFor(() => {
      expect(screen.queryByText("Seed Server")).toBeNull();
    });
  });
});
