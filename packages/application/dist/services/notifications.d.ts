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
export declare class NotificationService {
    #private;
    constructor(options: NotificationServiceOptions);
    notify(notification: AppNotification): Promise<boolean>;
}
