package com.superproductivity.superproductivity

import android.app.Application
import android.webkit.WebView

class App : Application() {

    val wv: WebView by lazy {
        WebHelper().instanceView(this)
    }

    val keyValStore: KeyValStore by lazy {
        KeyValStore(this)
    }

    val dataHolder: TaskListDataService by lazy {
        TaskListDataService()
    }
}