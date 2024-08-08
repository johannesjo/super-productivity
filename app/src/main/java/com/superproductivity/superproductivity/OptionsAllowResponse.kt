package com.superproductivity.superproductivity

import android.annotation.TargetApi
import android.webkit.WebResourceResponse
import java.text.SimpleDateFormat
import java.util.*

class OptionsAllowResponse {
    companion object {
        private val formatter = SimpleDateFormat("E, dd MMM yyyy kk:mm:ss", Locale.US)

        @TargetApi(21)
        fun build(): WebResourceResponse {
            val date = Date()
            val dateString = formatter.format(date)

            val headers = mapOf(
                "Connection" to "close",
                "Content-Type" to "text/plain",
                "Date" to "$dateString GMT",
                "Access-Control-Allow-Origin" to "app.super-productivity.com",
                "Access-Control-Allow-Methods" to "GET, POST, DELETE, PUT, OPTIONS",
                "Access-Control-Max-Age" to "600",
                "Access-Control-Allow-Credentials" to "true",
                "Access-Control-Allow-Headers" to "accept, authorization, Content-Type",
                "Via" to "1.1 vegur"
            )

            return WebResourceResponse("text/plain", "UTF-8", 200, "OK", headers, null)
        }
    }
}

