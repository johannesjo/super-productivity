package com.superproductivity.superproductivity.webview

import android.util.Log
import android.webkit.WebResourceResponse
import java.text.SimpleDateFormat
import java.util.*

class OptionsAllowResponse {
    companion object {
        private val formatter = SimpleDateFormat("E, dd MMM yyyy kk:mm:ss", Locale.US)

        fun build(): WebResourceResponse {
            Log.v("TW", "OptionsAllowResponse: OPTIONS build ")
            val date = Date()
            val dateString = formatter.format(date)

            val headers = mapOf(
                "Connection" to "close",
                "Content-Type" to "text/plain",
                "Date" to "$dateString GMT",
                "Access-Control-Allow-Origin" to "*",
                "Access-Control-Allow-Methods" to "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Max-Age" to "7200",
                "Access-Control-Allow-Credentials" to "true",
                "Access-Control-Allow-Headers" to "*",
//                "Via" to "1.1 vegur"
            )

            return WebResourceResponse("text/plain", "UTF-8", 200, "OK", headers, null)
        }
    }
}

