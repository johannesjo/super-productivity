import type { NotificationPort } from './ports';

export interface NotificationServiceOptions {
  notify: NotificationPort;
  /** Whether notifications are enabled at all (from GlobalConfig). */
  isEnabled?: () => boolean;
}

export interface AppNotification {
  title: string;
  body: string;
  /** Optional routing so consumers can deep-link on click. */
  tag?: string;
}

/**
 * Thin notification mapping: centralizes permission flow and the global
 * enable switch so callers publish a friendly payload and leave permission
 * negotiation here. Offline-first: no-op when disabled.
 */
export class NotificationService {
  readonly #notify: NotificationPort;
  readonly #isEnabled: () => boolean;
  #permissionAsked = false;

  constructor(options: NotificationServiceOptions) {
    this.#notify = options.notify;
    this.#isEnabled = options.isEnabled ?? (() => true);
  }

  async notify(notification: AppNotification): Promise<boolean> {
    if (!this.#isEnabled()) return false;
    const granted = await this.#ensurePermission();
    if (!granted) return false;
    await this.#notify.notify(notification.title, notification.body);
    return true;
  }

  async #ensurePermission(): Promise<boolean> {
    if (this.#permissionAsked) return true;
    const granted = await this.#notify.requestPermission();
    if (granted) this.#permissionAsked = true;
    return granted;
  }
}
