package com.superproductivity.superproductivity

import android.app.Application
import android.webkit.WebView

class App : Application() {

    // NOTE using the web view like this causes all html5 inputs not to work
//    val wv: WebView by lazy {
//        WebHelper().instanceView(this)
//    }

    val keyValStore: KeyValStore by lazy {
        KeyValStore(this)
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize AppLifecycleObserver at app startup
        AppLifecycleObserver.getInstance()
    }
}
