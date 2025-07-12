// Simple logger helper for sync-md plugin
// Just use PluginAPI.log directly

export const log =
  typeof PluginAPI !== 'undefined'
    ? PluginAPI.log
    : {
        critical: (...args: unknown[]) => console.error('[sync-md]', ...args),
        err: (...args: unknown[]) => console.error('[sync-md]', ...args),
        error: (...args: unknown[]) => console.error('[sync-md]', ...args),
        log: (...args: unknown[]) => console.log('[sync-md]', ...args),
        normal: (...args: unknown[]) => console.log('[sync-md]', ...args),
        info: (...args: unknown[]) => console.info('[sync-md]', ...args),
        verbose: (...args: unknown[]) => console.log('[sync-md]', ...args),
        debug: (...args: unknown[]) => console.debug('[sync-md]', ...args),
        warn: (...args: unknown[]) => console.warn('[sync-md]', ...args),
      };
