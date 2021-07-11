package com.superproductivity.superproductivity;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import androidx.annotation.Nullable;


public class WebHelper {
    private static final String TAG = WebHelper.class.getSimpleName();
    private static long startTime = 0;
    private static long endTime = 0;
    private static WebView mWebView;


    //    public static void instanceView(Context context){
//        mWebView=new WebView(context);
//        init(context);
//        initClient();
//    }
    public static void instanceView(Context context) {
        mWebView = new WebView(context);
        mWebView.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT));
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        // DOM storage API
        settings.setDomStorageEnabled(true);
        //database storage API
        settings.setDatabaseEnabled(true);
        String cacheDirPath = context.getExternalCacheDir().getAbsolutePath();
        // Application Caches
        settings.setAppCachePath(cacheDirPath);
        Log.i(TAG, "cache path：：" + cacheDirPath);
        //Application Caches
        settings.setAppCacheEnabled(true);

//        settings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.SINGLE_COLUMN);
        settings.setLoadWithOverviewMode(true);
        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        initClient();
    }

    private static void initClient() {
//        // if your build is in debug mode, enable inspecting of web views
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
//            if (0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE)) {
//                WebView.setWebContentsDebuggingEnabled(true);
//            }
//        }
//
//        Log.v("TW", "onCreate");
//        if (savedInstanceState == null) {
//            Log.v("TW", "onCreate reeeeeeeeeeeeeeeeeeload");
//            // hide action bar
//            getSupportActionBar().hide();
//
//            setContentView(R.layout.activity_fullscreen);
//
//            // init web view
//            wv = (WebView) findViewById(R.id.webview);
//
//            wv.setWebViewClient(new WebViewClient() {
//                @Override
//                public boolean shouldOverrideUrlLoading(WebView view, String url) {
//                    if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
//                        if (url.contains("super-productivity.com") || url.contains("localhost")) {
//                            return false;
//                        } else {
//                            view.getContext().startActivity(
//                                    new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
//                            return true;
//                        }
//                    } else {
//                        return false;
//                    }
//                }
//            });
//
//            wv.setWebChromeClient(new WebChromeClient());
//            wv.clearCache(true);
//            wv.clearHistory();
//
//            if (Build.VERSION.SDK_INT >= 19) {
//                wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);
//            } else {
//                wv.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
//            }
//
//
//            // additional web view settings
//            WebSettings wSettings = wv.getSettings();
//
//            wSettings.setJavaScriptEnabled(true);
//            wSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
//            wSettings.setLoadsImagesAutomatically(true);
//            if (Build.VERSION.SDK_INT < 18) {
//                wSettings.setRenderPriority(WebSettings.RenderPriority.HIGH);
//            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ECLAIR_MR1) {
//                wSettings.setDomStorageEnabled(true);
//            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ECLAIR_MR1) {
//                wSettings.setLoadWithOverviewMode(true);
//            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ECLAIR) {
//                wSettings.setDatabaseEnabled(true);
//            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ECLAIR) {
//                wSettings.setGeolocationEnabled(true);
//            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ECLAIR_MR1) {
//                wSettings.setAppCacheEnabled(true);
//            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
//                wSettings.setMediaPlaybackRequiresUserGesture(false);
//            }
//            wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
////            wSettings.setForceDark(FORCE_DARK_ON);
//
//
//            // allow google login
//            // @see https://stackoverflow.com/questions/45863004/how-some-apps-are-able-to-perform-google-login-successfully-in-android-webview
//            // Force links and redirects to open in the WebView instead of in a browser
////            wv.setWebViewClient(new WebViewClient());
//            wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.CUPCAKE) {
//                wSettings.setUserAgentString("Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36");
//            }
////            wSettings.setUserAgentString("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.13; rv:61.0) Gecko/20100101 Firefox/61.0");
////        wSettings.setUserAgentString(wSettings.getUserAgentString().replace("; wv",""));
//
//            wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
//
//            boolean IS_DEBUG = 0 != (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE);
//
//            jsi = new JavaScriptInterface(this, wv, IS_DEBUG);
//            wv.addJavascriptInterface(jsi, "SUPAndroid");
//
//            if (BuildConfig.FLAVOR.equals("fdroid")) {
//                wv.addJavascriptInterface(jsi, "SUPFDroid");
//            }



            mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onLoadResource(WebView view, String url) {
                Log.i(TAG, "onLoadResource url=" + url);
                super.onLoadResource(view, url);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webview, String url) {
                Log.i(TAG, "intercept url=" + url);
                webview.loadUrl(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                startTime = System.currentTimeMillis();
                Log.e(TAG, "onConfigStarted:" + startTime);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                endTime = System.currentTimeMillis();
                Log.e(TAG, "onConfigFinished:" + (endTime - startTime));
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
            }

            @Nullable
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            }
        });

        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                Log.e(TAG, "onJsAlert " + message);
                result.confirm();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {

                Log.e(TAG, "onJsConfirm " + message);

                return super.onJsConfirm(view, url, message, result);
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {

                Log.e(TAG, "onJsPrompt " + url);

                return super.onJsPrompt(view, url, message, defaultValue, result);
            }
        });
        mWebView.loadUrl("file:///android_asset/native.html");
    }

    public static WebView getWebView() {

        return mWebView;
    }
}
