import type { ShortcutPort } from './ports';
export interface GlobalShortcut {
    accelerator: string;
    id: string;
    handler: () => void | Promise<void>;
}
export interface GlobalShortcutsOptions {
    shortcuts: ShortcutPort;
    /** Invoked with a captured error when a registration fails (non-fatal). */
    onError?: (error: unknown) => void;
}
/**
 * Registers the framework-neutral global shortcut set. Wraps `ShortcutPort`
 * and tracks an unregister handle per id so callers can replace bindings
 * (e.g. from a shortcut editor) without leaking handles.
 */
export declare class GlobalShortcuts {
    #private;
    constructor(options: GlobalShortcutsOptions);
    register(input: GlobalShortcut): Promise<void>;
    unregister(id: string): Promise<void>;
    dispose(): Promise<void>;
}
