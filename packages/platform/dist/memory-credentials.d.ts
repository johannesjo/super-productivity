/**
 * In-memory credential store for web contexts. Per AGENTS.md, Noura never
 * persists NouraSync tokens or encryption passphrases; this holds integration
 * OAuth private configs only for the lifetime of the page. Tauri replaces this
 * with a keychain-backed implementation via the platform store plugin.
 */
export interface CredentialsStore {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
}
export declare class MemoryCredentials implements CredentialsStore {
    #private;
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
    keys(): Promise<string[]>;
}
