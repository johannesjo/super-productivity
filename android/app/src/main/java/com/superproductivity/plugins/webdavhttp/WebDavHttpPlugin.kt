package com.superproductivity.plugins.webdavhttp

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

@CapacitorPlugin(name = "WebDavHttp")
class WebDavHttpPlugin : Plugin() {

    companion object {
        private val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @PluginMethod
    fun request(call: PluginCall) {
        val urlString = call.getString("url")
        val method = call.getString("method") ?: "GET"
        val headers = call.getObject("headers") ?: JSObject()
        val data = call.getString("data")

        if (urlString == null) {
            call.reject("URL is required")
            return
        }

        try {
            // Build request
            val requestBuilder = Request.Builder()
                .url(urlString)

            // Add headers
            headers.keys().forEach { key ->
                headers.getString(key)?.let { value ->
                    requestBuilder.addHeader(key, value)
                }
            }

            // Handle request body
            val requestBody: RequestBody? = if (!data.isNullOrEmpty()) {
                val contentType = headers.getString("Content-Type") ?: "application/xml"
                data.toRequestBody(contentType.toMediaType())
            } else {
                null
            }

            // Set method with body
            when (method.uppercase()) {
                "GET" -> requestBuilder.get()
                "POST" -> requestBuilder.post(requestBody ?: "".toRequestBody())
                "PUT" -> requestBuilder.put(requestBody ?: "".toRequestBody())
                "DELETE" -> {
                    if (requestBody != null) {
                        requestBuilder.delete(requestBody)
                    } else {
                        requestBuilder.delete()
                    }
                }
                "HEAD" -> requestBuilder.head()
                "PATCH" -> requestBuilder.patch(requestBody ?: "".toRequestBody())
                // WebDAV methods
                "PROPFIND", "PROPPATCH", "MKCOL", "COPY", "MOVE", "LOCK", "UNLOCK" -> {
                    requestBuilder.method(method, requestBody)
                }
                else -> {
                    call.reject("Unsupported HTTP method: $method")
                    return
                }
            }

            val request = requestBuilder.build()

            // Execute request
            client.newCall(request).execute().use { response ->
                // Get response headers
                val responseHeaders = JSObject()
                response.headers.forEach { (name, value) ->
                    responseHeaders.put(name, value)
                }

                // Get response body
                val responseBody = response.body?.string() ?: ""

                // Return response
                val result = JSObject().apply {
                    put("data", responseBody)
                    put("status", response.code)
                    put("headers", responseHeaders)
                    put("url", response.request.url.toString())
                }

                call.resolve(result)
            }

        } catch (e: IOException) {
            call.reject("Request failed: ${e.message}", e)
        } catch (e: Exception) {
            call.reject("Unexpected error: ${e.message}", e)
        }
    }
}