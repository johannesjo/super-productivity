package com.superproductivity.superproductivity;

import androidx.appcompat.app.AppCompatActivity;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class FullscreenActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // if your build is in debug mode, enable inspecting of web views
        if (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE)) {
            WebView.setWebContentsDebuggingEnabled(true);

        }

        // hide action bar
        getSupportActionBar().hide();

        setContentView(R.layout.activity_fullscreen);

        // init web view
        WebView wv = (WebView) findViewById(R.id.webview);

        wv.setWebChromeClient(new WebChromeClient());
        wv.clearCache(true);
        wv.clearHistory();

        wv.getSettings().setJavaScriptEnabled(true);
        wv.getSettings().setDomStorageEnabled(true);
        wv.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
        wv.getSettings().setLoadsImagesAutomatically(true);
        wv.getSettings().setLoadWithOverviewMode(true);


        // allow google login
        // @see https://stackoverflow.com/questions/45863004/how-some-apps-are-able-to-perform-google-login-successfully-in-android-webview
        wv.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
//        wv.getSettings().setUserAgentString("Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36");
        wv.getSettings().setUserAgentString(wv.getSettings().getUserAgentString().replace("; wv",""));

        wv.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
        JavaScriptInterface jsi = new JavaScriptInterface(this);
        wv.addJavascriptInterface(jsi, "SUPAndroid");

//        wv.loadUrl("http://10.0.2.2:4200");
        wv.loadUrl("https://app.super-productivity.com");
    }
}
