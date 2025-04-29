package com.superproductivity.superproductivity

import android.graphics.Rect
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.addCallback
import com.anggrayudi.storage.SimpleStorageHelper
import com.getcapacitor.BridgeActivity
import com.superproductivity.superproductivity.util.printWebViewVersion
import com.superproductivity.superproductivity.webview.JavaScriptInterface
import com.superproductivity.superproductivity.webview.WebHelper

/**
 * All new Super-Productivity main activity, based on Capacitor to support offline use of the entire application
 */
class CapacitorMainActivity : BridgeActivity() {
    private lateinit var javaScriptInterface: JavaScriptInterface

    private val storageHelper =
        SimpleStorageHelper(this) // for scoped storage permission management on Android 10+

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        printWebViewVersion(bridge.webView)

        // DEBUG ONLY
        if (BuildConfig.DEBUG) {
            Toast.makeText(this, "DEBUG: Offline Mode", Toast.LENGTH_SHORT).show()
            WebView.setWebContentsDebuggingEnabled(true)
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
