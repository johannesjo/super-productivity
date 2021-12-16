package com.superproductivity.superproductivity;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;

public class CommonJavaScriptInterface {
    protected FullscreenActivity mContext;
    private final WebView webView;
    private final KeyValStore dbHelper;

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
    public void updatePermanentNotification(String title, String message, int progress, boolean notify) {
        Log.w("TW", "JavascriptInterface: updateNotificationWidget");
        // we need to use an explicit intent to make this work
        Intent intent = new Intent(KeepAliveNotificationService.UPDATE_PERMANENT_NOTIFICATION);
        intent.putExtra("title", title);
        intent.putExtra("message", message);
        intent.putExtra("progress", progress);
        intent.putExtra("notify", notify);
        mContext.sendBroadcast(intent);
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void triggerGetGoogleToken() {
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void saveToDb(final String key, final String value) {
        KeyValStore.set(mContext, key, value);
        _callJavaScriptFunction("window.saveToDbCallback()");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void loadFromDb(final String key) {
        String r = KeyValStore.get(mContext, key, "");
        // NOTE: ' are important as otherwise the json messes up
        _callJavaScriptFunction("window.loadFromDbCallback('" + key + "', '" + r + "')");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void removeFromDb(final String key) {
        KeyValStore.set(mContext, key, null);
        _callJavaScriptFunction("window.removeFromDbCallback()");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void clearDb() {
        KeyValStore.clearAll(mContext);
        _callJavaScriptFunction("window.clearDbCallback()");
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showNotification(String title, String body) {
        Log.d("TW", "title " + title);
        Log.d("TW", "body " + body);

        NotificationCompat.Builder mBuilder = new NotificationCompat.Builder(mContext.getApplicationContext(), "SUP_CHANNEL_ID");
        Intent ii = new Intent(mContext.getApplicationContext(), FullscreenActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(mContext, 0, ii, 0);

        NotificationCompat.BigTextStyle bigText = new NotificationCompat.BigTextStyle();
        bigText.setBigContentTitle(title);

        if ((body != null) && !body.isEmpty() && !(body.trim().equals("undefined"))) {
            bigText.bigText(body);
        }

        mBuilder.setContentIntent(pendingIntent);
        mBuilder.setSmallIcon(R.mipmap.ic_launcher);
        mBuilder.setLargeIcon(BitmapFactory.decodeResource(mContext.getResources(),
                R.mipmap.ic_launcher));
        mBuilder.setSmallIcon(R.drawable.ic_stat_name);
        mBuilder.setPriority(Notification.PRIORITY_MAX);
        mBuilder.setStyle(bigText);

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

    @SuppressWarnings("unused")
    private void _callJavaScriptFunction(final String script) {
        mContext.callJavaScriptFunction(script);
    }
}
