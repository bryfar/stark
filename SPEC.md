# Product Specification (PRD): Stark Desktop & Open Design Studio System
<!-- triage: ready-for-agent -->

## Problem Statement

Developers and UI/UX engineers on Linux need a single local workspace to prototype, iterate, inspect, and export high-fidelity web components and full-page application suites using offline LLMs — without cloud dependency, visual noise, or context-switching overhead. Existing tools either require network access, impose cluttered toolbars, or conflate navigation with content in ways that break spatial focus.

## Solution

**Stark Desktop** integrates the **Open Design Studio** (`nexu-io/open-design` ecosystem) into a lightweight, offline-first Linux workspace with a strict **100% Monochrome Vibe Engineering** design language and a three-region spatial layout:

1. **Sidebar:** Icon-only vertical navigation dock (no text labels) for global page switching, plus a dynamic lower container per workspace mode.
2. **Design Mode Side Panel:** A dedicated 320px `DesignChatPanel` that lives adjacent to the canvas — not inside the sidebar — containing the full design copilot, artifact type selector, scope targeting, model selector, tokens inspector, version history, and plugin injector chips.
3. **Main Canvas (`DesignView`):** Responsive iframe canvas with viewport switching, source code inspector, element picker, deck slide navigation, copy HTML, and `.html` export.

## User Stories

1. As a developer, I want the sidebar global pages navigation to show only icons (no text labels) in a vertical column, so that the navigation dock is compact and unobtrusive.
2. As a developer, I want clicking the Home icon in the sidebar to open a new general chat session, so that I can quickly start a conversation without searching for a button.
3. As a developer, I want the Design System, Plugin Hub, and Integrations page icons in the sidebar to switch the canvas context, so that I can browse the Open Design ecosystem without leaving the workspace.
4. As a designer, I want the Design mode to render a 320px `DesignChatPanel` side-by-side with the canvas, so that I can iterate on the design and see results in real time without leaving the view.
5. As a designer, I want the sidebar lower container to be empty in Design mode (with a contextual hint), so that the sidebar is not cluttered with controls already visible in the side panel.
6. As a designer, I want to select the artifact type (Prototype, Hypeframe, Deck 16:9) from a collapsed dropdown inside the Design Chat Panel, so that the control is always accessible but does not take up permanent vertical space.
7. As a designer, I want switching to `Hypeframe` mode to render a structural blueprint wireframe on the canvas, so that I can communicate information architecture without visual design distractions.
8. As a designer, I want switching to `Deck (16:9)` mode to render an executive presentation slide on the canvas with Previous / Next navigation controls in the toolbar, so that I can iterate on slides independently.
9. As a designer, I want switching to `Prototype` mode to render the high-fidelity interactive HTML/CSS UI component on the canvas, so that I can verify micro-interactions and hover states.
10. As a designer, I want the Preset Base selector, Targeting Scope selector, and LLM Model selector to appear inside the Design Chat Panel, so that all design controls are co-located in one seam.
11. As a designer, I want the Design Tokens Inspector to appear as a collapsible accordion inside the Design Chat Panel, so that I can inspect computed tokens without it consuming permanent space.
12. As a designer, I want the iteration chat log (with version restore buttons) to appear in the scrollable middle section of the Design Chat Panel, so that I can review and revert design changes without losing context.
13. As a designer, I want Plugin Injector chips (`Plugin UI`, `Plugin Image`, `Plugin Video`, `Plugin Deck`) above the prompt input in the Design Chat Panel, so that I can scaffold a design iteration stub in one click.
14. As a designer, I want to attach image sketches or wireframe photos to a design prompt, so that I can describe a reference layout and have the LLM clone it.
15. As a developer, I want to activate the Element Picker (`Inspeccionar`) in the `DesignView` toolbar, so that I can click any canvas element and target it in the Design Chat Panel prompt.
16. As a developer, I want to switch between responsive viewports (Desktop, Tablet 768px, Mobile 375px) in the `DesignView` toolbar, so that I can verify layout responsiveness without leaving the studio.
17. As a developer, I want to toggle between Live Canvas and Source Code views in `DesignView`, so that I can inspect and copy raw HTML/CSS output at any time.
18. As a developer, I want to copy the full HTML to the clipboard or export it as a `.html` file from the `DesignView` toolbar, so that I can use generated components in external projects.
19. As a developer, I want the Design Chat Panel to pass the artifact type to the canvas in real time, so that switching from Prototype to Deck immediately updates the iframe without a page reload.
20. As a developer, I want all dropdown selectors to open upwards (dropup), so that floating option lists never overlap the prompt input area below them.

