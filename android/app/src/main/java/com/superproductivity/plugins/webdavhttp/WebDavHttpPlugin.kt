package com.superproductivity.plugins.webdavhttp

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.BufferedReader
import java.io.DataOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

@CapacitorPlugin(name = "WebDavHttp")
class WebDavHttpPlugin : Plugin() {

    companion object {
        private val WEBDAV_METHODS = arrayOf(
            "PROPFIND", "PROPPATCH", "MKCOL", "COPY", "MOVE", "LOCK", "UNLOCK"
        )
    }

    private fun isWebDavMethod(method: String): Boolean {
        return WEBDAV_METHODS.any { it.equals(method, ignoreCase = true) }
    }

    @PluginMethod
    fun request(call: PluginCall) {
        val urlString = call.getString("url")
        val method = call.getString("method", "GET")
        val headers = call.getObject("headers", JSObject())
        val data = call.getString("data")

        if (urlString == null) {
            call.reject("URL is required")
            return
        }

        try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection

            // For WebDAV methods, we need to use reflection since HttpURLConnection
            // only supports standard HTTP methods
            if (isWebDavMethod(method)) {
                try {
                    // First set it as POST to allow output
                    connection.requestMethod = "POST"
                    
                    // Then use reflection to set the actual method
                    val methodField = HttpURLConnection::class.java.getDeclaredField("method")
                    methodField.isAccessible = true
                    methodField.set(connection, method)
                    
                    // Also update the delegate if using OkHttp
                    try {
                        val delegateField = connection.javaClass.getDeclaredField("delegate")
                        delegateField.isAccessible = true
                        val delegate = delegateField.get(connection)
                        
                        if (delegate != null) {
                            val delegateMethodField = delegate.javaClass.superclass?.getDeclaredField("method")
                            delegateMethodField?.isAccessible = true
                            delegateMethodField?.set(delegate, method)
                        }
                    } catch (e: Exception) {
                        // OkHttp delegate not present, that's OK
                    }
                } catch (e: Exception) {
                    call.reject("Failed to set WebDAV method: $method", e)
                    return
                }
            } else {
                // Standard HTTP method
                connection.requestMethod = method
            }

            // Set headers
            headers.keys().forEach { key ->
                headers.getString(key)?.let { value ->
                    connection.setRequestProperty(key, value)
                }
            }

            // Handle request body
            if (!data.isNullOrEmpty()) {
                connection.doOutput = true
                DataOutputStream(connection.outputStream).use { outputStream ->
                    outputStream.writeBytes(data)
                    outputStream.flush()
                }
            }

            // Get response
            val responseCode = connection.responseCode

            // Read response body
            val reader = BufferedReader(
                InputStreamReader(
                    if (responseCode in 200..299) {
                        connection.inputStream
                    } else {
                        connection.errorStream
                    }
                )
            )
            
            val responseBody = reader.use { it.readText() }

            // Get response headers
            val responseHeaders = JSObject()
            connection.headerFields.forEach { (key, value) ->
                if (key != null && value.isNotEmpty()) {
                    responseHeaders.put(key, value.first())
                }
            }

            // Return response
            val result = JSObject().apply {
                put("data", responseBody)
                put("status", responseCode)
                put("headers", responseHeaders)
                put("url", connection.url.toString())
            }

            call.resolve(result)

        } catch (e: Exception) {
            call.reject("Request failed", e)
        }
    }
}