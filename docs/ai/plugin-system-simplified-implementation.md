# Plugin System Simplified Implementation Plan

**Date:** 2025-06-27  
**Goal:** Streamline the plugin system with minimal breaking changes

## Overview

This implementation plan focuses on practical improvements that can be delivered incrementally without disrupting existing plugins.

## Priority 1: Type System Unification (Week 1-2)

### Problem

Currently we have confusing duplicate types:

- `TaskData` (plugin-api) vs `TaskCopy` (internal)
- `ProjectData` vs `ProjectCopy`
- `TagData` vs `TagCopy`

### Solution

1. **Use plugin-api types as the single source of truth**
2. **Remove all internal duplicate types**
3. **Update mappers to be simple type assertions**

### Implementation Steps

#### Step 1: Audit Type Differences

```bash
# Find all usage of duplicate types
grep -r "TaskCopy" src/
grep -r "ProjectCopy" src/
grep -r "TagCopy" src/
```

#### Step 2: Align Internal Models

```typescript
// Before: src/app/features/tasks/task.model.ts
export interface TaskCopy {
  id: string;
  title: string;
  // ... different property names
}

// After: Just re-export from plugin-api
export { TaskData as Task } from '@super-productivity/plugin-api';
```

#### Step 3: Remove Mappers

```typescript
// Before: Complex mapping functions
export function taskCopyToTaskData(task: TaskCopy): TaskData {
  return {
    id: task.id,
    title: task.title,
    // ... property mapping
  };
}

// After: No mapping needed!
// Just use the types directly
```

#### Step 4: Update All References

- Replace `TaskCopy` with `Task` throughout codebase
- Update service methods to use unified types
- Fix any property name differences

### Testing

- [ ] All existing plugins still work
- [ ] Type checking passes
- [ ] No runtime errors

## Priority 2: Lazy Loading (Week 2-3)

### Problem

All plugins load on startup, slowing down the app and using unnecessary memory.

### Solution

Load plugins only when they're actually used.

### Implementation Steps

#### Step 1: Add Loading States

```typescript
interface PluginState {
  manifest: PluginManifest;
  status: 'not-loaded' | 'loading' | 'loaded' | 'error';
  instance?: PluginInstance;
  error?: string;
}
```

#### Step 2: Modify Plugin Service

```typescript
class PluginService {
  private pluginStates = new Map<string, PluginState>();

  async initializePlugins() {
    // Only load manifests, not code
    const manifests = await this.loadAllManifests();
    manifests.forEach((manifest) => {
      this.pluginStates.set(manifest.id, {
        manifest,
        status: 'not-loaded',
      });
    });
  }

  async activatePlugin(id: string): Promise<void> {
    const state = this.pluginStates.get(id);
    if (!state || state.status === 'loaded') return;

    state.status = 'loading';
    try {
      const instance = await this.loadPluginCode(state.manifest);
      state.instance = instance;
      state.status = 'loaded';
    } catch (error) {
      state.error = error.message;
      state.status = 'error';
    }
  }
}
```

#### Step 3: Load on Demand

```typescript
// In UI components
async onPluginButtonClick(pluginId: string) {
  await this.pluginService.activatePlugin(pluginId);
  // Then show plugin UI
}

// For hooks - load when first hook fires
async triggerHook(hook: string, data: any) {
  const pluginsWithHook = this.getPluginsWithHook(hook);
  for (const plugin of pluginsWithHook) {
    if (plugin.status === 'not-loaded') {
      await this.activatePlugin(plugin.id);
    }
    // Then trigger hook
  }
}
```

### Testing

- [ ] App starts faster
- [ ] Plugins load when clicked
- [ ] Hooks still work correctly
- [ ] Memory usage reduced

## Priority 3: Simplified API (Week 3-4)

### Problem

Different API methods for iframe vs plugin.js contexts, complex message passing.

### Solution

Single API interface that works the same everywhere.

### Implementation Steps

#### Step 1: Create Unified API Interface

```typescript
// packages/plugin-api/src/api.ts
export interface PluginAPI {
  // Data methods
  tasks: {
    getAll(): Promise<Task[]>;
    getById(id: string): Promise<Task>;
    create(task: Partial<Task>): Promise<Task>;
    update(id: string, changes: Partial<Task>): Promise<void>;
    delete(id: string): Promise<void>;
  };

  projects: {
    getAll(): Promise<Project[]>;
    create(project: Partial<Project>): Promise<Project>;
    update(id: string, changes: Partial<Project>): Promise<void>;
  };

  // UI methods
  ui: {
    showSnack(message: string, type?: 'success' | 'error'): void;
    showDialog(config: DialogConfig): Promise<void>;
  };

  // Events
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}
```

#### Step 2: Implement for Both Contexts

