---
version: beta
name: Stark-design-analysis
description: A premium, dual-mode (dark-first) workspace interface for the Stark product. The system anchors on a terminal-inspired grid canvas with editorial serif display headlines, monochrome CTAs, and glassmorphic product surfaces. Brand voltage comes from the juxtaposition of highly technical environments (mono code blocks, stark contrast) with humanist, neutral accents (the monochrome primary and Newsreader serif).

colors:
  primary: "#ffffff" # Dark primary (Light primary is "#2a2a2a")
  primary-active: "#f4f4f5"
  primary-disabled: "#3f3f46"
  ink: "#f9fafb"
  body: "#9ca3af"
  body-strong: "#d1d5db"
  muted: "#6b7280"
  muted-soft: "#4b5563"
  hairline: "#3f3f46"
  hairline-soft: "#2d2d2d"
  canvas: "#1e1e1e"
  surface-soft: "#262626"
  surface-card: "rgba(255, 255, 255, 0.05)"
  surface-card-border: "rgba(255, 255, 255, 0.1)"
  surface-dark: "#2d2d2d"
  surface-dark-elevated: "#3a3a3a"
  surface-dark-soft: "#1f1e1b"
  on-primary: "#f9fafb"
  on-dark: "#f9fafb"
  on-dark-soft: "#9ca3af"
  accent-teal: "#5db8a6"
  accent-amber: "#e8a55a"
  success: "#10b981"
  warning: "#f5a623"
  error: "#ef4444"

typography:
  display-xl:
    fontFamily: "Newsreader, Tiempos Headline, serif"
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "Newsreader, Tiempos Headline, serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: "Newsreader, Tiempos Headline, serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Newsreader, Tiempos Headline, serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1.5px
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
    height: 40px
    backdropBlur: 12px
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  button-icon-circular:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 36px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  top-nav:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 64px
    backdropBlur: 16px
  hero-band:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: 96px
  hero-illustration-card:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    backdropBlur: 12px
  feature-card:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
    backdropBlur: 12px
  product-mockup-card-dark:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  code-window-card:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 24px
  model-comparison-card:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
    backdropBlur: 12px
  pricing-tier-card:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
    backdropBlur: 12px
  pricing-tier-card-featured:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.primary}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  callout-card-warm:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  connector-tile:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
    backdropBlur: 12px
  text-input:
    backgroundColor: "{colors.surface-dark}"
    borderColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  text-input-focused:
    backgroundColor: "{colors.surface-dark-elevated}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  prompt-container-hero:
    width: "100%"
    maxWidth: "768px"
    margin: "0 auto"
    display: flex
    flexDirection: column
    alignItems: center
    gap: "{spacing.lg}"
  prompt-card-floating:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "16px 20px"
    shadow: "0 8px 24px rgba(0,0,0,0.4)"
  kbd-glyph:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.hairline-strong}"
    textColor: "{colors.body-strong}"
    typography: "{typography.code}"
    fontSize: "11px"
    padding: "2px 6px"
    rounded: "{rounded.sm}"
  suggestion-chip:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.body-strong}"
    typography: "{typography.code}"
    fontSize: "12px"
    padding: "6px 14px"
    rounded: "{rounded.sm}"
    hoverBackgroundColor: "{colors.surface-dark-elevated}"
    hoverBorderColor: "{colors.hairline-strong}"
    hoverTextColor: "{colors.ink-deep}"
  cookie-consent-card:
    backgroundColor: "{colors.surface-dark}"
    borderColor: "{colors.hairline}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
  category-tab:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    padding: 8px 14px
    rounded: "{rounded.md}"
  category-tab-active:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
    backdropBlur: 12px
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
    backdropBlur: 12px
  badge-warm:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  cta-band-warm:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  cta-band-glass:
    backgroundColor: "{colors.surface-card}"
    borderColor: "{colors.surface-card-border}"
    textColor: "{colors.ink}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
    backdropBlur: 12px
  footer:
    backgroundColor: transparent
    borderColor: "{colors.hairline}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    padding: 64px
---

# Design System: Stark-design-analysis

## Overview

