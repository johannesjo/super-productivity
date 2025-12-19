package com.superproductivity.superproductivity.webview

import android.app.Activity
import android.content.Intent
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.superproductivity.superproductivity.App
import com.superproductivity.superproductivity.BuildConfig
import com.superproductivity.superproductivity.FullscreenActivity.Companion.WINDOW_INTERFACE_PROPERTY
import com.superproductivity.superproductivity.app.LaunchDecider
import com.superproductivity.superproductivity.service.TrackingForegroundService


class JavaScriptInterface(
    private val activity: Activity,
    private val webView: WebView,
) {


    @Suppress("unused")
    @JavascriptInterface
    fun getVersion(): String {
        val versionName = BuildConfig.VERSION_NAME
        val launchDecider = LaunchDecider(activity)
        val launchMode = launchDecider.getLaunchMode()
        return "${versionName}_L$launchMode"
    }

    @Suppress("unused")
    @JavascriptInterface
    fun showToast(toast: String) {
        Toast.makeText(activity, toast, Toast.LENGTH_SHORT).show()
    }


    @Suppress("unused")
    @JavascriptInterface
    fun saveToDb(requestId: String, key: String, value: String) {
        (activity.application as App).keyValStore.set(key, value)
        callJavaScriptFunction(FN_PREFIX + "saveToDbCallback('" + requestId + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun loadFromDb(requestId: String, key: String) {
        val r = (activity.application as App).keyValStore.get(key, "")
        // NOTE: ' are important as otherwise the json messes up
        callJavaScriptFunction(FN_PREFIX + "loadFromDbCallback('" + requestId + "', '" + key + "', '" + r + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun removeFromDb(requestId: String, key: String) {
        (activity.application as App).keyValStore.set(key, null)
        callJavaScriptFunction(FN_PREFIX + "removeFromDbCallback('" + requestId + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun clearDb(requestId: String) {
        (activity.application as App).keyValStore.clearAll(activity)
        callJavaScriptFunction(FN_PREFIX + "clearDbCallback('" + requestId + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun triggerGetShareData() {
        if (activity is com.superproductivity.superproductivity.CapacitorMainActivity) {
            activity.runOnUiThread {
                activity.flushPendingShareIntent()
            }
        }
    }

    @Suppress("unused")
    @JavascriptInterface
    fun startTrackingService(taskId: String, taskTitle: String, timeSpentMs: Long) {
        val intent = Intent(activity, TrackingForegroundService::class.java).apply {
            action = TrackingForegroundService.ACTION_START
            putExtra(TrackingForegroundService.EXTRA_TASK_ID, taskId)
            putExtra(TrackingForegroundService.EXTRA_TASK_TITLE, taskTitle)
            putExtra(TrackingForegroundService.EXTRA_TIME_SPENT, timeSpentMs)
        }
        ContextCompat.startForegroundService(activity, intent)
    }

    @Suppress("unused")
    @JavascriptInterface
    fun stopTrackingService() {
        val intent = Intent(activity, TrackingForegroundService::class.java).apply {
            action = TrackingForegroundService.ACTION_STOP
        }
        activity.startService(intent)
    }

    @Suppress("unused")
    @JavascriptInterface
    fun getTrackingElapsed(): String {
        val taskId = TrackingForegroundService.currentTaskId
        val elapsedMs = TrackingForegroundService.getElapsedMs()
        val isTracking = TrackingForegroundService.isTracking
        return if (isTracking && taskId != null) {
            """{"taskId":"$taskId","elapsedMs":$elapsedMs}"""
        } else {
            "null"
        }
    }


    fun callJavaScriptFunction(script: String) {
        webView.post { webView.evaluateJavascript(script) { } }
    }

    companion object {
        // TODO rename to WINDOW_PROPERTY
        const val FN_PREFIX: String = "window.$WINDOW_INTERFACE_PROPERTY."
    }
}
