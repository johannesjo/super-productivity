import { InjectionToken } from '@angular/core';
import { encrypt, decrypt } from './encryption';

/**
 * Injection token for the encrypt function.
 * Allows tests to provide a fast mock implementation.
 */
export const ENCRYPT_FN = new InjectionToken<typeof encrypt>('ENCRYPT_FN', {
  providedIn: 'root',
  factory: () => encrypt,
});

/**
 * Injection token for the decrypt function.
 * Allows tests to provide a fast mock implementation.
 */
export const DECRYPT_FN = new InjectionToken<typeof decrypt>('DECRYPT_FN', {
  providedIn: 'root',
  factory: () => decrypt,
});

export type EncryptFn = (data: string, password: string) => Promise<string>;
export type DecryptFn = (data: string, password: string) => Promise<string>;
