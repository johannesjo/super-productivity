package com.superproductivity.superproductivity

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.JsResult
import android.webkit.ServiceWorkerClient
import android.webkit.ServiceWorkerController
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import com.anggrayudi.storage.SimpleStorageHelper
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.ByteArrayInputStream


/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
class FullscreenActivity : AppCompatActivity() {
    private lateinit var javaScriptInterface: JavaScriptInterface
    private lateinit var webView: WebView
    private lateinit var wvContainer: FrameLayout
    var isInForeground: Boolean = false
    val storageHelper =
        SimpleStorageHelper(this) // for scoped storage permission management on Android 10+
    val appUrl =
        if (BuildConfig.DEBUG) "https://test-app.super-productivity.com" else "https://app.super-productivity.com"
//        if (BuildConfig.DEBUG) "http://10.0.2.2:4200" else "https://app.super-productivity.com"


    @Suppress("ReplaceCallWithBinaryOperator")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initWebView()
        setContentView(R.layout.activity_fullscreen)
        wvContainer = findViewById(R.id.webview_container)
        wvContainer.addView(webView)
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl("https://app.super-productivity.com")
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        // Save scoped storage permission on Android 10+
        storageHelper.onSaveInstanceState(outState)
        webView.saveState(outState)
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
    }

    @RequiresApi(Build.VERSION_CODES.N)
    private fun initWebView() {
        webView = (application as App).wv
        if (BuildConfig.DEBUG) {
            Toast.makeText(this, "DEBUG: $appUrl", Toast.LENGTH_SHORT).show()
            webView.clearCache(true)
            webView.clearHistory()
            WebView.setWebContentsDebuggingEnabled(true); // necessary to enable chrome://inspect of webviews on physical remote Android devices, but not for AVD emulator, as the latter automatically enables debug build features
        }

        webView.loadUrl(appUrl)
        supportActionBar?.hide()
        javaScriptInterface = JavaScriptInterface(this)
        webView.addJavascriptInterface(javaScriptInterface, WINDOW_INTERFACE_PROPERTY)
        if (BuildConfig.FLAVOR.equals("fdroid")) {
            webView.addJavascriptInterface(javaScriptInterface, WINDOW_PROPERTY_F_DROID)
            // not ready in time, that's why we create a second JS interface just to fill the prop
            // callJavaScriptFunction("window.$WINDOW_PROPERTY_F_DROID=true")
        }

        val swController = ServiceWorkerController.getInstance()
        swController.setServiceWorkerClient(@RequiresApi(Build.VERSION_CODES.N)
        object : ServiceWorkerClient() {
            override fun shouldInterceptRequest(request: WebResourceRequest): WebResourceResponse? {
                return interceptRequest(request)
            }
        })

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
                return interceptRequest(request)
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
        Log.v("TW", "onBackPressed ${webView.canGoBack().toString()}")
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


    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        // Restore scoped storage permission on Android 10+
        super.onRestoreInstanceState(savedInstanceState)
        storageHelper.onRestoreInstanceState(savedInstanceState)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        // Restore scoped storage permission on Android 10+
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        // Mandatory for Activity, but not for Fragment & ComponentActivity
        //storageHelper.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }


    private fun interceptRequest(request: WebResourceRequest?): WebResourceResponse? {
        if (request == null || request.isForMainFrame) {
            return null
        }

        if (request.url?.path?.contains("assets/icons/favicon") == true) {
            try {
                return WebResourceResponse("image/png", null, null)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        if (request.url.toString()
                .contains("app.super-productivity.com") || request.url.toString()
                .contains("10.0.2.2:4200")
        ) {
            return null
        }

        Log.v(
            "TW",
            "interceptRequest mf:${request?.isForMainFrame.toString()} ${request.method} ${request?.url}"
        )

        // since we currently don't have a way to also post the body, we only handle GET and OPTIONS requests
        // see https://github.com/KonstantinSchubert/request_data_webviewclient for a possible solution
        if (request.method.uppercase() != "GET" && request.method.uppercase() != "OPTIONS") {
            return null
        }

        // remove user agent header in the hopes that we're treated better by the remotes :D
        val keysToRemove =
            request.requestHeaders.keys.filter { it.equals("User-Agent", ignoreCase = true) }
        for (key in keysToRemove) {
            request.requestHeaders.remove(key)
        }

        val client = OkHttpClient()
        val newRequestBuilder = Request.Builder()
            .url(request.url.toString())
            .method(request.method, null)

        // Add each header from the original request to the new request
        for ((key, value) in request.requestHeaders) {
            newRequestBuilder.addHeader(key, value)
        }
        val newRequest = newRequestBuilder.build()

        // currently we can't handle POST requests since everything
        if (request.method.uppercase() == "OPTIONS") {
            Log.v("TW", "OPTIONS request triggered")
            client.newCall(newRequest).execute().use { response ->
                Log.v(
                    "TW",
                    "OPTIONS original response: ${response.code} ${response.message} ${response.body?.string()}"
                )
                if (response.code != 200) {
                    Log.v("TW", "OPTIONS overwrite")
                    return OptionsAllowResponse.build()
                }
            }
        }


        Log.v("TW", "exec request ${request.url}")
        client.newCall(newRequest).execute().use { response ->
            Log.v("TW", "response ${response.code} ${response.message}")
            val responseHeaders = response.headers.names()
                .associateWith { response.headers(it)?.joinToString() }
                .toMutableMap()

            val keysToRemoveI =
                responseHeaders.keys.filter {
                    it.equals(
                        "Access-Control-Allow-Origin",
                        ignoreCase = true
                    )
                }
            for (key in keysToRemoveI) {
                responseHeaders.remove(key)
            }
            responseHeaders["Access-Control-Allow-Origin"] = "*"

            val contentType = response.header("Content-Type", "text/plain")
            val contentEncoding = response.header("Content-Encoding", "utf-8")
            val inputStream = ByteArrayInputStream(response.body?.bytes())
            val reasonPhrase =
                response.message.ifEmpty { "OK" } // provide a default value if the message is null or empty
            return WebResourceResponse(
                contentType,
                contentEncoding,
                response.code,
                reasonPhrase,
                responseHeaders,
                inputStream
            )
        }
    }
}
