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
export class GlobalShortcuts {
  readonly #shortcuts: ShortcutPort;
  readonly #onError: (error: unknown) => void;
  readonly #handles = new Map<string, (() => void) | undefined>();

  constructor(options: GlobalShortcutsOptions) {
    this.#shortcuts = options.shortcuts;
    this.#onError = options.onError ?? (() => undefined);
  }

  async register(input: GlobalShortcut): Promise<void> {
    await this.unregister(input.id);
    try {
      const handle = await this.#shortcuts.register(input.accelerator, input.handler);
      this.#handles.set(input.id, handle);
    } catch (error) {
      this.#onError(error);
    }
  }

  async unregister(id: string): Promise<void> {
    const handle = this.#handles.get(id);
    if (handle) handle();
    this.#handles.delete(id);
  }

  async dispose(): Promise<void> {
    for (const id of [...this.#handles.keys()]) await this.unregister(id);
  }
}
