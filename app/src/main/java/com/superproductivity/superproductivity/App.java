package com.superproductivity.superproductivity;

import android.app.Application;
import android.content.Intent;
import android.webkit.WebView;

import androidx.lifecycle.LifecycleObserver;

public class App extends Application implements LifecycleObserver {
    WebView wv;

    @Override
    public void onCreate() {
        super.onCreate();

        startService(new Intent(this, KeepAliveNotificationService.class));
        // NOTE: if we init the web view here, we can't use native date & time dialogs....

//        ProcessLifecycleOwner.get().getLifecycle().addObserver(this);
//        WebHelper.instanceView(getApplicationContext());
//
//        boolean IS_DEBUG = 0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
//
//        // if your build is in debug mode, enable inspecting of web views
//        if (IS_DEBUG) {
//            WebView.setWebContentsDebuggingEnabled(true);
//        }
//
//        wv = WebHelper.getWebView();
//        if (wv != null) {
//            // needs to come last for some settings to take effect
//            if (IS_DEBUG) {
////                 String url = "https://test-app.super-productivity.com";
//                String url = "http://10.0.2.2:4200/";
//                // String url = "https://app.super-productivity.com";
//                wv.loadUrl(url);
//                Toast.makeText(this, "DEBUG: " + url, Toast.LENGTH_SHORT).show();
//            } else {
//                wv.loadUrl("https://app.super-productivity.com");
//                // wv.loadUrl("https://test-app.super-productivity.com");
//            }
//        }
    }
}
