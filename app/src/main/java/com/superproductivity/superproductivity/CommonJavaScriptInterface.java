package com.superproductivity.superproductivity;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.net.ssl.HttpsURLConnection;

public class CommonJavaScriptInterface {
    protected FullscreenActivity mContext;
    private final WebView webView;
    private final KeyValStore dbHelper;
    // TODO rename to WINDOW_PROPERTY
    private final static String INTERFACE_PROPERTY = FullscreenActivity.INTERFACE_PROPERTY;
    private final static String FN_PREFIX = "window." + INTERFACE_PROPERTY + ".";

    /**
     * Instantiate the interface and set the context
     */
    CommonJavaScriptInterface(FullscreenActivity c, WebView wv) {
        mContext = c;
        webView = wv;
        dbHelper = new KeyValStore(c);
    }

    void onActivityResult(int requestCode, int resultCode, Intent data) {
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void updateTaskData(String str) {
        Log.w("TW", "JavascriptInterface: updateTaskData");
        Intent intent = new Intent(mContext.getApplicationContext(), TaskListWidget.class);
        intent.setAction(TaskListWidget.LIST_CHANGED);
        intent.putExtra("taskJson", str);

        TaskListDataService.getInstance().setData(str);
        mContext.sendBroadcast(intent);
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void updatePermanentNotification(String title, String message, int progress) {
        Log.w("TW", "JavascriptInterface: updateNotificationWidget");
        // we need to use an explicit intent to make this work
        Intent intent = new Intent(KeepAliveNotificationService.UPDATE_PERMANENT_NOTIFICATION);
        intent.putExtra("title", title);
        intent.putExtra("message", message);
        intent.putExtra("progress", progress);
        mContext.sendBroadcast(intent);
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void triggerGetGoogleToken() {
        // NOTE: empty here, and only filled for google build flavor
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    // LEGACY
    public void saveToDbNew(final String requestId, final String key, final String value) {
        KeyValStore.set(mContext, key, value);
        _callJavaScriptFunction(FN_PREFIX + "saveToDbCallback('" + requestId + "')");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    // LEGACY
    public void loadFromDbNew(final String requestId, final String key) {
        String r = KeyValStore.get(mContext, key, "");
        // NOTE: ' are important as otherwise the json messes up
        _callJavaScriptFunction(FN_PREFIX + "loadFromDbCallback('" + requestId + "', '" + key + "', '" + r + "')");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void removeFromDb(final String requestId, final String key) {
        KeyValStore.set(mContext, key, null);
        _callJavaScriptFunction(FN_PREFIX + "removeFromDbCallback('" + requestId + "')");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void clearDb(final String requestId) {
        KeyValStore.clearAll(mContext);
        _callJavaScriptFunction(FN_PREFIX + "clearDbCallback('" + requestId + "')");
    }


    // TODO: legacy remove in future version, but no the next release
    @SuppressWarnings("unused")
    @JavascriptInterface
    public void saveToDb(final String key, final String value) {
        KeyValStore.set(mContext, key, value);
        _callJavaScriptFunction("window.saveToDbCallback()");
    }

    // TODO: legacy remove in future version, but no the next release
    @SuppressWarnings("unused")
    @JavascriptInterface
    public void loadFromDb(final String key) {
        String r = KeyValStore.get(mContext, key, "");
        // NOTE: ' are important as otherwise the json messes up
        _callJavaScriptFunction("window.loadFromDbCallback('" + key + "', '" + r + "')");
    }


    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showNotificationIfAppIsNotOpen(String title, String body) {
        if (!mContext.isInForeground) {
            showNotification(title, body);
        }
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showNotification(String title, String body) {
        Log.d("TW", "title " + title);
        Log.d("TW", "body " + body);

        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(mContext.getApplicationContext(), "SUP_CHANNEL_ID");
        mBuilder.build().flags |= Notification.FLAG_AUTO_CANCEL;

        Intent ii = new Intent(mContext.getApplicationContext(), FullscreenActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(mContext, 0, ii, PendingIntent.FLAG_MUTABLE);

        NotificationCompat.BigTextStyle bigText = new NotificationCompat.BigTextStyle();
        bigText.setBigContentTitle(title);

        if ((body != null) && !body.isEmpty() && !(body.trim().equals("undefined"))) {
            bigText.bigText(body);
        }

        mBuilder.setContentIntent(pendingIntent);
        mBuilder.setSmallIcon(R.mipmap.ic_launcher);
        mBuilder.setLargeIcon(BitmapFactory.decodeResource(mContext.getResources(),
                R.mipmap.ic_launcher));
        mBuilder.setSmallIcon(R.drawable.ic_stat_sp);
        mBuilder.setPriority(Notification.PRIORITY_MAX);
        mBuilder.setStyle(bigText);
        mBuilder.setAutoCancel(true);

        NotificationManager mNotificationManager =
                (NotificationManager) mContext.getSystemService(Context.NOTIFICATION_SERVICE);

        // === Removed some obsoletes
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "SUP_CHANNEL_ID";
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Super Productivity",
                    NotificationManager.IMPORTANCE_HIGH);
            mNotificationManager.createNotificationChannel(channel);
            mBuilder.setChannelId(channelId);
        }

        mNotificationManager.notify(0, mBuilder.build());
    }

    private byte[] readFully(InputStream is) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();

        int nRead;
        byte[] data = new byte[16384];

        while ((nRead = is.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }

        return buffer.toByteArray();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void makeHttpRequest(@NonNull final String requestId, @NonNull final String urlString, @NonNull final String method, @NonNull final String data, @NonNull final String username, @NonNull final String password, @NonNull String readResponse) {
        Log.d("TW", requestId + urlString + method + data + username + password + readResponse);
        int status;
        String statusText;
        String resultData = "";
        JSONObject headers = new JSONObject();
        boolean doInput = Boolean.parseBoolean(readResponse);
        try {
            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            if (connection instanceof HttpsURLConnection) {

            }
            if (!username.isEmpty() && !password.isEmpty()) {
                String auth = username + ":" + password;
                String encodedAuth = Base64.encodeToString(auth.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                connection.setRequestProperty("Authorization", "Basic " + encodedAuth);
            }
            connection.setRequestMethod(method);
            connection.setRequestProperty("Content-Type", "application/octet-stream");
            connection.setDoInput(doInput);
            if (!data.isEmpty()) {
                connection.setDoOutput(true);
                byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(bytes.length);
                OutputStream out = new BufferedOutputStream(connection.getOutputStream());
                out.write(bytes);
                out.flush();
                out.close();
            }
            for (Map.Entry<String, List<String>> entry : connection.getHeaderFields().entrySet()) {
                if (entry.getKey() == null) {
                    continue;
                }
                // https://datatracker.ietf.org/doc/html/rfc7230#section-3.2.2
                StringBuilder builder = null;
                for (String value : entry.getValue()) {
                    if (builder == null) {
                        builder = new StringBuilder(value);
                    } else {
                        builder.append(",").append(value);
                    }
                }
                if (builder != null) {
                    try {
                        headers.put(entry.getKey().toLowerCase(Locale.ROOT), builder.toString());
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            }
            status = connection.getResponseCode();
            statusText = connection.getResponseMessage();

            byte[] out;
            if (status >= 200 && status <= 299 && doInput) {
                InputStream is = connection.getInputStream();
                out = readFully(is);
                is.close();
            } else {
                out = new byte[0];
            }
            connection.disconnect();
            resultData = new String(out, StandardCharsets.UTF_8);
        } catch (MalformedURLException e) {
            e.printStackTrace();
            status = -1;
            statusText = "Malformed URL";
        } catch (javax.net.ssl.SSLHandshakeException e) {
            e.printStackTrace();
            status = -2;
            statusText = "SSL Handshake Error";
        } catch (IOException e) {
            e.printStackTrace();
            status = -3;
            statusText = "Network Error";
        } catch (ClassCastException e) {
            e.printStackTrace();
            status = -4;
            statusText = "Unsupported Protocol";
        }
        JSONObject result = new JSONObject();
        try {
            result.put("data", resultData);
            result.put("status", status);
            result.put("headers", headers);
            result.put("statusText", statusText);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        _callJavaScriptFunction(FN_PREFIX + "makeHttpRequestCallback('" + requestId + "', " + result + ")");
    }

    @SuppressWarnings("unused")
    private void _callJavaScriptFunction(final String script) {
        mContext.callJavaScriptFunction(script);
    }
}
