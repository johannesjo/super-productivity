package com.superproductivity.superproductivity.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import kotlin.io.encoding.Base64

/**
 * The ciphertexts were produced by the REAL JS encrypt()
 * (packages/sync-core, Argon2id + AES-256-GCM) with password
 * "test-encryption-password-123" and distinct session salts — this is the
 * cross-language proof that the Kotlin side can read production op payloads.
 */
class OpPayloadDecryptorTest {

    private class InMemoryKeyCache : DerivedKeyCache {
        val map = mutableMapOf<String, ByteArray>()
        var putCount = 0

        override fun get(saltB64: String): ByteArray? = map[saltB64]

        override fun put(saltB64: String, key: ByteArray) {
            putCount++
            map[saltB64] = key
        }
    }

    private fun newDecryptor(
        cache: InMemoryKeyCache = InMemoryKeyCache(),
        password: String = PASSWORD,
    ): OpPayloadDecryptor = OpPayloadDecryptor(password, cache)

    @Test
    fun `decrypts real sync-core ciphertext for a CRT payload`() {
        assertEquals(CRT_PLAINTEXT, newDecryptor().decrypt(CRT_CIPHERTEXT))
    }

    @Test
    fun `decrypts real sync-core ciphertext with a different session salt`() {
        assertEquals(SCHEDULE_PLAINTEXT, newDecryptor().decrypt(SCHEDULE_CIPHERTEXT))
    }

    @Test
    fun `derives the key only once per salt`() {
        val cache = InMemoryKeyCache()
        val decryptor = newDecryptor(cache)
        assertEquals(CRT_PLAINTEXT, decryptor.decrypt(CRT_CIPHERTEXT))
        assertEquals(CRT_PLAINTEXT, decryptor.decrypt(CRT_CIPHERTEXT))
        assertEquals(1, cache.putCount)
    }

    @Test
    fun `reuses a pre-populated cache across decryptor instances`() {
        val cache = InMemoryKeyCache()
        newDecryptor(cache).decrypt(CRT_CIPHERTEXT)
        assertEquals(CRT_PLAINTEXT, newDecryptor(cache).decrypt(CRT_CIPHERTEXT))
        assertEquals(1, cache.putCount)
    }

    @Test
    fun `cache-only mode returns null on a cold cache but decrypts once primed`() {
        val cache = InMemoryKeyCache()
        val cacheOnly = OpPayloadDecryptor(PASSWORD, cache, deriveOnMiss = false)
        assertNull(cacheOnly.decrypt(CRT_CIPHERTEXT))
        // The periodic worker primes the cache...
        newDecryptor(cache).decrypt(CRT_CIPHERTEXT)
        // ...after which the deadline-bound receiver can decrypt too
        assertEquals(CRT_PLAINTEXT, cacheOnly.decrypt(CRT_CIPHERTEXT))
    }

    @Test
    fun `wrong password returns null`() {
        assertNull(newDecryptor(password = "wrong-password").decrypt(CRT_CIPHERTEXT))
    }

    @Test
    fun `tampered ciphertext fails GCM authentication and returns null`() {
        val bytes = Base64.decode(CRT_CIPHERTEXT)
        bytes[bytes.size - 1] = (bytes[bytes.size - 1].toInt() xor 0x01).toByte()
        assertNull(newDecryptor().decrypt(Base64.encode(bytes)))
    }

    @Test
    fun `invalid base64 returns null`() {
        assertNull(newDecryptor().decrypt("not-base64!!!"))
    }

    @Test
    fun `too-short input returns null without deriving a key`() {
        val cache = InMemoryKeyCache()
        assertNull(newDecryptor(cache).decrypt(Base64.encode(ByteArray(20))))
        assertEquals(0, cache.putCount)
    }

    companion object {
        const val PASSWORD = "test-encryption-password-123"

        const val CRT_PLAINTEXT =
            "{\"actionPayload\":{},\"entityChanges\":[{\"entityType\":\"TASK\"," +
                "\"entityId\":\"task-crt-1\",\"opType\":\"CRT\",\"changes\":{" +
                "\"id\":\"task-crt-1\",\"title\":\"Water plants\"," +
                "\"remindAt\":4102444500000,\"deadlineRemindAt\":4102444700000}}]}"

        const val CRT_CIPHERTEXT =
            "yInMh3KUZFmkCS83epg2CtNuiIkgEa0YXB+kFt8WQ3sRR0a4Y4qJSLABI1u1vZ/7MMTjvm2lJRHP" +
                "+tyojvcwQHLRi3/AJNjuW6f2RlmiWd3BvseQ+6yohZHO1nLR6oST8bG+Z+8919wcgrR//qUxTDVi" +
                "v6LkuzfuPDTgxbReesJzu8H0KahiMK1iwHznRTB/FXHeBHh3agHu4B5i23VPRFLVHpFjyrbqRSje" +
                "Afhx07467A6Z0j4PYAHssN7jOBkMJOh6qA4M8kyMkc53h7R2Y77efjR6tL30wTaurg9IB3gNrySO" +
                "0rLBKV3dvRd9DjlQKIcNCDkFSaQJcu/tU7I="

        const val SCHEDULE_PLAINTEXT =
            "{\"actionPayload\":{\"task\":{\"id\":\"task-sched-1\",\"title\":\"Buy milk\"}," +
                "\"dueWithTime\":4102444800000,\"remindAt\":4102444200000},\"entityChanges\":[]}"

        const val SCHEDULE_CIPHERTEXT =
            "NZGjL4VYD9CYLgZql5KbDLKGIgXfko/I2n2ydKIu8MS6xrPmesgUIS4Vm5aOzZFL9ubGAQ1lqolm" +
                "D+WM/ORvX0SfQAHroLS9hovvqzh5mHFrrY75L/N//JWcLjPx1H+SY3gDTonXZD+fAxWVvmMUUOXt" +
                "lriaR2bztfF9yw3JvnmJEtJ6f7QpZ334czpvY0hg1wNaNDMs1aRNoSTXQD9+6qbWh3faDBShq78p" +
                "UHfyxJulwn+f5Nl2"
    }
}
