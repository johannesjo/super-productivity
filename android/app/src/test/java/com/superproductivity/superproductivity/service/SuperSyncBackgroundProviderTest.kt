package com.superproductivity.superproductivity.service

import com.superproductivity.superproductivity.crypto.DerivedKeyCache
import com.superproductivity.superproductivity.crypto.OpPayloadDecryptor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Reproduction of the "background reminders stopped working" bug: SuperSync
 * encrypts op payloads end-to-end (mandatory since #8670), so `payload` is a
 * base64 string and the plaintext-JSON parsing found no reminders to schedule.
 *
 * The download-response fixture mirrors GET /api/sync/ops exactly; the
 * ciphertexts were produced by the real JS encrypt() (packages/sync-core)
 * with distinct session salts, like ops from different devices.
 */
class SuperSyncBackgroundProviderTest {

    private class InMemoryKeyCache : DerivedKeyCache {
        private val map = mutableMapOf<String, ByteArray>()

        override fun get(saltB64: String): ByteArray? = map[saltB64]

        override fun put(saltB64: String, key: ByteArray) {
            map[saltB64] = key
        }
    }

    private fun providerWithDecryptor(): SuperSyncBackgroundProvider =
        SuperSyncBackgroundProvider(OpPayloadDecryptor(PASSWORD, InMemoryKeyCache()))

    @Test
    fun `schedules reminders from encrypted ops when a decryptor is present`() {
        val result = providerWithDecryptor().parseResponse(ENCRYPTED_DOWNLOAD_RESPONSE)

        val byKey = result.remindersToSchedule.associateBy { Pair(it.taskId, it.isDueDate) }
        assertEquals(3, byKey.size)

        // op-1 (CRT, entityChanges path): remindAt + deadlineRemindAt
        val crtReminder = byKey[Pair("task-crt-1", false)]!!
        assertEquals("Water plants", crtReminder.title)
        assertEquals(4102444500000L, crtReminder.remindAt)
        val crtDeadline = byKey[Pair("task-crt-1", true)]!!
        assertEquals(4102444700000L, crtDeadline.remindAt)

        // op-2 (scheduleTaskWithTime, actionPayload path)
        val schedReminder = byKey[Pair("task-sched-1", false)]!!
        assertEquals("Buy milk", schedReminder.title)
        assertEquals(4102444200000L, schedReminder.remindAt)

        // op-3 (dismissReminderOnly) cancels via the plaintext envelope
        assertEquals(setOf("task-dismiss-1"), result.taskIdsToCancel)
        assertEquals(103L, result.latestSeq)
        assertEquals(false, result.hasMore)
    }

    @Test
    fun `without a decryptor encrypted ops degrade to envelope-only cancels`() {
        val result = SuperSyncBackgroundProvider().parseResponse(ENCRYPTED_DOWNLOAD_RESPONSE)

        assertTrue(result.remindersToSchedule.isEmpty())
        assertEquals(setOf("task-dismiss-1"), result.taskIdsToCancel)
        assertEquals(103L, result.latestSeq)
    }

    @Test
    fun `wrong password degrades to envelope-only cancels`() {
        val provider =
            SuperSyncBackgroundProvider(OpPayloadDecryptor("wrong-password", InMemoryKeyCache()))
        val result = provider.parseResponse(ENCRYPTED_DOWNLOAD_RESPONSE)

        assertTrue(result.remindersToSchedule.isEmpty())
        assertEquals(setOf("task-dismiss-1"), result.taskIdsToCancel)
    }

    @Test
    fun `plaintext payloads keep working with and without a decryptor`() {
        val plaintextResponse = """
            {
              "ops": [
                {
                  "serverSeq": 7,
                  "receivedAt": 1755700001000,
                  "op": {
                    "id": "op-plain",
                    "clientId": "client_desktop_1",
                    "actionType": "[Task Shared] scheduleTaskWithTime",
                    "opType": "UPD",
                    "entityType": "TASK",
                    "entityId": "task-plain-1",
                    "payload": {
                      "actionPayload": {
                        "task": { "id": "task-plain-1", "title": "Plain task" },
                        "dueWithTime": 4102444800000,
                        "remindAt": 4102444200000
                      },
                      "entityChanges": []
                    },
                    "vectorClock": { "client_desktop_1": 1 },
                    "timestamp": 1755700000000,
                    "schemaVersion": 6
                  }
                }
              ],
              "hasMore": false,
              "latestSeq": 7
            }
        """.trimIndent()

        for (provider in listOf(SuperSyncBackgroundProvider(), providerWithDecryptor())) {
            val result = provider.parseResponse(plaintextResponse)
            assertEquals(1, result.remindersToSchedule.size)
            val reminder = result.remindersToSchedule.single()
            assertEquals("task-plain-1", reminder.taskId)
            assertEquals("Plain task", reminder.title)
            assertEquals(4102444200000L, reminder.remindAt)
        }
    }

    companion object {
        const val PASSWORD = "test-encryption-password-123"

        private const val CRT_CIPHERTEXT =
            "yInMh3KUZFmkCS83epg2CtNuiIkgEa0YXB+kFt8WQ3sRR0a4Y4qJSLABI1u1vZ/7MMTjvm2lJRHP" +
                "+tyojvcwQHLRi3/AJNjuW6f2RlmiWd3BvseQ+6yohZHO1nLR6oST8bG+Z+8919wcgrR//qUxTDVi" +
                "v6LkuzfuPDTgxbReesJzu8H0KahiMK1iwHznRTB/FXHeBHh3agHu4B5i23VPRFLVHpFjyrbqRSje" +
                "Afhx07467A6Z0j4PYAHssN7jOBkMJOh6qA4M8kyMkc53h7R2Y77efjR6tL30wTaurg9IB3gNrySO" +
                "0rLBKV3dvRd9DjlQKIcNCDkFSaQJcu/tU7I="

        private const val SCHEDULE_CIPHERTEXT =
            "NZGjL4VYD9CYLgZql5KbDLKGIgXfko/I2n2ydKIu8MS6xrPmesgUIS4Vm5aOzZFL9ubGAQ1lqolm" +
                "D+WM/ORvX0SfQAHroLS9hovvqzh5mHFrrY75L/N//JWcLjPx1H+SY3gDTonXZD+fAxWVvmMUUOXt" +
                "lriaR2bztfF9yw3JvnmJEtJ6f7QpZ334czpvY0hg1wNaNDMs1aRNoSTXQD9+6qbWh3faDBShq78p" +
                "UHfyxJulwn+f5Nl2"

        private const val DISMISS_CIPHERTEXT =
            "91DsnzZw6biDoWvY2a3R8WSZXwXu2+1jARKgfyA0PIlR3rN5cttbLFEFhf2ZX3vd5zc9kkJCnXyx" +
                "q/CjBd2f/QR+pEpEncU4atId6zYLK+UodKS0jhF76543enULpD8cDiyGBWqhlck="

        private val ENCRYPTED_DOWNLOAD_RESPONSE = """
            {
              "ops": [
                {
                  "serverSeq": 101,
                  "receivedAt": 1755700001000,
                  "op": {
                    "id": "op-1",
                    "clientId": "client_desktop_1",
                    "actionType": "[Task] Add task",
                    "opType": "CRT",
                    "entityType": "TASK",
                    "entityId": "task-crt-1",
                    "payload": "$CRT_CIPHERTEXT",
                    "isPayloadEncrypted": true,
                    "vectorClock": { "client_desktop_1": 7 },
                    "timestamp": 1755700000000,
                    "schemaVersion": 6
                  }
                },
                {
                  "serverSeq": 102,
                  "receivedAt": 1755700002000,
                  "op": {
                    "id": "op-2",
                    "clientId": "client_desktop_1",
                    "actionType": "[Task Shared] scheduleTaskWithTime",
                    "opType": "UPD",
                    "entityType": "TASK",
                    "entityId": "task-sched-1",
                    "payload": "$SCHEDULE_CIPHERTEXT",
                    "isPayloadEncrypted": true,
                    "vectorClock": { "client_desktop_1": 7 },
                    "timestamp": 1755700000000,
                    "schemaVersion": 6
                  }
                },
                {
                  "serverSeq": 103,
                  "receivedAt": 1755700003000,
                  "op": {
                    "id": "op-3",
                    "clientId": "client_desktop_1",
                    "actionType": "[Task Shared] dismissReminderOnly",
                    "opType": "UPD",
                    "entityType": "TASK",
                    "entityId": "task-dismiss-1",
                    "payload": "$DISMISS_CIPHERTEXT",
                    "isPayloadEncrypted": true,
                    "vectorClock": { "client_desktop_1": 7 },
                    "timestamp": 1755700000000,
                    "schemaVersion": 6
                  }
                }
              ],
              "hasMore": false,
              "latestSeq": 103
            }
        """.trimIndent()
    }
}
