package com.superproductivity.superproductivity

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.*
import android.widget.FrameLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.anggrayudi.storage.SimpleStorageHelper

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
class FullscreenActivity : AppCompatActivity() {
    private lateinit var javaScriptInterface: CommonJavaScriptInterface
    private lateinit var webView: WebView
    private lateinit var wvContainer: FrameLayout
    var isInForeground: Boolean = false
    val storageHelper = SimpleStorageHelper(this) // for scoped storage permission management on Android 10+

    @Suppress("ReplaceCallWithBinaryOperator")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(Intent(this, KeepAliveNotificationService::class.java))
        } else {
            startService(Intent(this, KeepAliveNotificationService::class.java))
        }
        initWebView()
        setContentView(R.layout.activity_fullscreen)
        wvContainer = findViewById(R.id.webview_container)
        wvContainer.addView(webView)
    }

    override fun onPause() {
        super.onPause()
        isInForeground = false
        Log.v("TW", "FullScreenActivity: onPause")
        callJSInterfaceFunctionIfExists("next", "onPause$")
    }

    override fun onResume() {
        super.onResume()
        isInForeground = true
        Log.v("TW", "FullScreenActivity: onResume")
        callJSInterfaceFunctionIfExists("next", "onResume$")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        Log.v("TW", "FullScreenActivity: onNewIntent")
        val action = intent.getStringExtra("action")
        Log.v("TW", "FullScreenActivity: action $action")
        if (action == null) {
            return
        }
        when (action) {
            KeepAliveNotificationService.EXTRA_ACTION_PAUSE -> callJSInterfaceFunctionIfExists(
                "next",
                "onPauseCurrentTask$"
            )
            KeepAliveNotificationService.EXTRA_ACTION_DONE -> callJSInterfaceFunctionIfExists(
                "next",
                "onMarkCurrentTaskAsDone$"
            )
            KeepAliveNotificationService.EXTRA_ACTION_ADD_TASK -> callJSInterfaceFunctionIfExists(
                "next",
                "onAddNewTask$"
            )
        }
    }

    private fun initWebView() {
        webView = (application as App).wv
        val url: String
        if (BuildConfig.DEBUG) {
            //url = "https://app.super-productivity.com"
            // for debugging locally run web server
            url = "http://10.0.2.2:4200"
            Toast.makeText(this, "DEBUG: $url", Toast.LENGTH_SHORT).show()
            webView.clearCache(true)
            webView.clearHistory()
            WebView.setWebContentsDebuggingEnabled(true); // necessary to enable chrome://inspect of webviews on physical remote Android devices, but not for AVD emulator, as the latter automatically enables debug build features
        } else {
            url = "https://app.super-productivity.com"
        }
        webView.loadUrl(url)
        supportActionBar?.hide()
        javaScriptInterface = JavaScriptInterface(this)
        webView.addJavascriptInterface(javaScriptInterface, WINDOW_INTERFACE_PROPERTY)
        if (BuildConfig.FLAVOR.equals("fdroid")) {
            webView.addJavascriptInterface(javaScriptInterface, WINDOW_PROPERTY_F_DROID)
            // not ready in time, that's why we create a second JS interface just to fill the prop
            // callJavaScriptFunction("window.$WINDOW_PROPERTY_F_DROID=true")
        }
        webView.webViewClient = object : WebViewClient() {

            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                Log.v("TW", url)

                return if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (url.contains("super-productivity.com") || url.contains("localhost") || url.contains(
                            "10.0.2.2:4200"
                        )
                    ) {
                        false
                    } else {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        true
                    }
                } else {
                    false
                }
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                if (request?.isForMainFrame == false && request.url?.path?.contains("assets/icons/favicon") == true) {
                    try {
                        return WebResourceResponse("image/png", null, null)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return null
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onJsAlert(
                view: WebView,
                url: String,
                message: String,
                result: JsResult
            ): Boolean {
                Log.v("TW", "onJsAlert")
                val builder: AlertDialog.Builder = AlertDialog.Builder(this@FullscreenActivity)
                builder.setMessage(message)
                    .setNeutralButton("OK") { dialog, _ ->
                        dialog.dismiss()
                    }
                    .create()
                    .show()
                result.cancel()
                return super.onJsAlert(view, url, message, result)
            }

            override fun onJsConfirm(
                view: WebView,
                url: String,
                message: String,
                result: JsResult
            ): Boolean {
                AlertDialog.Builder(this@FullscreenActivity)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok) { _, _ -> result.confirm() }
                    .setNegativeButton(android.R.string.cancel) { _, _ -> result.cancel() }
                    .create()
                    .show()
                return true
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (data != null) {
            javaScriptInterface.onActivityResult(requestCode, resultCode, data)
        }
    }

    private fun callJSInterfaceFunctionIfExists(fnName: String, objectPath: String) {
        val fnFullName = "window.$WINDOW_INTERFACE_PROPERTY.$objectPath.$fnName"
        val fullObjectPath = "window.$WINDOW_INTERFACE_PROPERTY.$objectPath"
        callJavaScriptFunction("if($fullObjectPath && $fnFullName)$fnFullName()")
    }

    fun callJavaScriptFunction(script: String) {
        webView.post { webView.evaluateJavascript(script) { } }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        wvContainer.removeView(webView)
        super.onDestroy()
    }

    companion object {
        const val WINDOW_INTERFACE_PROPERTY: String = "SUPAndroid"
        const val WINDOW_PROPERTY_F_DROID: String = "SUPFDroid"
    }

    override fun onSaveInstanceState(outState: Bundle) {
        // Save scoped storage permission on Android 10+
        storageHelper.onSaveInstanceState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        // Restore scoped storage permission on Android 10+
        super.onRestoreInstanceState(savedInstanceState)
        storageHelper.onRestoreInstanceState(savedInstanceState)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<String>, grantResults: IntArray) {
        // Restore scoped storage permission on Android 10+
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        // Mandatory for Activity, but not for Fragment & ComponentActivity
        //storageHelper.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }
}
