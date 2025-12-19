package com.superproductivity.superproductivity.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.superproductivity.superproductivity.CapacitorMainActivity
import com.superproductivity.superproductivity.R

object FocusModeNotificationHelper {
    const val CHANNEL_ID = "sp_focus_mode_channel"
    const val NOTIFICATION_ID = 1002

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Focus Mode",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows focus mode timer status"
                setShowBadge(false)
            }
            val notificationManager = context.getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun buildNotification(
        context: Context,
        title: String,
        taskTitle: String?,
        remainingMs: Long,
        isPaused: Boolean,
        isBreak: Boolean
    ): Notification {
        val contentIntent = Intent(context, CapacitorMainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            10,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_sp)
            .setContentTitle(buildTitle(title, taskTitle))
            .setContentText(formatDuration(remainingMs))
            .setContentIntent(contentPendingIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setPriority(NotificationCompat.PRIORITY_LOW)

        // Add Pause/Resume action
        if (isPaused) {
            val resumeIntent = Intent(context, CapacitorMainActivity::class.java).apply {
                action = FocusModeForegroundService.ACTION_RESUME
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val resumePendingIntent = PendingIntent.getActivity(
                context,
                11,
                resumeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "Resume", resumePendingIntent)
        } else {
            val pauseIntent = Intent(context, CapacitorMainActivity::class.java).apply {
                action = FocusModeForegroundService.ACTION_PAUSE
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pausePendingIntent = PendingIntent.getActivity(
                context,
                12,
                pauseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "Pause", pausePendingIntent)
        }

        // Add Skip (for breaks) or Complete (for work sessions) action
        if (isBreak) {
            val skipIntent = Intent(context, CapacitorMainActivity::class.java).apply {
                action = FocusModeForegroundService.ACTION_SKIP
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val skipPendingIntent = PendingIntent.getActivity(
                context,
                13,
                skipIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "Skip", skipPendingIntent)
        } else {
            val completeIntent = Intent(context, CapacitorMainActivity::class.java).apply {
                action = FocusModeForegroundService.ACTION_COMPLETE
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val completePendingIntent = PendingIntent.getActivity(
                context,
                14,
                completeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(0, "Complete", completePendingIntent)
        }

        return builder.build()
    }

    private fun buildTitle(focusTitle: String, taskTitle: String?): String {
        return if (taskTitle.isNullOrBlank()) {
            focusTitle
        } else {
            "$focusTitle: $taskTitle"
        }
    }

    fun formatDuration(ms: Long): String {
        val totalSeconds = ms / 1000
        val minutes = totalSeconds / 60
        val seconds = totalSeconds % 60
        return String.format("%d:%02d", minutes, seconds)
    }
}
