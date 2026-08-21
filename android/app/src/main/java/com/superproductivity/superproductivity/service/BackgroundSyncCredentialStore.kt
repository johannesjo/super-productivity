package com.superproductivity.superproductivity.service

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONException

/**
 * EncryptedSharedPreferences-backed store for background sync credentials.
 * Used by SyncReminderWorker to authenticate against the sync server.
 *
 * Uses AndroidX security-crypto (AES256) so the access token is not stored
 * in plaintext. Falls back to standard SharedPreferences if encryption setup
 * fails (e.g., on devices with broken KeyStore).
 *
 * lastServerSeq is stored per-account (keyed by baseUrl hash) to prevent
 * account-switching bugs where the old seq is used with new credentials.
 */
object BackgroundSyncCredentialStore {
    private const val TAG = "BgSyncCredStore"
    private const val PREFS_NAME = "SuperProductivitySync"
    private const val KEY_BASE_URL = "BASE_URL"
    private const val KEY_ACCESS_TOKEN = "ACCESS_TOKEN"
    private const val KEY_SEQ_PREFIX = "LAST_SERVER_SEQ_"
    private const val KEY_ENCRYPTION_PASSWORD = "ENCRYPTION_PASSWORD"
    private const val KEY_DERIVED_KEY_CACHE = "DERIVED_KEY_CACHE"

    /**
     * Each remote (device, process session) contributes one salt; a handful of
     * active devices is the realistic ceiling, so a small cap suffices.
     */
    private const val MAX_CACHED_KEYS = 12

    data class Credentials(
        val baseUrl: String,
        val accessToken: String
    )

    private fun getPrefs(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context.applicationContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context.applicationContext,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to standard SharedPreferences if KeyStore is broken
            Log.w(TAG, "EncryptedSharedPreferences unavailable, falling back to standard", e)
            context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        }
    }

    @Synchronized
    fun save(context: Context, baseUrl: String, accessToken: String) {
        val prefs = getPrefs(context)
        val previousToken = prefs.getString(KEY_ACCESS_TOKEN, null)
        val editor = prefs.edit()
            .putString(KEY_BASE_URL, baseUrl)
            .putString(KEY_ACCESS_TOKEN, accessToken)
        // Reset seq when access token changes (account switch on same server)
        if (previousToken != null && previousToken != accessToken) {
            editor.putLong(seqKey(baseUrl), 0L)
        }
        editor.commit()
    }

    @Synchronized
    fun get(context: Context): Credentials? {
        val prefs = getPrefs(context)
        val baseUrl = prefs.getString(KEY_BASE_URL, null) ?: return null
        val accessToken = prefs.getString(KEY_ACCESS_TOKEN, null) ?: return null
        if (baseUrl.isEmpty() || accessToken.isEmpty()) return null
        return Credentials(baseUrl, accessToken)
    }

    @Synchronized
    fun clear(context: Context) {
        getPrefs(context).edit()
            .remove(KEY_BASE_URL)
            .remove(KEY_ACCESS_TOKEN)
            .remove(KEY_ENCRYPTION_PASSWORD)
            .remove(KEY_DERIVED_KEY_CACHE)
            .commit()
    }

    /**
     * Stores the E2EE password so the background worker can decrypt op
     * payloads (SuperSync encrypts payloads end-to-end since #8670).
     * Cached derived keys are password-dependent, so they are dropped on change.
     */
    @Synchronized
    fun setEncryptionPassword(context: Context, password: String) {
        val prefs = getPrefs(context)
        if (prefs.getString(KEY_ENCRYPTION_PASSWORD, null) == password) return
        prefs.edit()
            .putString(KEY_ENCRYPTION_PASSWORD, password)
            .remove(KEY_DERIVED_KEY_CACHE)
            .commit()
    }

    @Synchronized
    fun getEncryptionPassword(context: Context): String? {
        return getPrefs(context).getString(KEY_ENCRYPTION_PASSWORD, null)
    }

    @Synchronized
    fun clearEncryptionPassword(context: Context) {
        getPrefs(context).edit()
            .remove(KEY_ENCRYPTION_PASSWORD)
            .remove(KEY_DERIVED_KEY_CACHE)
            .commit()
    }

    /** @see SharedPrefsDerivedKeyCache */
    @Synchronized
    fun getCachedDerivedKey(context: Context, saltB64: String): String? {
        val entries = readKeyCache(getPrefs(context))
        for (i in 0 until entries.length()) {
            val entry = entries.optJSONArray(i) ?: continue
            if (entry.optString(0) == saltB64) return entry.optString(1)
        }
        return null
    }

    /** @see SharedPrefsDerivedKeyCache */
    @Synchronized
    fun putCachedDerivedKey(context: Context, saltB64: String, keyB64: String) {
        val prefs = getPrefs(context)
        val entries = readKeyCache(prefs)
        val updated = JSONArray()
        // Newest first; re-adding a salt moves it to the front, oldest fall off
        updated.put(JSONArray().put(saltB64).put(keyB64))
        for (i in 0 until entries.length()) {
            if (updated.length() >= MAX_CACHED_KEYS) break
            val entry = entries.optJSONArray(i) ?: continue
            if (entry.optString(0) != saltB64) updated.put(entry)
        }
        prefs.edit().putString(KEY_DERIVED_KEY_CACHE, updated.toString()).commit()
    }

    private fun readKeyCache(prefs: SharedPreferences): JSONArray {
        val raw = prefs.getString(KEY_DERIVED_KEY_CACHE, null) ?: return JSONArray()
        return try {
            JSONArray(raw)
        } catch (e: JSONException) {
            Log.w(TAG, "Corrupt derived-key cache, resetting")
            JSONArray()
        }
    }

    @Synchronized
    fun getLastServerSeq(context: Context, baseUrl: String): Long {
        return getPrefs(context).getLong(seqKey(baseUrl), 0L)
    }

    @Synchronized
    fun setLastServerSeq(context: Context, baseUrl: String, seq: Long) {
        getPrefs(context).edit()
            .putLong(seqKey(baseUrl), seq)
            .commit()
    }

    private fun seqKey(baseUrl: String): String {
        return KEY_SEQ_PREFIX + baseUrl.hashCode()
    }
}
