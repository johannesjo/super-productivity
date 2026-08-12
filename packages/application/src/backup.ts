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
export const backupAlgorithms = {
  name: 'AES-GCM',
  ivLength: 12,
  saltLength: 16,
  iterations: 150_000,
} as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** TS 6 types Uint8Array as generically-parameterized; crypto wants ArrayBuffer exactly. */
const cryptoBytes = (value: Uint8Array): Uint8Array<ArrayBuffer> =>
  value as unknown as Uint8Array<ArrayBuffer>;

const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const webCrypto = globalThis.crypto;
  const baseKey = await webCrypto.subtle.importKey(
    'raw',
    cryptoBytes(textEncoder.encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webCrypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: cryptoBytes(salt),
      iterations: backupAlgorithms.iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export interface EncryptedBackupFile {
  format: 'noura-backup-encrypted';
  version: 1;
  iterations: number;
  salt: string;
  iv: string;
  payload: string;
}

export const exportEncryptedBackup = async (
  state: DomainState,
  options: EncryptedBackupOptions,
): Promise<EncryptedBackupFile> => {
  const salt = globalThis.crypto.getRandomValues(
    new Uint8Array(backupAlgorithms.saltLength),
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(backupAlgorithms.ivLength));
  const key = await deriveKey(options.passphrase, salt);
  const encoded = textEncoder.encode(
    JSON.stringify({
      format: 'noura-backup',
      version: 1,
      exportedAt: options.now ?? Date.now(),
      state,
    }),
  );
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: cryptoBytes(iv) },
      key,
      cryptoBytes(encoded),
    ),
  );
  return {
    format: 'noura-backup-encrypted',
    version: 1,
    iterations: backupAlgorithms.iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    payload: toBase64(ciphertext),
  };
};

export const importEncryptedBackup = async (
  data: EncryptedBackupFile,
  passphrase: string,
): Promise<DomainState> => {
  if (data.format !== 'noura-backup-encrypted' || data.version !== 1)
    throw new Error('Unsupported encrypted backup format');
  const key = await deriveKey(passphrase, fromBase64(data.salt));
  const plainBytes = new Uint8Array(
    await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: cryptoBytes(fromBase64(data.iv)) },
      key,
      cryptoBytes(fromBase64(data.payload)),
    ),
  );
  const parsed = JSON.parse(textDecoder.decode(plainBytes)) as unknown;
  if (!parsed || typeof parsed !== 'object' || !('state' in parsed)) {
    throw new Error('Encrypted backup does not contain a Noura state');
  }
  return (parsed as { state: DomainState }).state;
};

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
