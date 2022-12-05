package com.superproductivity.superproductivity

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
class FullscreenActivity : AppCompatActivity() {
    private lateinit var jsi: CommonJavaScriptInterface
    private lateinit var wv: WebView
    var isInForeground: Boolean = false

    @Suppress("ReplaceCallWithBinaryOperator")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(Intent(this, KeepAliveNotificationService::class.java))
        } else {
            startService(Intent(this, KeepAliveNotificationService::class.java))
        }
        wv = (application as App).webView()
        // if your build is in debug mode, enable inspecting of web views
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        if (BuildConfig.DEBUG) {
            // val url = "https://test-app.super-productivity.com"
            //TODO TODO TODO
//          val url = "http://10.0.2.2:4200/"
            val url = "https://app.super-productivity.com"
            wv.loadUrl(url)
            Toast.makeText(this, "DEBUG: $url", Toast.LENGTH_SHORT).show()
        } else {
            wv.loadUrl("https://app.super-productivity.com")
            // wv.loadUrl("https://test-app.super-productivity.com")
        }
        // In case we want to make sure the most recent version is loaded
        if (BuildConfig.DEBUG) {
            wv.clearCache(true)
            wv.clearHistory()
        }
        Log.v("TW", "FullScreenActivity: onCreate")
        if (savedInstanceState == null) {
            Log.v("TW", "FullScreenActivity: onCreate reload")
        }
        // hide action bar
        supportActionBar?.hide()
        // init web view
        setContentView(wv)
        // init JS here, as it needs an activity to work
        jsi = JavaScriptInterface(this)
        wv.addJavascriptInterface(jsi, INTERFACE_PROPERTY)
        if (BuildConfig.FLAVOR.equals("fdroid")) {
            wv.addJavascriptInterface(jsi, INTERFACE_PROPERTY_F_DROID)
        }
        // also needs to be done here, because new Intent otherwise will crash the app
        wv.webViewClient = object : WebViewClient() {

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
        wv.webChromeClient = object : WebChromeClient() {
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

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (data != null) {
            jsi.onActivityResult(requestCode, resultCode, data)
        }
    }


    private fun callJSInterfaceFunctionIfExists(fnName: String, objectPath: String) {
        val fnFullName = "window.$INTERFACE_PROPERTY.$objectPath.$fnName"
        val fullObjectPath = "window.$INTERFACE_PROPERTY.$objectPath"
        callJavaScriptFunction("if($fullObjectPath && $fnFullName)$fnFullName()")
    }

    fun callJavaScriptFunction(script: String) {
        wv.post { wv.evaluateJavascript(script) { } }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (wv.canGoBack()) {
            wv.goBack()
        } else {
            super.onBackPressed()
        }
    }

    companion object {
        const val INTERFACE_PROPERTY: String = "SUPAndroid"
        const val INTERFACE_PROPERTY_F_DROID: String = "SUPFDroid"
    }
}
