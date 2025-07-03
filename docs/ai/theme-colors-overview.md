# Super Productivity Theme Colors Overview

This document provides a comprehensive overview of all background colors and colors used in Super Productivity's theming system.

## Table of Contents

- [Theme Architecture](#theme-architecture)
- [Color Categories](#color-categories)
- [Light Theme Colors](#light-theme-colors)
- [Dark Theme Colors](#dark-theme-colors)
- [Component-Specific Colors](#component-specific-colors)
- [File References](#file-references)

## Theme Architecture

The theming system is built on CSS custom properties (CSS variables) that are defined in:

- `/src/styles/_css-variables.scss` - Main variable definitions
- `/src/styles/themes.scss` - Theme classes and utilities

Themes are applied via body classes:

- Default (Light theme): No class needed
- Dark theme: `body.isDarkTheme`

## Color Categories

### 1. Theme-Independent Colors (Always the Same)

#### Semantic Colors

- `--color-success: #4caf50` - Success/positive actions
- `--color-warning: #ff9800` - Warning states
- `--color-danger: #f44336` - Error/danger states
- `--success-green: #4fa758` - Alternative success color
- `--yellow: #fff400` (overridden to `#ffc107` in light theme)

#### Dark Elevation Colors

Used for elevation in dark theme surfaces:

- `--dark0: rgb(0, 0, 0)` - Pure black
- `--dark1: rgb(30, 30, 30)`
- `--dark2: rgb(34, 34, 34)`
- `--dark3: rgb(36, 36, 36)`
- `--dark4: rgb(39, 39, 39)`
- `--dark4-5: rgb(40, 40, 40)`
- `--dark5: rgb(42, 42, 42)`
- `--dark6: rgb(44, 44, 44)`
- `--dark8: rgb(46, 46, 46)`
- `--dark10: rgb(48, 48, 48)`
- `--dark12: rgb(51, 51, 51)`
- `--dark16: rgb(53, 53, 53)`
- `--dark24: rgb(56, 56, 56)`

#### Overlay Colors

- Dark overlays: `--color-overlay-dark-10` through `--color-overlay-dark-90`
- Light overlays: `--color-overlay-light-05` through `--color-overlay-light-90`

#### Material Design Integration

- `--c-primary: var(--palette-primary-500)` - Primary theme color
- `--c-accent: var(--palette-accent-500)` - Accent color
- `--c-warn: var(--palette-warn-500)` - Warning color

## Light Theme Colors

### Background Colors

| Variable             | Value                | Usage                     |
| -------------------- | -------------------- | ------------------------- |
| `--theme-bg`         | `#f8f8f7`            | Main background           |
| `--theme-bg-darker`  | `rgb(235, 235, 235)` | Darker background variant |
| `--theme-card-bg`    | `#ffffff`            | Card/surface background   |
| `--theme-sidebar-bg` | `var(--theme-bg)`    | Sidebar background        |
| `--task-c-bg`        | `#fff`               | Task background           |
| `--standard-note-bg` | `#ffffff`            | Note background           |

### Text Colors

| Variable                          | Value                   | Usage                |
| --------------------------------- | ----------------------- | -------------------- |
| `--theme-text-color`              | `rgb(44, 44, 44)`       | Primary text         |
| `--theme-text-color-less-intense` | `rgba(44, 44, 44, 0.9)` | Slightly dimmed text |
| `--theme-text-color-muted`        | `rgba(44, 44, 44, 0.6)` | Muted/secondary text |
| `--theme-text-color-most-intense` | `rgb(0, 0, 0)`          | High contrast text   |

### Border & Separator Colors

| Variable                     | Value                 | Usage         |
| ---------------------------- | --------------------- | ------------- |
| `--theme-extra-border-color` | `#dddddd`             | Extra borders |
| `--theme-separator-color`    | `#d0d0d0`             | Separators    |
| `--theme-divider-color`      | `rgba(0, 0, 0, 0.12)` | Dividers      |
| `--theme-grid-color`         | `#dadce0`             | Grid lines    |

### UI Element Colors

| Variable                        | Value                          | Usage                   |
| ------------------------------- | ------------------------------ | ----------------------- |
| `--theme-scrollbar-thumb`       | `#888`                         | Scrollbar thumb         |
| `--theme-scrollbar-thumb-hover` | `#555`                         | Scrollbar thumb hover   |
| `--theme-scrollbar-track`       | `#f1f1f1`                      | Scrollbar track         |
| `--theme-chip-outline-color`    | `rgba(125, 125, 125, 0.4)`     | Chip outlines           |
| `--theme-progress-bg`           | `rgba(127, 127, 127, 0.2)`     | Progress bar background |
| `--theme-select-hover-bg`       | `var(--color-overlay-dark-10)` | Select hover background |

## Dark Theme Colors

### Background Colors

| Variable             | Value           | Usage                        |
| -------------------- | --------------- | ---------------------------- |
| `--theme-bg`         | `var(--dark0)`  | Main background (pure black) |
| `--theme-bg-darker`  | `var(--dark0)`  | Darker variant               |
| `--theme-card-bg`    | `var(--dark2)`  | Card/surface background      |
| `--theme-sidebar-bg` | `var(--dark8)`  | Sidebar background           |
| `--task-c-bg`        | `var(--dark3)`  | Task background              |
| `--task-c-bg-done`   | `var(--dark1)`  | Completed task background    |
| `--standard-note-bg` | `var(--dark16)` | Note background              |

### Text Colors

| Variable                          | Value                      | Usage                |
| --------------------------------- | -------------------------- | -------------------- |
| `--theme-text-color`              | `rgb(235, 235, 235)`       | Primary text         |
| `--theme-text-color-less-intense` | `rgba(235, 235, 235, 0.9)` | Slightly dimmed text |
| `--theme-text-color-muted`        | `rgba(235, 235, 235, 0.6)` | Muted/secondary text |
| `--theme-text-color-most-intense` | `rgb(255, 255, 255)`       | High contrast text   |
| `--standard-note-fg`              | `#eeeeee`                  | Note text color      |

### Border & Separator Colors

| Variable                     | Value                           | Usage         |
| ---------------------------- | ------------------------------- | ------------- |
| `--theme-extra-border-color` | `rgba(255, 255, 255, 0.12)`     | Extra borders |
| `--theme-separator-color`    | `rgba(255, 255, 255, 0.1)`      | Separators    |
| `--theme-divider-color`      | `rgba(255, 255, 255, 0.12)`     | Dividers      |
| `--theme-grid-color`         | `var(--color-overlay-light-10)` | Grid lines    |

### UI Element Colors

| Variable                        | Value                           | Usage                   |
| ------------------------------- | ------------------------------- | ----------------------- |
| `--theme-scrollbar-thumb`       | `#333`                          | Scrollbar thumb         |
| `--theme-scrollbar-thumb-hover` | `#444`                          | Scrollbar thumb hover   |
| `--theme-scrollbar-track`       | `#222`                          | Scrollbar track         |
| `--theme-chip-outline-color`    | `rgba(125, 125, 125, 0.4)`      | Chip outlines           |
| `--theme-select-hover-bg`       | `var(--color-overlay-light-10)` | Select hover background |

## Component-Specific Colors

### Global Error Alert (`/src/styles/components/global-error-alert.scss`)

- Red border: `border: 8px solid red`
- Blue spinner: `border-top: 4px solid #3498db`
- Black border: `border: 1px solid black`

### CDK Drag & Drop

- Drag outline: `outline: 1px dashed var(--c-primary)`
- Drag preview background: `background: var(--theme-bg-lightest)`

### Links

- Link color: `color: var(--c-accent)`

### Blockquotes

- Left border: `border-left: 4px solid rgba(var(--c-accent), 1)`

### Task States

- Current task shadow: `var(--whiteframe-shadow-3dp)` (light) / `var(--whiteframe-shadow-8dp)` (dark)
- Selected task shadow: `var(--whiteframe-shadow-3dp)` (light) / `var(--whiteframe-shadow-4dp)` (dark)

### Date/Time Picker Colors

Light theme:

- `--owl-text-color-strong: var(--color-overlay-dark-90)`
- `--owl-text-color: rgba(0, 0, 0, 0.75)`
- `--owl-light-selected-bg: rgb(238, 238, 238)`

Dark theme:

- `--owl-text-color-strong: var(--color-overlay-light-90)`
- `--owl-text-color: rgba(255, 255, 255, 0.75)`
- `--owl-light-selected-bg: rgba(49, 49, 49, 1)`

## File References

### Core Theme Files

- `/src/styles/_css-variables.scss` - All CSS custom properties definitions
- `/src/styles/themes.scss` - Theme utility classes and material integration

### Component Examples Using Theme Colors

- `/src/app/app.component.scss` - Main app container styling
- `/src/app/core-ui/side-nav/side-nav.component.scss` - Navigation styling
- `/src/app/pages/*/` - Various page components
- `/src/app/features/tasks/` - Task-related components
- `/src/app/ui/` - UI components

### Material Design Integration

The app uses Angular Material CSS variables through the `angular-material-css-vars` library, which provides automatic theme generation based on the primary, accent, and warn colors.

## Usage Guidelines

1. **Always use CSS variables** for colors to ensure theme consistency
2. **Never hardcode colors** except for special cases (like error states)
3. **Test both themes** when adding new components
4. **Use semantic color names** (e.g., `--theme-text-color` instead of specific color values)
5. **Leverage existing overlay colors** for hover states and overlays

## Adding New Colors

When adding new colors:

1. Define them in `/src/styles/_css-variables.scss`
2. Provide both light and dark theme values
3. Use semantic naming that describes the purpose, not the color
4. Document the usage in this file
