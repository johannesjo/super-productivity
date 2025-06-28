# Plugin Lazy Loading Implementation

## Overview

Implemented lazy loading for the plugin system to improve startup performance by deferring plugin code loading until actually needed.

## Key Changes

### 1. Plugin State Management

- Added `PluginState` model to track loading status:
  - `not-loaded`: Plugin discovered but code not loaded
  - `loading`: Plugin code is being loaded
  - `loaded`: Plugin fully loaded and ready
  - `error`: Plugin failed to load

### 2. Discovery Phase

- `initializePlugins()` now only discovers plugins without loading code
- Built-in plugins: Load manifests from predefined paths
- Uploaded plugins: Parse cached manifests from IndexedDB
- Creates plugin states for all discovered plugins

### 3. On-Demand Loading

- `activatePlugin(pluginId)`: Loads plugin code when needed
- Automatically loads plugins with registered hooks at startup
- Lazy loads when plugin is enabled in UI
- Lazy loads when plugin is set as active side panel

### 4. UI Updates

- Plugin management component shows loading states
- Loading spinner animation while plugins are being activated
- Controls disabled during loading to prevent race conditions
- Real-time updates via plugin states observable

### 5. Side Panel Integration

- `setActiveSidePanelPlugin()` now async to handle lazy loading
- Automatically activates plugins when setting them as side panel
- Transparent lazy loading for side panel activation

## Benefits

1. **Faster Startup**: Only manifests loaded initially, not full plugin code
2. **Memory Efficiency**: Plugins only consume memory when actually used
3. **Better UX**: Users see immediate UI with loading states
4. **Scalability**: Can handle many plugins without startup penalty

## Migration Notes

- Backward compatible - existing plugins work without changes
- `setActiveSidePanelPlugin()` is now async but handles null synchronously
- Plugin instances created on-demand maintain same API

## Technical Details

### State Flow

```
Discovery → not-loaded → [user enables] → loading → loaded
                     ↓                          ↓
                  [error]                    [error]
                     ↓                          ↓
                   error                      error
```

### Loading Triggers

1. User enables plugin in UI
2. Plugin has registered hooks (loaded at startup)
3. Plugin set as active side panel
4. Explicit `activatePlugin()` call

### Key Files Modified

- `plugin-state.model.ts`: New state model
- `plugin.service.ts`: Lazy loading logic
- `plugin-management.component.ts`: UI updates
- `plugin-management.component.html`: Loading indicators

## Future Improvements

1. Preload plugins in background after initial UI render
2. Cache compiled plugin code for faster subsequent loads
3. Plugin dependency resolution for ordered loading
4. Memory management - unload unused plugins after timeout
