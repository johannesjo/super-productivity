package com.superproductivity.plugins.webdavhttp;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Iterator;

@CapacitorPlugin(name = "WebDavHttp")
public class WebDavHttpPlugin extends Plugin {

    private static final String[] WEBDAV_METHODS = {
        "PROPFIND", "PROPPATCH", "MKCOL", "COPY", "MOVE", "LOCK", "UNLOCK"
    };

    private boolean isWebDavMethod(String method) {
        for (String webdavMethod : WEBDAV_METHODS) {
            if (webdavMethod.equalsIgnoreCase(method)) {
                return true;
            }
        }
        return false;
    }

    @PluginMethod
    public void request(PluginCall call) {
        String urlString = call.getString("url");
        String method = call.getString("method", "GET");
        JSObject headers = call.getObject("headers", new JSObject());
        String data = call.getString("data");

        if (urlString == null) {
            call.reject("URL is required");
            return;
        }

        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();

            // For WebDAV methods, we need to use reflection since HttpURLConnection
            // only supports standard HTTP methods
            if (isWebDavMethod(method)) {
                try {
                    // First set it as POST to allow output
                    connection.setRequestMethod("POST");
                    // Then use reflection to set the actual method
                    java.lang.reflect.Field methodField = HttpURLConnection.class.getDeclaredField("method");
                    methodField.setAccessible(true);
                    methodField.set(connection, method);
                    
                    // Also update the delegate if using OkHttp
                    Object delegate = connection;
                    try {
                        java.lang.reflect.Field delegateField = connection.getClass().getDeclaredField("delegate");
                        delegateField.setAccessible(true);
                        delegate = delegateField.get(connection);
                        if (delegate != null) {
                            java.lang.reflect.Field delegateMethodField = delegate.getClass().getSuperclass().getDeclaredField("method");
                            delegateMethodField.setAccessible(true);
                            delegateMethodField.set(delegate, method);
                        }
                    } catch (Exception e) {
                        // OkHttp delegate not present, that's OK
                    }
                } catch (Exception e) {
                    call.reject("Failed to set WebDAV method: " + method, e);
                    return;
                }
            } else {
                // Standard HTTP method
                connection.setRequestMethod(method);
            }

            // Set headers
            Iterator<String> keys = headers.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                String value = headers.getString(key);
                connection.setRequestProperty(key, value);
            }

            // Handle request body
            if (data != null && !data.isEmpty()) {
                connection.setDoOutput(true);
                DataOutputStream outputStream = new DataOutputStream(connection.getOutputStream());
                outputStream.writeBytes(data);
                outputStream.flush();
                outputStream.close();
            }

            // Get response
            int responseCode = connection.getResponseCode();

            // Read response body
            BufferedReader reader;
            if (responseCode >= 200 && responseCode < 300) {
                reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            } else {
                reader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
            }

            StringBuilder responseBody = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                responseBody.append(line).append("\n");
            }
            reader.close();

            // Get response headers
            JSObject responseHeaders = new JSObject();
            for (String headerKey : connection.getHeaderFields().keySet()) {
                if (headerKey != null) {
                    responseHeaders.put(headerKey, connection.getHeaderField(headerKey));
                }
            }

            // Return response
            JSObject result = new JSObject();
            result.put("data", responseBody.toString());
            result.put("status", responseCode);
            result.put("headers", responseHeaders);
            result.put("url", connection.getURL().toString());

            call.resolve(result);

        } catch (Exception e) {
            call.reject("Request failed", e);
        }
    }
}
