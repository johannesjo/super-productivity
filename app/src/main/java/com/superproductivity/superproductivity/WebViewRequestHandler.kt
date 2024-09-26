package com.superproductivity.superproductivity

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.ByteArrayInputStream

/**
 * Strip the original WebViewClient logic to ensure that both types share the same logic
 */
class WebViewRequestHandler(private val activity: Activity, private val serviceHost: String){

    @Deprecated("Deprecated in Java")
    fun handleUrlLoading(view: WebView, url: String): Boolean {
        Log.v("TW", url)
        return if (url.startsWith("http://") || url.startsWith("https://")) {
            if (url.contains("super-productivity.com") || url.contains("localhost") || url.contains(
                    serviceHost
                )
            ) {
                false
            } else {
                activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                true
            }
        } else {
            false
        }
    }

    fun interceptWebRequest(request: WebResourceRequest?): WebResourceResponse? {
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

        if (request.url.toString().contains(serviceHost)) {
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
