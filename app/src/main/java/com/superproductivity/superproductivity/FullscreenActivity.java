package com.superproductivity.superproductivity;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.webkit.WebView;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class FullscreenActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_fullscreen);

        WebView myWebView = (WebView) findViewById(R.id.webview);
        myWebView.loadUrl("https://app.super-productivity.com");

//        myWebView.setWebChromeClient(new MyCustomChromeClient(this));
//        myWebView.setWebViewClient(new MyCustomWebViewClient(this));
        myWebView.clearCache(true);
        myWebView.clearHistory();
        myWebView.getSettings().setJavaScriptEnabled(true);
        myWebView.getSettings().setDomStorageEnabled(true);
        myWebView.getSettings().setJavaScriptCanOpenWindowsAutomatically(true);
        getSupportActionBar().hide();

    }
}
