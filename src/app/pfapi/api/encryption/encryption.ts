import { argon2id } from 'hash-wasm';

const ALGORITHM = 'AES-GCM' as const;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

const base642ab = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

const ab2base64 = (buffer: ArrayBuffer): string => {
  const binary = Array.prototype.map
    .call(new Uint8Array(buffer), (byte: number) => String.fromCharCode(byte))
    .join('');
  return window.btoa(binary);
};

// LEGACY FUNCTIONS
// PBKDF2 functions are only kept for backward compatibility
const _generateKey = async (password: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);
  const ops = {
    name: 'PBKDF2',
    // TODO this is probably not very secure
    // on the other hand: the salt is used for saving the password securely, so maybe it is not important
    // for our specific use case? We would need to need some security expert input on this
    salt: enc.encode(password),
    iterations: 1000,
    hash: 'SHA-256',
  };
  const key = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey'],
  );
  return window.crypto.subtle.deriveKey(
    ops,
    key,
    { name: ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
};

export const generateKey = async (password: string): Promise<string> => {
  const cryptoKey = await _generateKey(password);
  const exportKey = await window.crypto.subtle.exportKey('raw', cryptoKey);
  return ab2base64(exportKey);
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function decryptLegacy(data: string, password: string): Promise<string> {
  const dataBuffer = base642ab(data);
  const iv = new Uint8Array(dataBuffer, 0, IV_LENGTH);
  const encryptedData = new Uint8Array(dataBuffer, IV_LENGTH);
  const key = await _generateKey(password);
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encryptedData,
  );
  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

const _deriveKeyArgon = async (
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> => {
  const derivedBytes = await argon2id({
    password: password,
    salt: salt,
    hashLength: KEY_LENGTH,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536, // 64 MB
    outputType: 'binary',
  });

  return window.crypto.subtle.importKey('raw', derivedBytes, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
};

const decryptArgon = async (data: string, password: string): Promise<string> => {
  const dataBuffer = base642ab(data);
  const salt = new Uint8Array(dataBuffer, 0, SALT_LENGTH);
  const iv = new Uint8Array(dataBuffer, SALT_LENGTH, IV_LENGTH);
  const encryptedData = new Uint8Array(dataBuffer, SALT_LENGTH + IV_LENGTH);
  const key = await _deriveKeyArgon(password, salt);
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encryptedData,
  );
  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
};

export const encrypt = async (data: string, password: string): Promise<string> => {
  const enc = new TextEncoder();
  const dataBuffer = enc.encode(data);
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await _deriveKeyArgon(password, salt);
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    dataBuffer,
  );

  const buffer = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedContent.byteLength);
  buffer.set(salt, 0);
  buffer.set(iv, SALT_LENGTH);
  buffer.set(new Uint8Array(encryptedContent), SALT_LENGTH + IV_LENGTH);

  return ab2base64(buffer.buffer);
};

export const decrypt = async (data: string, password: string): Promise<string> => {
  try {
    return await decryptArgon(data, password);
  } catch (e) {
    // fallback to legacy decryption
    console.log('Legacy decryption fallback due to error:', e);
    return await decryptLegacy(data, password);
  }
};
