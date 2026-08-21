package com.superproductivity.superproductivity.service

import android.content.Context
import android.util.Log
import com.superproductivity.superproductivity.crypto.DerivedKeyCache
import com.superproductivity.superproductivity.crypto.OpPayloadDecryptor
import kotlin.io.encoding.Base64

/**
 * Builds the op-payload decryptor from the mirrored E2EE password, or null
 * when none is stored (E2EE password not yet mirrored, e.g. old JS bundle) —
 * callers then degrade to envelope-only parsing, i.e. pre-fix behavior.
 *
 * @param deriveOnMiss pass false from deadline-bound callers (BroadcastReceiver);
 *   see [OpPayloadDecryptor].
 */
fun buildPayloadDecryptor(
    context: Context,
    logTag: String,
    deriveOnMiss: Boolean = true,
): OpPayloadDecryptor? {
    val password = BackgroundSyncCredentialStore.getEncryptionPassword(context)
        ?.takeIf { it.isNotEmpty() }
        ?: return null
    return OpPayloadDecryptor(
        password = password,
        keyCache = SharedPrefsDerivedKeyCache(context),
        logWarn = { Log.w(logTag, it) },
        deriveOnMiss = deriveOnMiss,
    )
}

/**
 * Persists Argon2id-derived keys in [BackgroundSyncCredentialStore]'s
 * EncryptedSharedPreferences so the seconds-long KDF runs once per remote
 * session salt instead of on every worker wake-up. The store clears the
 * cache whenever the E2EE password changes.
 */
class SharedPrefsDerivedKeyCache(context: Context) : DerivedKeyCache {

    private val appContext = context.applicationContext

    override fun get(saltB64: String): ByteArray? {
        val keyB64 = BackgroundSyncCredentialStore.getCachedDerivedKey(appContext, saltB64)
            ?: return null
        return try {
            Base64.decode(keyB64)
        } catch (e: IllegalArgumentException) {
            null
        }
    }

    override fun put(saltB64: String, key: ByteArray) {
        BackgroundSyncCredentialStore.putCachedDerivedKey(appContext, saltB64, Base64.encode(key))
    }
}
