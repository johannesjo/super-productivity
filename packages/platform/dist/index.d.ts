export interface CredentialsPort {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
}
export interface FilesPort {
    readText(path: string): Promise<string>;
    writeText(path: string, value: string): Promise<void>;
    pickOpen(options?: {
        extensions?: string[];
    }): Promise<string | undefined>;
    pickSave(options?: {
        suggestedName?: string;
    }): Promise<string | undefined>;
}
export interface ClipboardPort {
    readText(): Promise<string>;
    writeText(value: string): Promise<void>;
}
export interface HttpPort {
    request(input: string, init?: RequestInit): Promise<Response>;
}
export interface NotificationsPort {
    requestPermission(): Promise<boolean>;
    notify(title: string, body: string): Promise<void>;
}
export interface ShellPort {
    openExternal(url: string): Promise<void>;
}
export interface DesktopPort {
    setBadge(count?: number): Promise<void>;
    setTrayTitle(title?: string): Promise<void>;
    registerShortcut(accelerator: string, handler: () => void): Promise<() => void>;
    setAutostart(enabled: boolean): Promise<void>;
}
export interface BackupPort {
    exportEncrypted(passphrase?: string): Promise<Uint8Array>;
    importEncrypted(data: Uint8Array, passphrase?: string): Promise<void>;
}
export interface PlatformPorts {
    credentials: CredentialsPort;
    files: FilesPort;
    clipboard: ClipboardPort;
    http: HttpPort;
    notifications: NotificationsPort;
    shell: ShellPort;
    desktop: DesktopPort;
    backup: BackupPort;
}
export declare const isTauri: () => boolean;
