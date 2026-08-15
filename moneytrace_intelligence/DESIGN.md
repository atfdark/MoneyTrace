---
name: MoneyTrace Intelligence
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393b'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1b1b1d'
  surface-container: '#1f1f21'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e4e2e4'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#e4e2e4'
  inverse-on-surface: '#303032'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#b4c5ff'
  on-secondary: '#002a78'
  secondary-container: '#0053db'
  on-secondary-container: '#cdd7ff'
  tertiary: '#b9c7e0'
  on-tertiary: '#233144'
  tertiary-container: '#09182a'
  on-tertiary-container: '#738298'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#131315'
  on-background: '#e4e2e4'
  surface-variant: '#353436'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  card-padding: 20px
  sidebar-width: 280px
---

## Brand & Style

This design system is engineered for high-stakes financial surveillance and criminal intelligence. The aesthetic balances the austerity of enterprise fintech with the cutting-edge feel of AI-driven data forensics. 

The visual language utilizes a **Modern Corporate** foundation infused with **Glassmorphism**. This combination communicates transparency and depth—essential for "looking through" complex data layers to find illicit patterns. The interface must evoke a sense of absolute control, precision, and urgent intelligence. High-density information is mitigated by generous negative space and a strict hierarchical structure, ensuring that investigators can maintain focus during long sessions.

## Colors

The palette is anchored in a deep **Navy Blue (#0F172A)** background to reduce eye strain and provide a "command center" atmosphere. **Electric Blue (#2563EB)** serves as the primary action color, signifying intelligence and connectivity.

Semantic colors are non-negotiable for risk assessment:
- **Critical (#EF4444):** Reserved for immediate threats, high-risk money laundering alerts, and system errors.
- **Warning (#F59E0B):** Used for suspicious activity reports (SARs) and medium-risk entities.
- **Success (#22C55E):** Indicates verified entities, cleared transactions, and healthy system status.

Text hierarchy is managed through Slate grays to ensure the most vital data points (High-contrast white) pop against secondary metadata.

## Typography

The system uses a tri-font strategy to differentiate intent:
- **Manrope** is used for headlines and dashboard titles. Its modern, geometric curves provide a sophisticated, "new-finance" feel.
- **Inter** is the workhorse for all body copy and interface labels, chosen for its exceptional legibility in data-heavy environments.
- **JetBrains Mono** is utilized for transaction hashes, account numbers, and AI-generated logs. This monospaced font ensures that numeric patterns are easy to scan and compare vertically.

All typography should favor a "Left-aligned" standard to maintain a clean vertical rhythm in analytical views.

## Layout & Spacing

This design system employs a **12-column fluid grid** for the main workspace, with a **fixed left-hand navigation sidebar**. 

- **Desktop:** 24px outer margins, 16px gutters. The sidebar is collapsible to an icon-only rail (64px) to maximize data visualization area.
- **Tablet:** 16px outer margins, 12px gutters. Panels stack vertically when they fall below 320px width.
- **Mobile:** 16px outer margins. Complex data tables should switch to "Card View" or horizontal scroll with frozen ID columns.

A strict 4px base-unit scale is used for all internal component spacing to maintain mathematical harmony.

## Elevation & Depth

Depth is established through **Glassmorphism** and **Tonal Layering** rather than traditional heavy shadows.

- **Level 0 (Background):** Deepest Navy (#0F172A).
- **Level 1 (Sub-panels):** Slate (#1E293B) with a 1px border (#334155).
- **Level 2 (Cards/Modals):** Semi-transparent Slate with a 60% opacity, 20px background blur, and a subtle inner-glow (top-down) to simulate light hitting the edge of glass.
- **Interaction:** Hovering over a glass card should increase its background opacity and brighten the border stroke, creating a "lifting" effect without needing a drop shadow.

## Shapes

The design system uses a **Rounded (0.5rem)** base for standard UI components. This softens the "industrial" feel of financial data, making the platform feel approachable and modern.

- **Standard Elements (Buttons, Inputs):** 8px (0.5rem).
- **Large Elements (Cards, Modals):** 16px (1rem).
- **Chips/Badges:** Fully rounded (Pill-shaped) to distinguish them from interactive buttons.
- **Data Points:** Graph nodes and status indicators should use circular shapes to stand out against the rectangular grid.

## Components

### Navigation Sidebar
A dark, semi-transparent vertical bar. Active states use a "Vertical Pill" indicator on the far left in Electric Blue, with the menu icon and text adopting the high-contrast white.

### Stat Cards
Utilize glassmorphism. Headlines should be **Label-caps**, and the primary metric should be **Headline-lg**. Trend indicators (sparklines) are embedded at the bottom of the card with semantic coloring (Green/Red).

### Data Tables
Rows have a subtle 1px bottom border (#1E293B). No zebra striping; instead, use a hover-state change in background brightness. Risk levels are indicated by a 4px vertical "marker" on the leading edge of the row.

### AI Chat Interface
A floating or docked panel using a blurred background. User messages are outlined in Slate; AI responses feature a subtle gradient tint of Electric Blue to signify machine intelligence. Use **JetBrains Mono** for any code or data snippets within the chat.

### Risk Badges
Pill-shaped with a low-opacity background of the semantic color (e.g., Red at 15% opacity) and a high-contrast border and text of the same color.