import { describe, expect, it } from 'vitest';
import { createInitialState, migrateDomainState } from '@noura/domain';
import { exportEncryptedBackup, importEncryptedBackup, } from './index';
describe('encrypted backup (AES-GCM)', () => {
    it('round-trips a domain state losslessly', async () => {
        const state = migrateDomainState(createInitialState(100));
        const encrypted = await exportEncryptedBackup(state, {
            passphrase: 'correct horse battery staple',
        });
        expect(encrypted.format).toBe('noura-backup-encrypted');
        expect(encrypted.payload).not.toContain('inbox');
        const restored = await importEncryptedBackup(encrypted, 'correct horse battery staple');
        expect(restored).toEqual(state);
    });
    it('is different across exports (random IV + salt) and rejects wrong passphrases', async () => {
        const state = migrateDomainState(createInitialState(1));
        const first = await exportEncryptedBackup(state, { passphrase: 'a passphrase' });
        const second = await exportEncryptedBackup(state, { passphrase: 'a passphrase' });
        expect(first.payload).not.toBe(second.payload);
        await expect(importEncryptedBackup(first, 'wrong passphrase')).rejects.toThrow();
    });
    it('rejects unsupported backup formats', async () => {
        const badFile = {
            format: 'noura-backup-encrypted',
            version: 99,
            iterations: 1,
            salt: '',
            iv: '',
            payload: '',
        };
        await expect(importEncryptedBackup(badFile, 'pass')).rejects.toThrow('Unsupported encrypted backup format');
    });
});
