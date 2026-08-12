/**
 * Thin notification mapping: centralizes permission flow and the global
 * enable switch so callers publish a friendly payload and leave permission
 * negotiation here. Offline-first: no-op when disabled.
 */
export class NotificationService {
    #notify;
    #isEnabled;
    #permissionAsked = false;
    constructor(options) {
        this.#notify = options.notify;
        this.#isEnabled = options.isEnabled ?? (() => true);
    }
    async notify(notification) {
        if (!this.#isEnabled())
            return false;
        const granted = await this.#ensurePermission();
        if (!granted)
            return false;
        await this.#notify.notify(notification.title, notification.body);
        return true;
    }
    async #ensurePermission() {
        if (this.#permissionAsked)
            return true;
        const granted = await this.#notify.requestPermission();
        if (granted)
            this.#permissionAsked = true;
        return granted;
    }
}
