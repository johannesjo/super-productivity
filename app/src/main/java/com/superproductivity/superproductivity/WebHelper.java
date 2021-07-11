package com.superproductivity.superproductivity;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;


public class WebHelper {
    private static final String TAG = WebHelper.class.getSimpleName();

    // should be correct as they only ever get's assigned once?
    private static WebView wv;


    public static void instanceView(Context context) {
        wv = new WebView(context);
        wv.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT));
        if (Build.VERSION.SDK_INT >= 19) {
            wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        } else {
            wv.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        }

        // additional web view settings
        WebSettings wSettings = wv.getSettings();

        wSettings.setJavaScriptEnabled(true);
        wSettings.setLoadsImagesAutomatically(true);
        wSettings.setDomStorageEnabled(true);
        wSettings.setLoadWithOverviewMode(true);
        wSettings.setDatabaseEnabled(true);
        wSettings.setGeolocationEnabled(true);
        wSettings.setAppCacheEnabled(true);
        wSettings.setMediaPlaybackRequiresUserGesture(false);
        wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        wSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // allow google login
        // @see https://stackoverflow.com/questions/45863004/how-some-apps-are-able-to-perform-google-login-successfully-in-android-webview
        // Force links and redirects to open in the WebView instead of in a browser
        wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        wSettings.setUserAgentString("Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36");

        // Application Caches
        wSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        wSettings.setAppCacheEnabled(true);
        String cacheDirPath = context.getExternalCacheDir().getAbsolutePath();
        wSettings.setAppCachePath(cacheDirPath);
        Log.i(TAG, "cache path：：" + cacheDirPath);
    }

    public static WebView getWebView() {
        return wv;
    }
}