Stark is a premium, developer-focused interface that anchors on a **terminal-inspired grid canvas** (`{colors.canvas}` — #1e1e1e). Unlike standard SaaS brands that rely on flat solid backgrounds or heavy drop shadows, Stark builds its visual hierarchy through **glassmorphism**—semitransparent panels with subtle 1px borders that blur the underlying technical grid. 

Brand voltage comes from the juxtaposition of highly technical environments (mono code blocks, stark dark contrast) with editorial serif elements. The system uses a **monochrome tone** (`{colors.primary}` — #ffffff / #2a2a2a) for active targets and pairs an editorial **Newsreader** serif display with **Inter** and **JetBrains Mono**. This combination feels like a deep-engineering tool designed by an editorial publication.

The system has three surface modes that orchestrate the page's rhythm:
1. **Grid Canvas** (`{colors.canvas}`) — The default body floor with a subtle SVG grid pattern.
2. **Glass Cards** (`{colors.surface-card}`) — Floating feature and content cards utilizing backdrop-blur.
3. **Dark Opaque Surfaces** (`{colors.surface-dark}`) — Pure solid panels used specifically for code editors and inputs to ensure maximum legibility.

**Key Characteristics:**
- Terminal-inspired canvas (`{colors.canvas}` — #1e1e1e) with high-contrast text (`{colors.ink}` — #f9fafb). 
- Monochrome primary CTA (`{colors.primary}` — #ffffff / #2a2a2a). Used to highlight active states and actions without breaking the dark aesthetic.
- Editorial display headlines via Newsreader (weight 600, negative letter-spacing) paired with humanist sans body (Inter) and strict monospace (JetBrains Mono) for all technical UI.
- Glassmorphic panels (`{colors.surface-card}`) that replace traditional drop-shadows with `backdrop-blur` and `1px rgba(255,255,255,0.1)` borders.
- Border radius is hierarchical: `{rounded.md}` (8px) for strict technical inputs and code windows, `{rounded.lg}` (12px) for glass content cards, and `{rounded.pill}` strictly reserved for primary/secondary buttons and badges.
- Section rhythm `{spacing.section}` (96px) — modern-SaaS standard. Internal card padding stays generous at `{spacing.xl}` (32px).
- **Strict No-Emoji & No-Text-Bracket Rule:** Emojis and unnecessary text brackets (e.g. `[Stark]`, `[Sidebar]`, `[+] Nuevo Chat`) are strictly forbidden anywhere in the interface, system badges, buttons, and status labels. Pair clean minimalist vector icons (**Lucide Icons** stroke 1.5px-1.75px) with natural monospaced text labels (`Berkeley Mono`). Brackets `<kbd>` are reserved strictly for actual keyboard shortcut keycaps.
- **Mandatory Dropup Rule:** All selection controls (`CustomSelect`) and popover menus MUST open upwards (**Dropup** menu positioning: `bottom: calc(100% + 6px)`). Traditional downwards dropdown menus are strictly forbidden.

## Colors

### Brand & Accent
- **Monochrome / Primary** (`{colors.primary}` — #ffffff / #2a2a2a): The signature Stark accent. Used on every primary CTA background and active states.
- **Primary Active** (`{colors.primary-active}` — #f4f4f5 / #3a3a3a): The press / hover variant.
- **Primary Disabled** (`{colors.primary-disabled}` — #3f3f46): A desaturated, muted gray state.
- **Accent Teal** (`{colors.accent-teal}` — #5db8a6): Used sparingly on secondary product surfaces (terminal status indicators, success logs).
- **Accent Amber** (`{colors.accent-amber}` — #e8a55a): A companion warm-tone used on category badges and warning highlights.

### Surface
- **Canvas** (`{colors.canvas}` — #1e1e1e): The default page floor. A deep, rich dark gray.
- **Surface Soft** (`{colors.surface-soft}` — #262626): Slightly elevated solid background for section dividers.
- **Surface Card (Glass)** (`{colors.surface-card}` — rgba 5% white): The primary container color. Used with `backdrop-blur` for feature cards and navigation.
- **Surface Card Border** (`{colors.surface-card-border}` — rgba 10% white): The crucial 1px hairline that gives the glassmorphism its crisp edge.
- **Surface Dark** (`{colors.surface-dark}` — #2d2d2d): Solid, opaque dark. Used exclusively for code editor mockups and text inputs where blur would compromise readability.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #3a3a3a): Hover states for dark inputs or nested panels inside code mockups.
- **Hairline** (`{colors.hairline}` — #3f3f46): The 1px solid border tone on opaque dark surfaces.

### Text
- **Ink** (`{colors.ink}` — #f9fafb): All headlines and primary text. High-contrast off-white.
- **Body Strong** (`{colors.body-strong}` — #d1d5db): Emphasized paragraphs, lead text.
- **Body** (`{colors.body}` — #9ca3af): Default running-text color.
- **Muted** (`{colors.muted}` — #6b7280): Sub-headings, placeholders, footer-adjacent secondary text.
- **On Primary** (`{colors.on-primary}` — #f9fafb): Text on the warm primary buttons.
- **On Dark** (`{colors.on-dark}` — #f9fafb): Text inside solid dark panels.

### Semantic
- **Success** (`{colors.success}` — #10b981): Green status dots, "compiled successfully" indicators.
- **Warning** (`{colors.warning}` — #f5a623): Pending states.
- **Error** (`{colors.error}` — #ef4444): Validation errors in terminal mockups.

## Typography

### Font Family
The system runs **Berkeley Mono** (with **IBM Plex Mono** and **JetBrains Mono** as high-trust open-source fallbacks) across **100% of the application typography**. From display headlines down to small captions, navigation, and buttons, every text role is monospaced.

The typography split is 100% monospaced:
- Berkeley Mono / IBM Plex Mono (weight 700) → h1, h2, h3, brand titles, display headlines
- Berkeley Mono / IBM Plex Mono (weight 400-500) → body text, navigation, buttons, captions, form inputs, and terminal output

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 600 | 1.05 | -1.5px | Homepage h1 ("Design meets Engineering") — Newsreader |
| `{typography.display-lg}` | 48px | 600 | 1.1 | -1px | Section heads — Newsreader |
| `{typography.display-md}` | 36px | 600 | 1.15 | -0.5px | Sub-section heads — Newsreader |
| `{typography.display-sm}` | 28px | 600 | 1.2 | -0.3px | Pricing tier names, callout headlines — Newsreader |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | Pricing plan size labels — Inter |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | Feature card titles, intro paragraphs |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | Connector tile titles, list labels |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | Default running-text — Inter |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | Category tags, "NEW" badges |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | Code blocks and form inputs — JetBrains Mono |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | Standard button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu items |

### Principles
Display sizes use weight 600 (semibold). Negative letter-spacing (-0.3 to -1.5px) is essential — Newsreader without it reads as unrefined. The serif character is what gives Stark its authoritative, considered voice.

Body type stays at weight 400 for paragraphs, weight 500 for labels. The monospace font isn't just for code; it's used for the main text inputs (`{component.text-input}`) to constantly reinforce the platform's technical nature.

### Note on Font Substitutes
If Newsreader is unavailable, **Cormorant Garamond** or **Playfair Display** at weight 600 are the closest open-source approximations. For Inter, **Roboto** or **San Francisco** are acceptable fallbacks. For JetBrains Mono, **Fira Code** or **IBM Plex Mono** match the technical voice.

## Layout

### Spacing System
- **Base unit:** 4px grid.
- **Tokens:** `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.section}` 48px.
- **Card & Input padding:** `{spacing.lg}` (16px) to `{spacing.xl}` (24px) for optimal readability and touch targets.
- **Sidebar padding:** 20px vertical × 16px horizontal with 12px gap between mode buttons.
- **Message bubbles padding:** 18px vertical × 22px horizontal with line-height 1.65.
- **Modals padding:** 28px internal padding with 16px grid gap.

### Grid & Container
- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero often heavily centers on a primary terminal input.
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.
- **Pricing grid:** 3-up at desktop, 1-up at mobile.

### Whitespace Philosophy
Glassmorphism requires negative space to breathe. Because the cards blur the background, placing them too close together creates visual mud. Internal padding inside `{component.feature-card}` stays generous (32px), letting the type contrast sharply against the frosted background.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Canvas floor, footer |
| Surface Solid | `{colors.surface-dark}` + 1px hairline | Form inputs, code editors |
| Glass Base | 5% rgba + 12px blur + 1px rgba border | Feature cards, pricing cards, badges |
| Glass Elevated | 10% rgba + 16px blur + 1px rgba border | Top nav, sticky panels, modals |

The elevation philosophy is **glass-blur first, shadow never**. Stark eschews traditional black drop-shadows. Depth is entirely dictated by how heavily the background grid is blurred and the brightness of the 1px transparent border catching the light.

### Decorative Depth
- The Canvas background features a subtle SVG dot or grid pattern. This pattern is crucial because it provides texture for the `backdrop-blur` of the glass cards to interact with.
- Code editor mockups carry their own internal depth: syntax-highlighted text, line numbers in `{colors.muted}`, and active-line highlights in `{colors.surface-dark-elevated}`.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Reserved for tiny tooltips |
| `{rounded.sm}` | 6px | Small inner elements, scrollbar thumbs |
| `{rounded.md}` | 8px | Text inputs, code blocks, category tabs |
| `{rounded.lg}` | 12px | Content cards (glass feature, pricing, code-window) |
| `{rounded.xl}` | 16px | Hero illustration container, large marquee panels |
| `{rounded.pill}` | 9999px | Badge pills, primary and secondary CTA buttons |
| `{rounded.full}` | 9999px / 50% | Icon buttons |

### Photography & Illustrations
Stark rarely uses lifestyle photography. Instead it uses:
- High-fidelity code editor mockups.
- Abstract geometric shapes floating behind glassmorphic panels.
- Terminal output mockups with monospace text.

### Iconography & Minimalist Icon Standard
The system adopts **Lucide Icons** (`lucide-react`) as its official minimalist vector icon standard:
- **Stroke Weight:** Thin, crisp stroke width (`strokeWidth: 1.5` to `1.75`).
- **Icon Sizing Scale:** `14px` for inline action pills, `16px` for buttons & navigation, `18px` for section headers.
- **Color System:** 100% Monochrome vector rendering (`stroke="currentColor"`), matching `--colors-body-strong` or `--colors-ink`.
- **Combination:** Paired with Berkeley Mono monospaced text labels and ASCII bracket markers for maximum technical precision.

## Components

### Top Navigation

**`top-nav`** — Glassmorphic nav bar pinned to the top. 64px tall, `{colors.surface-card}` background with 16px `backdrop-blur` and `{colors.surface-card-border}` bottom border. Menu items in `{typography.nav-link}`. 

### Buttons

**`button-primary`** — The signature active CTA. Background `{colors.primary}` (#ffffff / #2a2a2a), text `{colors.on-primary}` (black/white), type `{typography.button}` (Inter 14px / 500), padding 12px × 20px, height 40px, rounded `{rounded.pill}`.

**`button-secondary`** — Glass button. Background `{colors.surface-card}` (rgba 5%), text `{colors.ink}`, 1px glass border, 12px `backdrop-blur`, same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over solid `{colors.surface-dark}` cards. Background `{colors.surface-dark-elevated}`, text `{colors.on-dark}`.

**`button-text-link`** — Inline text button, no background. 

**`button-icon-circular`** — 36px circular icon button. Glass background, hairline border, ink-color icon. 

**`text-link`** — Inline body links in `{colors.primary}`. Underlined on press.

### Cards & Containers

**`hero-band`** — Transparent hero with a centered layout: h1 + sub-headline + prominent terminal input. Vertical padding `{spacing.section}` (96px).

**`hero-illustration-card`** — A large container holding the hero's main visual. Background `{colors.surface-card}` with `backdrop-blur`, rounded `{rounded.xl}`.

**`feature-card`** — Used in 3-up feature grids. Background `{colors.surface-card}` (glass), rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px). Carries a small icon at top, an `{typography.title-md}` headline, and a body description in `{typography.body-md}`.

**`product-mockup-card-dark`** — Solid opaque card showing actual UI chrome. Background `{colors.surface-dark}`, rounded `{rounded.lg}`, internal padding `{spacing.xl}`. 

**`code-window-card`** — Solid dark card showing a code editor with line numbers, syntax-highlighted code in `{typography.code}` (JetBrains Mono). Background `{colors.surface-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}`.

**`model-comparison-card`** — Glassmorphic card used for comparative data. Background `{colors.surface-card}`, rounded `{rounded.lg}`, padding `{spacing.xl}`.

**`pricing-tier-card`** — Standard tier card. Glass background (`{colors.surface-card}`), rounded `{rounded.lg}`, padding `{spacing.xl}`. Price in `{typography.display-sm}` (Newsreader serif), feature checklist in `{typography.body-md}`.

**`pricing-tier-card-featured`** — The featured tier. Background flips to solid `{colors.surface-dark}`, border changes to `{colors.primary}`. The opaque dark surface mixed with the primary outline IS the featured-tier signal.

**`callout-card-warm`** — A full-bleed monochrome card. Background `{colors.primary}` (#ffffff / #2a2a2a), text `{colors.on-primary}`, rounded `{rounded.lg}`, padding `{spacing.xxl}`.

**`connector-tile`** — Used on integration grids. Glass background, rounded `{rounded.lg}`, padding 20px. 

### Inputs & Forms

**`text-input`** — Standard text input mimicking a terminal prompt. Background `{colors.surface-dark}` (solid, not glass), text `{colors.ink}`, type `{typography.code}` (JetBrains Mono), rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. Transparent border by default.

**`text-input-focused`** — Focus state. Background elevates to `{colors.surface-dark-elevated}`, border reveals itself using `{colors.surface-card-border}`.

**`cookie-consent-card`** — Bottom-right floating dark banner. Background `{colors.surface-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}`.

### Tags / Badges

**`badge-pill`** — Small glass pill label. Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.caption}`, rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-warm`** — Solid fill badge for "NEW" or "BETA". Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`.

### Tab / Filter

**`category-tab`** + **`category-tab-active`** — Used in sub-nav rows. Inactive: transparent background, `{colors.muted}` text. Active: `{colors.surface-card}` (glass) background, `{colors.ink}` text. Padding 8px × 14px, rounded `{rounded.md}`.

### CTA / Footer

**`cta-band-warm`** — Full-width primary CTA card. Solid `{colors.primary}` fill, white type, rounded `{rounded.lg}`, padding 64px. 

**`cta-band-glass`** — Alternative pre-footer band. Glass background (`{colors.surface-card}`), text `{colors.ink}`, rounded `{rounded.lg}`, padding 64px.

**`footer`** — Transparent footer that closes every page. Text `{colors.muted}`, 1px `{colors.hairline}` top border. Vertical padding 64px.

## Do's and Don'ts

### Do
- Anchor every page on the terminal grid canvas. The subtle SVG background grid is required for the glassmorphism to look premium.
- Use Newsreader serif for every display headline. Pair with Inter sans body. Negative letter-spacing on display sizes is non-negotiable.
- Reserve `{colors.primary}` (warm earth) for primary CTAs and full-bleed `{component.callout-card-warm}` moments. 
- Use `{component.text-input}` with JetBrains Mono to reinforce the developer-tool aesthetic.
- Pair `{component.feature-card}` (glass) with `{component.code-window-card}` (solid dark). The glass-to-solid rhythm creates optical depth.
- Apply `{spacing.section}` (96px) between major bands.

### Don't
- Don't use traditional drop-shadows (box-shadow) on glass cards. The blur and 1px transparent border are the only elevation tools you need.
- Don't bold serif display weight. Newsreader at 700 reads as heavy; the system stays at 600.
- Don't use cool blue or saturated cyan as a brand accent. The warm earth tone is the brand voltage.
- Don't apply glassmorphism to code editors or form inputs. Technical reading requires opaque backgrounds for AAA contrast.
- Don't use Inter for display headlines. The serif character is the brand voice.
- Don't mix the `rounded.pill` shape with `rounded.md` on standard content cards. Pills are strictly for buttons and badges.
- Don't use emojis or unnecessary text brackets (e.g., `[Stark]`, `[Sidebar]`, `[+] Nuevo Chat`) under any circumstances anywhere in the application interface, status badges, buttons, or prompt elements. All labels must pair Lucide vector icons with natural monospaced text. Brackets `<kbd>` are reserved strictly for keyboard shortcuts.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger nav; hero h1 64→32px; feature grids 1-up; connector tiles 2-up; pricing 1-up; glass blur reduced to improve performance |
| Tablet | 768–1024px | Top nav stays horizontal but tightens; feature cards 2-up; connector tiles 3-up; pricing 2-up |
| Desktop | 1024–1440px | Full top-nav; 3-up feature cards; 4-up or 6-up connector tiles; 3-up pricing tiers |
| Wide | > 1440px | Content stays centered at 1200px max-width |

### Touch Targets
- `{component.button-primary}` at minimum 40 × 40px.
- `{component.button-icon-circular}` at exactly 36 × 36.
- `{component.text-input}` height is 40px.

### Collapsing Strategy
- Top nav collapses to hamburger at < 768px; menu opens as a full-screen glass sheet.
- Hero band collapses to single-column on mobile.
- Feature grids reduce columns rather than scaling cards down.
- Pricing tier cards collapse 3 → 2 → 1; featured-tier opaque surface stays visually distinct at every breakpoint.
- Code-window cards retain code legibility at every breakpoint by allowing horizontal scroll within the card rather than wrapping code lines.

### Image Behavior
- Code blocks inside dark mockups stay at fixed font-size; horizontal scroll on mobile rather than wrapping.
- Abstract geometric assets scale proportionally.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.feature-card}`, `{component.code-window-card}`).
2. Variants of an existing component (`-active`, `-disabled`, `-focused`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. Display headlines stay Newsreader serif 600 with negative tracking. Body stays Inter 400/500. Code stays JetBrains Mono. The split is unbreakable.
6. Glass canvas + solid opaque + warm accent is the trinity. Don't introduce a fourth surface tone.
7. When in doubt about emphasis: bigger Newsreader serif before bolder weight.

## Known Gaps

- Heavy `backdrop-blur` filters can cause scroll stuttering on lower-end mobile devices or outdated browsers (Safari iOS). Media queries should step down the blur radius (e.g., 16px to 8px) on small viewports.
- The SVG grid background asset is assumed but not explicitly tokenized in the color palette. It should be applied to the `body` tag with an opacity no higher than 3%.
- Animation and transition timings (reveal animations, terminal typing effects) are not in scope for this foundations document.
- Form validation states beyond `{component.text-input-focused}` are not extracted — error / success states require specific flow designs.

## Vibe Engineering & Visual Fidelity Guide

Entiendo perfectamente. El código estándar que genera un LLM por defecto usa la paleta y los valores base de Tailwind, y eso siempre resulta en una interfaz genérica y plana. En la metodología de Vibe Engineering, la diferencia entre "se parece" y "es idéntico" radica en las micro-interacciones, los valores arbitrarios de espaciado y, sobre todo, en cómo se maneja la luz (sombras y bordes).

La imagen de Open Design tiene un estilo muy pulido. Aquí están los tres factores de estilo donde Tailwind por defecto falla y cómo forzar los valores exactos para que el diseño cobre vida:

### 1. Las Sombras (Shadows) son demasiado duras

Tailwind usa sombras muy oscuras y concentradas (`shadow-md`). El estilo de la imagen utiliza sombras súper difusas, amplias y con muy baja opacidad para crear esa sensación premium de que los elementos "flotan".

* **El Fix:** Nunca uses `shadow-md` para este estilo. Usa valores arbitrarios como `shadow-[0_12px_40px_rgba(0,0,0,0.06)]`.

### 2. Los Bordes y el Contraste

El borde por defecto `border-gray-200` es muy agresivo. Open Design usa bordes casi imperceptibles combinados con un fondo ligeramente grisáceo (`#fafafa`) para que la tarjeta blanca resalte.

* **El Fix:** Usa `border-black/5` o `border-gray-100` y asegúrate de que el fondo del área principal sea `bg-[#fafafa]`, no blanco puro.

### 3. Curvas Suaves (Border Radius)

El `rounded-xl` a veces no es suficiente para ese efecto de "caja de herramientas moderna". La caja principal del prompt usa un radio mucho más amplio.

---

### Reconstrucción Exacta del Contenedor del Prompt

Copia y pega este componente exactamente así en tu entorno. He inyectado los valores arbitrarios necesarios para clonar la tensión visual, el tamaño de la fuente (`text-[15px]`) y los estilos exactos de los botones internos.

```tsx
export function ExactPromptContainer() {
  return (
    <div className="relative w-full max-w-3xl mx-auto bg-white rounded-[24px] border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-2 transition-all duration-300 focus-within:shadow-[0_16px_50px_rgba(0,0,0,0.08)] focus-within:border-gray-200">
      
      {/* Textarea */}
      <textarea 
        className="w-full resize-none bg-transparent pt-4 px-4 pb-14 text-[15px] leading-[1.6] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 min-h-[140px]" 
        placeholder="Turn the tweet thread below into an interactive knowledge-base article. Design it as if it were a premium learning workspace..." 
      />
      
      {/* Controles Izquierdos (Sparkle + Texto Mono) */}
      <div className="absolute bottom-3 left-4 flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </button>
        <span className="text-[12px] text-gray-400 font-mono tracking-tight flex items-center gap-1.5">
          ↵ to run 
          <kbd className="px-1.5 py-0.5 rounded-md bg-[#f4f4f5] border border-gray-200 text-gray-500 shadow-[0_1px_0_rgba(0,0,0,0.05)]">Shift</kbd> 
          + 
          <kbd className="px-1.5 py-0.5 rounded-md bg-[#f4f4f5] border border-gray-200 text-gray-500 shadow-[0_1px_0_rgba(0,0,0,0.05)]">↵</kbd> 
          for new line
        </span>
      </div>
      
      {/* Botón Principal (Monocromo) */}
      <div className="absolute bottom-3 right-3">
        <button className="w-9 h-9 flex items-center justify-center rounded-full bg-[#18181b] text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:bg-[#27272a] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
        </button>
      </div>
      
    </div>
  );
}
```

### Reconstrucción de los Botones de Sugerencia (Pills)

Los botones inferiores no son simples fondos grises. Tienen un fondo blanco sobre el lienzo casi blanco, con una sombra minúscula y un texto muy específico.

```tsx
export function SuggestionChip({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-gray-200/80 text-[13px] text-gray-600 font-medium shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
      <svg className="text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      {label}
    </button>
  );
}
```

## 6. Deep Layout & Spacing Foundations (Codebase Design Synthesis)

### Spatial Grid Scale
The layout follows a strict 4px grid system mapping to CSS variables:
- `--spacing-xxs` (2px): Micro item gap & border padding offsets.
- `--spacing-xs` (4px): Inset element padding, badge spacing, icon gaps.
- `--spacing-sm` (8px): Button internal gaps, pill padding, list item gaps.
- `--spacing-md` (12px): Sub-nav horizontal padding, card header gaps.
- `--spacing-lg` (16px): Section margins, sidebar padding, modal gutters.
- `--spacing-xl` (24px): Card internal padding, hero container gutters.
- `--spacing-xxl` (32px): Desktop chat list padding, band gutters.

### Deep Spatial Seams (Layout Architecture)
The application viewport is split into 3 deep spatial regions separated by clean seams:
1. **Header Navigation Seam (`HeaderBar`):** Fixed 46px top bar housing mode tabs (`Chat General`, `Modo Code`, `Modo Design`), theme switcher, and diagnostic triggers.
2. **Collapsible Glass Sidebar Seam (`Sidebar`):** Fixed 280px width panel with `backdrop-filter: blur(16px)` and smooth collapsible CSS transition (`0px` $\leftrightarrow$ `280px`). Dynamically satisfies all 3 modes (Chat history, Code file explorer, and Design copilot chat).
3. **Main Workbench Viewport (`app-main`):** Takes 100% remaining width and height, mounting `ChatView` (Hero Studio Prompt Container), `CodeView` (Sandbox Workbench Terminal), or `DesignView` (Live Framed Iframe Canvas).

### 100% Monochrome Tokens & Hover Invariants
- Colors are 100% neutral monochrome across both Dark (`#141414`) and Light (`#fafafa`) themes.
- Accent hover colors (e.g. red buttons or blue highlights) are strictly forbidden. All interactive hovers elevate to neutral dark gray (`#383838` in Dark, `#27272a` in Light).
- Selection popover menus (`CustomSelect`) MUST open upwards (**Dropup positioning:** `bottom: calc(100% + 6px)`).
- Iconography standard: Minimalist **Lucide Icons** (`strokeWidth={1.75}`).


