package com.superproductivity.superproductivity

import android.app.Application
import android.webkit.WebView

class App : Application() {

    private lateinit var wv: WebView

    fun webView(): WebView = if (this::wv.isInitialized) {
        wv
    } else {
        wv = WebHelper().instanceView(this)
        wv
    }
}