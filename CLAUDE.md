# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Guidelines

1. Prefer functional programming patterns: Use pure functions, immutability, and avoid side effects where possible.
2. KISS (Keep It Simple, Stupid): Aim for simplicity and clarity in code. Avoid unnecessary complexity and abstractions.
3. DRY (Don't Repeat Yourself): Reuse code where possible. Create utility functions or services for common logic, but avoid unnecessary abstractions.

## Project Overview

Super Productivity is an advanced todo list and time tracking application built with Angular, Electron, and Capacitor for web, desktop, and mobile platforms.

## Essential Commands

### Development

```bash
# Install dependencies
npm i -g @angular/cli
npm i

# Run development server (web)
ng serve  # or npm run startFrontend

# Run with Electron (desktop)
npm start

# Run tests
npm test          # Unit tests
npm run e2e       # E2E tests
npm run lint      # Linting

# Build for production
npm run dist      # All platforms
npm run dist:win  # Windows only
npm run dist:mac:dl  # macOS only
npm run dist:android:prod  # Android production
```

### Testing

- Unit tests: `npm test` or `npm run test:watch` - Uses Jasmine/Karma, tests are co-located with source files (`.spec.ts`)
- E2E tests: `npm run e2e` - Uses Nightwatch, located in `/e2e/src/`
- Linting: `npm run lint` - ESLint for TypeScript, Stylelint for SCSS

## Architecture Overview

### State Management

The app uses NgRx (Redux pattern) for state management. Key state slices:

- Tasks, Projects, Tags - Core entities
- WorkContext - Current working context (project/tag)
- Global config - User preferences
- Feature-specific states in `/src/app/features/`
- Prefer Signals to Observables if possible

### Data Flow

1. **Persistence Layer** (`/src/app/pfapi/`): Handles data storage with multiple adapters (IndexedDB)
2. **Services** (`*.service.ts`): Business logic and state mutations via NgRx
3. **Components**: Subscribe to state via selectors, dispatch actions for changes
4. **Effects**: Handle side effects (persistence, sync, notifications)

### Key Architectural Patterns

- **Feature Modules**: Each major feature in `/src/app/features/` is self-contained with its own model, service, and components
- **Lazy Loading**: Routes use dynamic imports for code splitting
- **Model Validation**: Uses Typia for runtime type validation of data models
- **IPC Communication**: Electron main/renderer communication via defined IPC events in `/electron/shared-with-frontend/ipc-events.const.ts`

### Cross-Platform Architecture

- **Web/PWA**: Standard Angular app with service worker
- **Desktop**: Electron wraps the Angular app, adds native features (tray, shortcuts, idle detection)
- **Mobile**: Capacitor bridges Angular to native Android/iOS

### Data Sync

- Multiple sync providers: Dropbox, WebDAV, local file
- Sync is conflict-aware with timestamp-based resolution
- All sync operations go through `/src/app/imex/sync/`

## Important Development Notes

1. **Type Safety**: The codebase uses strict TypeScript. Always maintain proper typing.
2. **State Updates**: Never mutate state directly. Use NgRx actions and reducers.
3. **Testing**: Add tests for new features, especially in services and state management.
4. **Translations**: UI strings must use the translation service (`T` or `TranslateService`).
5. **Electron Context**: Check `IS_ELECTRON` before using Electron-specific features.
6. **Privacy**: No analytics or tracking. User data stays local unless explicitly synced.

## 🚫 Known Anti-Patterns to Avoid

- `any` or untyped public APIs
- Direct DOM access (use Angular bindings)
- Adding side effects in constructors
- Re-declaring styles that exist in Angular Material theme
- Using deprecated Angular APIs (e.g., `NgModules` when not needed)
