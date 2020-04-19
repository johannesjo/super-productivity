package com.superproductivity.superproductivity;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import static com.superproductivity.superproductivity.Google.RC_SIGN_IN;

/**
 * An example full-screen activity that shows and hides the system UI (i.e.
 * status bar and navigation/system bar) with user interaction.
 */
public class FullscreenActivity extends AppCompatActivity {
    JavaScriptInterface jsi;

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

        WebSettings wSettings = wv.getSettings();
        wSettings.setJavaScriptEnabled(true);
        wSettings.setDomStorageEnabled(true);
        wSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        wSettings.setLoadsImagesAutomatically(true);
        wSettings.setLoadWithOverviewMode(true);


        // allow google login
        // @see https://stackoverflow.com/questions/45863004/how-some-apps-are-able-to-perform-google-login-successfully-in-android-webview
        // Force links and redirects to open in the WebView instead of in a browser
//        wv.setWebViewClient(new WebViewClient());
        wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
//        wSettings.setUserAgentString("Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36");
//        wSettings.setUserAgentString(wSettings.getUserAgentString().replace("; wv",""));

        wSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        jsi = new JavaScriptInterface(this);
        wv.addJavascriptInterface(jsi, "SUPAndroid");

//        wv.loadUrl("http://10.0.2.2:4200");
        wv.loadUrl("https://app.super-productivity.com");

        googleSignIn();
//        jsi.getGoogleToken();

    }

    void googleSignIn() {
        Google g = new Google();
        GoogleSignInClient googleSignInClient = g.load(this);
        g.signIn(this);
    }


    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Toast.makeText(this, "Google onActivityResult", Toast.LENGTH_SHORT).show();
        jsi.onActivityResult(requestCode, resultCode, data);
    }

    private void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            Log.v("TaskListWidget", "signInSUCCESS " + account.toString());
            Log.v("TaskListWidget", "TOKEN " + account.getIdToken());
            Toast.makeText(this, "Google Login Success", Toast.LENGTH_SHORT).show();


            // Signed in successfully, show authenticated UI.
        } catch (ApiException e) {
            // The ApiException status code indicates the detailed failure reason.
            // Please refer to the GoogleSignInStatusCodes class reference for more information.
            Log.w("TaskListWidget", "signInResult:failed code=" + e.getStatusCode());
        }
    }
}
