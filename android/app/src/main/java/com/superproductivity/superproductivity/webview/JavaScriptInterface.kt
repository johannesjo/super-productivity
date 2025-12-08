package com.superproductivity.superproductivity.webview

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import com.superproductivity.superproductivity.App
import com.superproductivity.superproductivity.BuildConfig
import com.superproductivity.superproductivity.FullscreenActivity.Companion.WINDOW_INTERFACE_PROPERTY
import com.superproductivity.superproductivity.app.LaunchDecider


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


    fun callJavaScriptFunction(script: String) {
        webView.post { webView.evaluateJavascript(script) { } }
    }

    companion object {
        // TODO rename to WINDOW_PROPERTY
        const val FN_PREFIX: String = "window.$WINDOW_INTERFACE_PROPERTY."
    }
}
