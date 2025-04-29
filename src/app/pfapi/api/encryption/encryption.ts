const ALGORITHM = 'AES-GCM' as const;

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
export async function encrypt(data: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const dataBuffer = enc.encode(data);
  const key = await _generateKey(password);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv },
    key,
    dataBuffer,
  );
  const buffer = new Uint8Array(iv.length + encryptedContent.byteLength);
  buffer.set(iv, 0);
  buffer.set(new Uint8Array(encryptedContent), iv.length);
  return ab2base64(buffer.buffer);
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export async function decrypt(data: string, password: string): Promise<string> {
  const dataBuffer = base642ab(data);
  const iv = new Uint8Array(dataBuffer, 0, 12);
  const encryptedData = new Uint8Array(dataBuffer, 12);
  const key = await _generateKey(password);
  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv },
    key,
    encryptedData,
  );
  const dec = new TextDecoder();
  return dec.decode(decryptedContent);
}

// TESTING CODE
// export const testCrypto = async (): Promise<void> => {
//   const enc = await encrypt('HAHAHHA', '1234');
//   console.log('enc', enc);
//   decrypt(enc, '1234')
//     .then((r) => {
//       console.log('YEAH', r);
//     })
//     .catch((r) => {
//       console.log('NOOO', r);
//     });
//
//   const decrypted = await decrypt(enc, '1234');
//   console.log('decrypted', decrypted);
// };
//
// testCrypto();
//
// (window as any).decrypt = decrypt;
