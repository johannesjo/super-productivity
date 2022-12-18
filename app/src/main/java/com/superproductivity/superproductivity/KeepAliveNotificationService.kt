package com.superproductivity.superproductivity

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class KeepAliveNotificationService : Service() {
    private lateinit var notificationManager: NotificationManager
    private val builder: NotificationCompat.Builder =
        NotificationCompat.Builder(this, NOTIFY_CHANNEL_ID)
    private lateinit var receiver: BroadcastReceiver

    // use this as an inner class like here or as a top-level class

    inner class MyReceiver : BroadcastReceiver() {

        override fun onReceive(context: Context?, intent: Intent?) {
            Log.w("TW", "KeepAliveService: onReceive")
            val action = intent?.action
            if (action == Companion.UPDATE_PERMANENT_NOTIFICATION) {
                //action for sms received
                val title = intent.getStringExtra("title")
                val message = intent.getStringExtra("message")
                val progress = intent.getIntExtra("progress", -1)
                if (title != null && message != null)
                    this@KeepAliveNotificationService.updateNotification(title, message, progress)
                Log.w("TW", "KeepAliveService: onReceive: $title||$message")
            }
        }
    }

    override fun onCreate() {
        val filter = IntentFilter()
        filter.addAction(UPDATE_PERMANENT_NOTIFICATION)
        receiver = MyReceiver()
        registerReceiver(receiver, filter)
    }

    override fun onDestroy() {
        Log.w("TW", "KeepAliveService: onDestroy")
        unregisterReceiver(receiver)
        super.onDestroy()
    }

    override fun onBind(p0: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.w("TW", "KeepAliveService: Start")
        startForeground()
        return super.onStartCommand(intent, flags, startId)
    }

    @Suppress("RestrictedApi")
    fun updateNotification(title: String, message: String, progress: Int) {
        builder.mActions.clear()
        if (progress == 999) {
            builder.setSmallIcon(R.drawable.ic_stat_sync)
            builder.setProgress(100, progress, true)
        } else if (progress > -1) {
            val pauseIntent = Intent(this, FullscreenActivity::class.java)
            pauseIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            pauseIntent.putExtra("action", EXTRA_ACTION_PAUSE)
            val pausePendingIntent = PendingIntent.getActivity(
                this,
                1,
                pauseIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(R.drawable.ic_pause, "Pause", pausePendingIntent)

            val doneIntent = Intent(this, FullscreenActivity::class.java)
            doneIntent.putExtra("action", EXTRA_ACTION_DONE)
            doneIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val donePendingIntent = PendingIntent.getActivity(
                this,
                2,
                doneIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(R.drawable.ic_done, "Done", donePendingIntent)

            builder.setSmallIcon(R.drawable.ic_stat_play)
            if (progress == 333) {
                builder.setProgress(0, 0, false)
            } else {
                builder.setProgress(100, progress, false)

            }
        } else {
            val addTaskIntent = Intent(this, FullscreenActivity::class.java)
            addTaskIntent.putExtra("action", EXTRA_ACTION_ADD_TASK)
            addTaskIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val addTaskPendingIntent = PendingIntent.getActivity(
                this,
                2,
                addTaskIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            builder.addAction(R.drawable.ic_add, "Add new task", addTaskPendingIntent)
            builder.setSmallIcon(R.drawable.ic_stat_sp)
            builder.setProgress(0, 0, false)
        }
        builder.setContentText(message)
            .setContentTitle(title)
        if (title == "") {
            builder.setContentTitle(null)
        }
        if (message == "") {
            builder.setContentText(null)
        }
        notificationManager.notify(NOTIFY_ID, builder.build())
    }

    private fun startForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // create notification channel
            val description = "Here to keep the app alive for syncing"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(
                NOTIFY_CHANNEL_ID,
                NOTIFY_CHANNEL_ID,
                importance
            )
            channel.description = description
            notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)

            // create notification
            val notificationIntent = Intent(this, FullscreenActivity::class.java)
            val pendingIntent: PendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.getActivity(
                    this, 0,
                    notificationIntent, PendingIntent.FLAG_IMMUTABLE
                )
            } else {
                PendingIntent.getActivity(
                    this, 0,
                    notificationIntent, 0
                )
            }
            val notification = builder
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setSmallIcon(R.drawable.ic_stat_sp)
                .setContentText("Service is running background")
                .setContentIntent(pendingIntent)
                .build()
            startForeground(NOTIFY_ID, notification)
        }
    }

    companion object {
        private const val NOTIFY_ID = 1
        private const val NOTIFY_CHANNEL_ID = "SUP_KeepAlive"
        const val EXTRA_ACTION_DONE = "DONE"
        const val EXTRA_ACTION_PAUSE = "PAUSE"
        const val EXTRA_ACTION_ADD_TASK = "ADD_TASK"
        const val UPDATE_PERMANENT_NOTIFICATION =
            "com.superproductivity.superproductivity.UPDATE_PERMANENT_NOTIFICATION"
    }
}
