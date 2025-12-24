# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project-Specific Guidelines

1. **ALWAYS** use `npm run checkFile <filepath>` on each `ts` or `scss` file you modify to ensure proper formatting and linting. Unless you want to lint and format multiple files, then use `npm run prettier` and `npm run lint` instead.
2. When creating HTML templates, prefer plain HTML (`<table>`, `<div>`). Keep CSS, nesting, and classes to a minimum. Use Angular Material components where appropriate but sparingly.

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
npm run prettier  # Prettier formatting
npm run lint      # Linting

# Build for production
npm run dist      # All platforms Builds (all available in current environment)

# IMPORTANT: Check individual files before committing
# Example: npm run checkFile src/app/features/tasks/task.service.ts
# Use this command OFTEN when modifying files to ensure code quality
npm run checkFile <filepath>  # Runs prettier and lint on a single file
# executes unit tests of a single spec file
npm run test:file <filepath>
```

### Testing

- Unit tests: `npm test` - Uses Jasmine/Karma, tests are co-located with source files (`.spec.ts`)
- E2E tests: `npm run e2e` - Uses Nightwatch, located in `/e2e/src/`
- Playwright E2E tests: Located in `/e2e/`
  - `npm run e2e:playwright` - Run all tests with minimal output (shows failures clearly)
  - `npm run e2e:playwright:file <path>` - Run a single test file with detailed output
    - Example: `npm run e2e:playwright:file tests/work-view/work-view.spec.ts`
  - `npm run e2e:supersync:file <path>` - Run SuperSync E2E tests (auto-starts the server)
    - Example: `npm run e2e:supersync:file e2e/tests/sync/supersync.spec.ts`
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
3. **Components**: (`*.component.ts`) Subscribe to state via selectors, dispatch actions for changes
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
- Sync is conflict-aware with vector-clock resolution
- All sync operations go through `/src/app/imex/sync/`

## Important Development Notes

1. **Type Safety**: The codebase uses strict TypeScript. Always maintain proper typing.
2. **State Updates**: Never mutate state directly. Use NgRx actions and reducers.
3. **Testing**: Add tests for new features, especially in services and state management.
4. **Translations**: UI strings must use the translation service (`T` or `TranslateService`). When adding translation keys, **only edit `en.json`** - never edit other locale files directly.
5. **Electron Context**: Check `IS_ELECTRON` before using Electron-specific features.
6. **Privacy**: No analytics or tracking. User data stays local unless explicitly synced.
7. **Effects & Remote Sync**: **ALL NgRx effects MUST use `inject(LOCAL_ACTIONS)`** instead of `inject(Actions)`. Effects should NEVER run for remote sync operations - side effects happen exactly once on the originating client. For archive-specific side effects needed on remote clients (writing/deleting from IndexedDB), use `ArchiveOperationHandler` which is called explicitly by `OperationApplierService`. See `src/app/util/local-actions.token.ts` and architecture docs Section 8 in `src/app/core/persistence/operation-log/docs/operation-log-architecture-diagrams.md`.
8. **Avoid Selector-Based Effects**: Prefer action-based effects (`this._actions$.pipe(ofType(...))`) over selector-based effects (`this._store$.select(...)`). Selector-based effects fire whenever the store changes, including during hydration/sync replay, bypassing `LOCAL_ACTIONS` filtering. If you must use a selector-based effect that dispatches actions, guard it with `HydrationStateService.isApplyingRemoteOps()`. See `src/app/features/tag/store/tag.effects.ts` for an example.
9. **Atomic Multi-Entity Changes**: When one action affects multiple entities (e.g., deleting a tag removes it from tasks), use **meta-reducers** instead of effects to ensure all changes happen in a single reducer pass. This creates one operation in the sync log, preventing partial sync and state inconsistency. See `src/app/root-store/meta/task-shared-meta-reducers/` and Part F in the architecture docs.
10. **TODAY_TAG is a Virtual Tag**: TODAY_TAG (ID: `'TODAY'`) must **NEVER** be added to `task.tagIds`. It's a "virtual tag" where membership is determined by `task.dueDay`, and `TODAY_TAG.taskIds` only stores ordering. This keeps move operations uniform across all tags. See `docs/ai/today-tag-architecture.md`.
11. **Event Loop Yield After Bulk Dispatches**: When applying many operations to NgRx in rapid succession (e.g., during sync replay), add `await new Promise(resolve => setTimeout(resolve, 0))` after the dispatch loop. `store.dispatch()` is non-blocking and returns immediately. Without yielding, 50+ rapid dispatches can overwhelm the store and cause state updates to be lost. See `OperationApplierService.applyOperations()` for the reference implementation.

## 🚫 Known Anti-Patterns to Avoid

- `any` or untyped public APIs
- Direct DOM access (use Angular bindings)
- Adding side effects in constructors
- Re-declaring styles that exist in Angular Material theme
- Using deprecated Angular APIs (e.g., `NgModules` when not needed)
- **Using `inject(Actions)` or `ALL_ACTIONS` in effects** - Effects should NEVER run for remote operations. Side effects happen exactly once on the originating client. Always use `inject(LOCAL_ACTIONS)` instead.
- **Selector-based effects that dispatch actions** - Effects starting with `this._store$.select(...)` bypass `LOCAL_ACTIONS` filtering and fire during hydration/sync. Either convert to action-based effects or guard with `HydrationStateService.isApplyingRemoteOps()`.
