/**
 * Registers the framework-neutral global shortcut set. Wraps `ShortcutPort`
 * and tracks an unregister handle per id so callers can replace bindings
 * (e.g. from a shortcut editor) without leaking handles.
 */
export class GlobalShortcuts {
    #shortcuts;
    #onError;
    #handles = new Map();
    constructor(options) {
        this.#shortcuts = options.shortcuts;
        this.#onError = options.onError ?? (() => undefined);
    }
    async register(input) {
        await this.unregister(input.id);
        try {
            const handle = await this.#shortcuts.register(input.accelerator, input.handler);
            this.#handles.set(input.id, handle);
        }
        catch (error) {
            this.#onError(error);
        }
    }
    async unregister(id) {
        const handle = this.#handles.get(id);
        if (handle)
            handle();
        this.#handles.delete(id);
    }
    async dispose() {
        for (const id of [...this.#handles.keys()])
            await this.unregister(id);
    }
}
