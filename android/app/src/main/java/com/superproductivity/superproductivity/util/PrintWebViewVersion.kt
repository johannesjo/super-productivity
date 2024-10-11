package com.superproductivity.superproductivity.util

import android.os.Build
import android.webkit.WebView
import android.webkit.WebView.getCurrentWebViewPackage

fun printWebViewVersion(webView: WebView) {
    val userAgent = webView.settings.userAgentString
    var webViewVersion: String? = null
    userAgent?.let {
        val startIndex = it.indexOf("AppleWebKit/") + "AppleWebKit/".length
        if (startIndex > 0) {
            webViewVersion = it.substring(startIndex)
        }
    }
    println("WEBVIEW WkWebView version: ${webViewVersion ?: "unknown"}")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
       println("WEBVIEW versionName ${getCurrentWebViewPackage()?.versionName ?: "unknown"} ")
    }
}
