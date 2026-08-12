import type { DomainState } from '@noura/domain';
export interface EncryptedBackupOptions {
    passphrase: string;
    now?: number;
}
/**
 * Framework-free AES-GCM encrypted backup using the WebCrypto API (available
 * in browsers, workers, Bun, and Tauri's webview). Payload is exported compact
 * and imported back losslessly. Never attaches the passphrase to the data.
 */
export declare const backupAlgorithms: {
    readonly name: "AES-GCM";
    readonly ivLength: 12;
    readonly saltLength: 16;
    readonly iterations: 150000;
};
export interface EncryptedBackupFile {
    format: 'noura-backup-encrypted';
    version: 1;
    iterations: number;
    salt: string;
    iv: string;
    payload: string;
}
export declare const exportEncryptedBackup: (state: DomainState, options: EncryptedBackupOptions) => Promise<EncryptedBackupFile>;
export declare const importEncryptedBackup: (data: EncryptedBackupFile, passphrase: string) => Promise<DomainState>;
