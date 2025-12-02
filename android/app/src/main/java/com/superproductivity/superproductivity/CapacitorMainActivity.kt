package com.superproductivity.superproductivity

import android.content.Intent
import android.graphics.Rect
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.addCallback
import com.anggrayudi.storage.SimpleStorageHelper
import com.getcapacitor.BridgeActivity
import com.superproductivity.superproductivity.plugins.SafBridgePlugin
import com.superproductivity.superproductivity.util.printWebViewVersion
import com.superproductivity.superproductivity.webview.JavaScriptInterface
import com.superproductivity.superproductivity.webview.WebHelper
import com.superproductivity.superproductivity.webview.WebViewBlockActivity
import com.superproductivity.superproductivity.webview.WebViewCompatibilityChecker
import com.superproductivity.plugins.webdavhttp.WebDavHttpPlugin
import org.json.JSONObject

/**
 * All new Super-Productivity main activity, based on Capacitor to support offline use of the entire application
 */
class CapacitorMainActivity : BridgeActivity() {
    private lateinit var javaScriptInterface: JavaScriptInterface
    private var webViewCompatibility: WebViewCompatibilityChecker.Result? = null
    private var webViewBlocked = false
    private var pendingShareIntent: JSONObject? = null
    private var isFrontendReady = false

    private val storageHelper =
        SimpleStorageHelper(this) // for scoped storage permission management on Android 10+

    override fun load() {
        val result = WebViewCompatibilityChecker.evaluate(this)
        webViewCompatibility = result
        if (result.isBlocked) {
            webViewBlocked = true
            WebViewBlockActivity.present(this, result)
            finish()
            return
        }
        super.load()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Register plugins before calling super.onCreate()
        registerPlugin(SafBridgePlugin::class.java)
        registerPlugin(WebDavHttpPlugin::class.java)

        super.onCreate(savedInstanceState)
        if (webViewBlocked) {
            return
        }

        printWebViewVersion(bridge.webView)

        // DEBUG ONLY
        if (BuildConfig.DEBUG) {
            Toast.makeText(this, "DEBUG: Offline Mode", Toast.LENGTH_SHORT).show()
            WebView.setWebContentsDebuggingEnabled(true)
        }

        webViewCompatibility?.let {
            if (it.status == WebViewCompatibilityChecker.Status.WARN) {
                Log.w(
                    "SP-WebView",
                    "WebView version ${it.majorVersion ?: "unknown"} below recommended ${WebViewCompatibilityChecker.RECOMMENDED_CHROMIUM_VERSION}",
                )
            }
        }

        // Hide the action bar
        supportActionBar?.hide()

        // Initialize JavaScriptInterface
        javaScriptInterface = JavaScriptInterface(this, bridge.webView)

        // Initialize WebView
        WebHelper().setupView(bridge.webView, false)

        // Inject JavaScriptInterface into Capacitor's WebView
        bridge.webView.addJavascriptInterface(
            javaScriptInterface,
            WINDOW_INTERFACE_PROPERTY
        )
        if (BuildConfig.FLAVOR.equals("fdroid")) {
            bridge.webView.addJavascriptInterface(
                javaScriptInterface,
                WINDOW_PROPERTY_F_DROID
            )
        }


        // Register OnBackPressedCallback to handle back button press
        onBackPressedDispatcher.addCallback(this) {
            Log.v("TW", "onBackPressed ${bridge.webView.canGoBack()}")
            if (bridge.webView.canGoBack()) {
                bridge.webView.goBack()
            } else {
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        }

        // Handle keyboard visibility changes
        val rootView = findViewById<View>(android.R.id.content)
        rootView.viewTreeObserver.addOnGlobalLayoutListener {
            val rect = Rect()
            rootView.getWindowVisibleDisplayFrame(rect)
            val screenHeight = rootView.rootView.height

            val keypadHeight = screenHeight - rect.bottom
            if (keypadHeight > screenHeight * 0.15) {
                // keyboard is opened
                callJSInterfaceFunctionIfExists("next", "isKeyboardShown$", "true")
            } else {
                // keyboard is closed
                callJSInterfaceFunctionIfExists("next", "isKeyboardShown$", "false")
            }
        }

        
        // Handle initial intent (cold start)
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    fun flushPendingShareIntent() {
        isFrontendReady = true
        pendingShareIntent?.let {
            Log.d("SP_SHARE", "Flushing pending share intent: $it")
            callJSInterfaceFunctionIfExists("next", "onShareWithAttachment$", it.toString())
            pendingShareIntent = null
        }
    }

    private fun handleIntent(intent: Intent) {
        Log.d("SP_SHARE", "handleIntent action: ${intent.action} type: ${intent.type}")
        if (Intent.ACTION_SEND == intent.action && intent.type != null) {
            if (intent.type?.startsWith("text/") == true) {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                val sharedTitle = intent.getStringExtra(Intent.EXTRA_TITLE) ?: "Shared Content"
                Log.d("SP_SHARE", "Shared text: $sharedText")
                Log.d("SP_SHARE", "Shared title: $sharedTitle")

                if (sharedText != null) {
                    val json = JSONObject()
                    json.put("title", sharedTitle)
                    val type = if (sharedText.startsWith("http")) "LINK" else "NOTE"
                    json.put("type", type)
                    json.put("path", sharedText)

                    if (isFrontendReady) {
                        Log.d("SP_SHARE", "Frontend ready, sending directly: $json")
                        callJSInterfaceFunctionIfExists("next", "onShareWithAttachment$", json.toString())
                        pendingShareIntent = null
                    } else {
                        Log.d("SP_SHARE", "Frontend NOT ready, queueing: $json")
                        pendingShareIntent = json
                    }
                }
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        // Save scoped storage permission on Android 10+
        storageHelper.onSaveInstanceState(outState)
        bridge.webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        // Restore scoped storage permission on Android 10+
        storageHelper.onRestoreInstanceState(savedInstanceState)
        bridge.webView.restoreState(savedInstanceState)
    }

    override fun onPause() {
        super.onPause()
        Log.v("TW", "CapacitorFullscreenActivity: onPause")
        callJSInterfaceFunctionIfExists("next", "onPause$")
    }

    override fun onResume() {
        super.onResume()
        Log.v("TW", "CapacitorFullscreenActivity: onResume")
        callJSInterfaceFunctionIfExists("next", "onResume$")
    }

    private fun callJSInterfaceFunctionIfExists(
        fnName: String,
        objectPath: String,
        fnParam: String = ""
    ) {
        if (!::javaScriptInterface.isInitialized) {
            Log.w("CapacitorMainActivity", "javaScriptInterface not initialized yet. Skipping JS call.")
            return
        }
        val fnFullName =
            "window.${FullscreenActivity.WINDOW_INTERFACE_PROPERTY}.$objectPath.$fnName"
        val fullObjectPath = "window.${FullscreenActivity.WINDOW_INTERFACE_PROPERTY}.$objectPath"
        javaScriptInterface.callJavaScriptFunction("if($fullObjectPath && $fnFullName)$fnFullName($fnParam)")
    }


    companion object {
        const val WINDOW_INTERFACE_PROPERTY: String = "SUPAndroid"
        const val WINDOW_PROPERTY_F_DROID: String = "SUPFDroid"
    }
}
