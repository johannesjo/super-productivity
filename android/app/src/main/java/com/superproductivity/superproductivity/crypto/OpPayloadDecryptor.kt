package com.superproductivity.superproductivity.crypto

import java.security.GeneralSecurityException
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.io.encoding.Base64

/**
 * Cache for Argon2id-derived keys, keyed by the salt embedded in each
 * ciphertext. The JS side derives one salt per (device, process session), so
 * ops arrive with a small set of recurring salts — caching turns the
 * seconds-per-derivation KDF into a one-time cost per remote session.
 *
 * Keys derive from the E2EE password, so any implementation must be cleared
 * when the password changes (BackgroundSyncCredentialStore does this).
 */
interface DerivedKeyCache {
    fun get(saltB64: String): ByteArray?

    fun put(saltB64: String, key: ByteArray)
}

/**
 * Decrypts E2EE SuperSync op payloads for the background reminder worker.
 *
 * Wire format (public contract, packages/sync-core/src/encryption.ts):
 * base64( SALT(16) | IV(12) | AES-256-GCM ciphertext+tag(16) ), key =
 * Argon2id(password, salt, p=1, t=3, m=64 MiB, len=32).
 *
 * Every failure returns null so callers degrade to today's behavior (skip the
 * op for reminder extraction). The legacy PBKDF2 format (IV | ciphertext, no
 * salt) is deliberately unsupported: the worker only fetches freshly written
 * ops, which are always in the current format; legacy input just fails GCM
 * authentication and is skipped.
 */
/**
 * @param deriveOnMiss when false, only cached keys are used and unknown salts
 *   fail fast — for callers on a tight deadline (BroadcastReceiver goAsync
 *   ~10s window) where a seconds-long KDF could get the process killed. The
 *   periodic worker derives and caches, so misses there are transient.
 */
class OpPayloadDecryptor(
    private val password: String,
    private val keyCache: DerivedKeyCache,
    private val logWarn: (String) -> Unit = {},
    private val deriveOnMiss: Boolean = true,
) {

    companion object {
        private const val SALT_LENGTH = 16
        private const val IV_LENGTH = 12
        private const val GCM_TAG_LENGTH_BYTES = 16
        private const val KEY_LENGTH = 32

        // Must match packages/sync-core/src/encryption/argon2.ts exactly —
        // pinned by Argon2Test's "production params" vector.
        private const val ARGON2_PARALLELISM = 1
        private const val ARGON2_ITERATIONS = 3
        private const val ARGON2_MEMORY_KIB = 65536
    }

    /** Returns the decrypted payload JSON, or null if this op can't be read. */
    fun decrypt(ciphertextB64: String): String? {
        val bytes = try {
            Base64.decode(ciphertextB64)
        } catch (e: IllegalArgumentException) {
            logWarn("OpPayloadDecryptor: payload is not valid base64, skipping op")
            return null
        }
        if (bytes.size < SALT_LENGTH + IV_LENGTH + GCM_TAG_LENGTH_BYTES) {
            logWarn("OpPayloadDecryptor: payload too short (${bytes.size} bytes), skipping op")
            return null
        }
        val salt = bytes.copyOfRange(0, SALT_LENGTH)
        val iv = bytes.copyOfRange(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)

        // Cache before verifying the password: a wrong password would otherwise
        // re-run the 64 MiB KDF for every op sharing the salt. Stale entries
        // are cleared when the password changes.
        val saltB64 = Base64.encode(salt)
        val key = keyCache.get(saltB64)
            ?: deriveKey(salt)?.also { keyCache.put(saltB64, it) }
            ?: return null

        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(
                Cipher.DECRYPT_MODE,
                SecretKeySpec(key, "AES"),
                GCMParameterSpec(GCM_TAG_LENGTH_BYTES * 8, iv),
            )
            val offset = SALT_LENGTH + IV_LENGTH
            String(cipher.doFinal(bytes, offset, bytes.size - offset), Charsets.UTF_8)
        } catch (e: GeneralSecurityException) {
            // Wrong password, corrupted data, or a legacy-format payload.
            logWarn("OpPayloadDecryptor: decryption failed (${e.javaClass.simpleName}), skipping op")
            null
        }
    }

    private fun deriveKey(salt: ByteArray): ByteArray? {
        if (!deriveOnMiss) {
            logWarn("OpPayloadDecryptor: no cached key for salt, skipping op (cache-only mode)")
            return null
        }
        return try {
            Argon2.argon2id(
                password = password.toByteArray(Charsets.UTF_8),
                salt = salt,
                parallelism = ARGON2_PARALLELISM,
                memoryKiB = ARGON2_MEMORY_KIB,
                iterations = ARGON2_ITERATIONS,
                outputLength = KEY_LENGTH,
            )
        } catch (e: OutOfMemoryError) {
            // The KDF needs 64 MiB of working memory; on a memory-constrained
            // background worker we skip gracefully rather than crash the process.
            logWarn("OpPayloadDecryptor: not enough memory for key derivation, skipping op")
            null
        }
    }
}
