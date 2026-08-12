import type { PlatformPorts } from './index';
import { type CredentialsStore } from './memory-credentials';
export type { CredentialsStore };
/**
 * Browser bindings for the platform port surface. Every capability degrades
 * gracefully when the host omits it (web/assistant/sandbox), and no user
 * content is logged. Tauri replaces this with native plugins in a separate
 * adapter; this file is the zero-dependency web default.
 */
export declare const createWebPlatformPorts: (credentials?: CredentialsStore) => PlatformPorts;