```typescript
// For plugin.js
class PluginJsAPI implements PluginAPI {
  constructor(private bridge: PluginBridge) {}

  tasks = {
    getAll: () => this.bridge.getTasks(),
    // ... implement all methods
  };
}

// For iframe - same interface!
window.PluginAPI = createIframeAPI(); // Returns same interface
```

#### Step 3: Remove Old APIs

- Deprecate old method names
- Add compatibility layer temporarily
- Update all example plugins

### Testing

- [ ] Same code works in plugin.js and iframe
- [ ] All methods properly typed
- [ ] Backwards compatibility maintained

## Priority 4: Better Error Messages (Week 4)

### Problem

Cryptic error messages make debugging difficult.

### Solution

Clear, actionable error messages with context.

### Implementation Steps

#### Step 1: Create Error Classes

```typescript
class PluginError extends Error {
  constructor(
    message: string,
    public code: string,
    public pluginId: string,
    public context?: any,
  ) {
    super(message);
  }
}

class PluginAPIError extends PluginError {
  constructor(method: string, error: any, pluginId: string) {
    super(
      `Plugin API call failed: ${method}\nReason: ${error.message}`,
      'API_ERROR',
      pluginId,
      { method, originalError: error },
    );
  }
}
```

#### Step 2: Add Context to Errors

```typescript
// Before
throw new Error('Failed');

// After
throw new PluginAPIError('tasks.create', new Error('Title is required'), this.pluginId);
```

#### Step 3: Better Console Output

```typescript
// Custom console for plugins
const pluginConsole = {
  log: (...args) => console.log(`[Plugin: ${pluginId}]`, ...args),
  error: (...args) => console.error(`[Plugin: ${pluginId}]`, ...args),
  warn: (...args) => console.warn(`[Plugin: ${pluginId}]`, ...args),
};
```

### Testing

- [ ] Errors show plugin context
- [ ] Stack traces are useful
- [ ] Common errors have helpful messages

## Priority 5: Developer Tools (Week 5)

### Problem

No good way to develop and test plugins.

### Solution

Simple development mode with hot reload.

### Implementation Steps

#### Step 1: Add Development Mode

```typescript
// In plugin service
class PluginService {
  async loadDevPlugin(path: string) {
    // Watch for file changes
    const watcher = chokidar.watch(path);
    watcher.on('change', () => {
      this.reloadPlugin(path);
    });
  }
}
```

#### Step 2: Plugin Development Server

```bash
# Simple CLI tool
npx @super-productivity/plugin-dev serve ./my-plugin

# Starts local server with:
# - Hot reload
# - TypeScript compilation
# - Error overlay
# - API mocking
```

#### Step 3: Plugin Template

```bash
# Create new plugin from template
npx @super-productivity/plugin-dev create my-plugin

# Generates:
# - manifest.json
# - plugin.ts with types
# - index.html template
# - package.json with dev dependencies
```

### Testing

- [ ] Hot reload works
- [ ] TypeScript compilation
- [ ] Good error messages
- [ ] Easy to get started

## Migration Guide

### For Plugin Developers

#### Type Changes

```typescript
// Old
import { TaskData } from '@super-productivity/plugin-api';

// New - same import, just better types!
import { Task } from '@super-productivity/plugin-api';
```

#### API Changes

```typescript
// Old
PluginAPI.getTasks();
PluginAPI.addTask(data);

// New
PluginAPI.tasks.getAll();
PluginAPI.tasks.create(data);
```

### For Core Developers

1. **Run type migration script**

   ```bash
   npm run migrate:types
   ```

2. **Update imports**

   ```typescript
   // Replace all TaskCopy with Task
   // Remove mapper functions
   ```

3. **Test everything**
   ```bash
   npm test
   npm run e2e
   ```

## Success Criteria

### Week 1-2: Type Unification ✓

- [ ] No more duplicate types
- [ ] All plugins still work
- [ ] Cleaner codebase

### Week 2-3: Lazy Loading ✓

- [ ] 50% faster startup
- [ ] Plugins load on demand
- [ ] Reduced memory usage

### Week 3-4: API Simplification ✓

- [ ] Single API interface
- [ ] Better TypeScript support
- [ ] Backwards compatible

### Week 4: Error Handling ✓

- [ ] Clear error messages
- [ ] Plugin context in errors
- [ ] Easier debugging

### Week 5: Dev Tools ✓

- [ ] Hot reload working
- [ ] Plugin template available
- [ ] Documentation updated

## Notes

- Keep changes incremental and backwards compatible
- Test with all existing plugins after each phase
- Update documentation as we go
- Get community feedback early and often

## Next Steps

1. Review this plan with team
2. Set up tracking for each phase
3. Start with type unification (lowest risk, high reward)
4. Create automated tests for migration