## Implementation Decisions

- **Sidebar Architecture (3 Levels):**
  - *Level 1:* Brand mark (`Stark Desktop`) and sidebar collapse toggle.
  - *Level 2 (Global — always visible):* Icon-only vertical dock for page navigation (`Home`, `Design System`, `Plugin Hub`, `Integrations`). No text labels. Each button has a `title` tooltip. Home triggers a new chat session.
  - *Level 3 (Dynamic Lower Container):* Renders based on `currentMode`:
    - `chat` → New Chat button + recent chat history list.
    - `code` → File tree explorer with status indicators.
    - `design` → Empty with a contextual hint; all design controls are in the side panel.
  - *Footer (persistent):* Stark Doctor button + RAM / Ollama status indicator.

- **Design Mode Two-Panel Layout:**
  - The main content area in Design mode is split into two horizontal panels using `display: flex`:
    - `DesignChatPanel` (320px, `flex-shrink: 0`): full design copilot.
    - `DesignView` (`flex: 1`): canvas, toolbar, and code inspector.
  - `artifactType` state is lifted to `App` and passed as props to both panels so they stay in sync.

- **DesignChatPanel Internal Structure (top to bottom):**
  1. Panel header with `Design Copilot` title.
  2. Controls stack: Artifact Type dropdown (collapsed `CustomSelect`), Preset Base selector, Scope selector, Model selector, Design Tokens Inspector accordion.
  3. Scrollable iteration chat log with version restore buttons.
  4. Plugin Injector chip row.
  5. Prompt input with sketch attachment upload and `Iterar UI` send button.

- **Artifact Type Behavior:**
  - `prototype` → renders `htmlCode` from the active preset (or generated iteration) in the canvas iframe.
  - `hypeframe` → replaces the canvas with a static structural blueprint HTML (dashed borders, dot-grid background, placeholder boxes).
  - `deck` → replaces the canvas with a 16:9 slide template and exposes Previous / Next controls in the `DesignView` toolbar; `currentSlide` state is local to `DesignView`.

- **Global Pages State:** `activePage` and `artifactType` are lifted to `App`. `activePage` controls which Open Design page template (`home`, `ds`, `plugin`, `integrations`) is shown on the canvas when in Prototype mode.

- **Design Guardrails (invariants enforced across all components):**
  - Zero emojis and zero text brackets on any UI label or button.
  - All `CustomSelect` dropdowns open upward (`bottom: calc(100% + 6px)`).
  - Lucide Icons (`lucide-react`) only, `strokeWidth={1.75}`.
  - 100% neutral monochrome for all hover states and accents.

## Testing Decisions

- **Good tests** assert only externally observable behavior: rendered text content, DOM node presence, class/style switches driven by state, and user-triggered callbacks. They never assert internal implementation details.
- **Seams to test (in priority order):**
  1. `CustomSelect` — Dropup positioning (CSS `bottom` rule) and `onChange` callback.
  2. `HeaderBar` — Mode tab rendering without text brackets; `setMode` callback; theme toggle callback.
  3. `DesignView` — Studio toolbar rendering; viewport switcher interaction; canvas / code tab toggle.
  4. `DesignChatPanel` — Artifact type dropdown renders and fires `onArtifactTypeChange`; send button fires `onGenerateDesignUI` with correct scope and model.
- **Test environment:** Vitest + Happy-DOM + `@testing-library/preact`.
- **Prior art:** Existing passing test suites in `tests/` serve as reference for assertion style.

## Out of Scope

- Real-time collaborative multiplayer editing.
- Remote cloud database persistence for multi-tenant users.
- Third-party OAuth / SSO authentication.
- Full 3D WebGL rendering pipeline.
- Accessibility audit and WCAG compliance enforcement.

## Further Notes

- All components are Vite HMR hot-reloaded and verified at `http://localhost:1420/` (task `task-480`).
- This spec was synthesized from `grill-me` sessions covering: (1) icon-only sidebar pages dock, (2) side-by-side Design mode layout, and (3) artifact type selector as collapsed dropdown in DesignChatPanel.
- Local LLM inference targets Ollama models under 300MB RAM. The fallback browser-mode mock response is triggered when Tauri `invoke` is unavailable.
