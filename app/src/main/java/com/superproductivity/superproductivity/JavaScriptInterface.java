package com.superproductivity.superproductivity;

import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import static com.superproductivity.superproductivity.Google.RC_SIGN_IN;

public class JavaScriptInterface {
    private AppCompatActivity mContext;
    private WebView webView;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(AppCompatActivity c, WebView wv) {
        mContext = c;
        webView = wv;
    }

    void onActivityResult(int requestCode, int resultCode, Intent data) {
        Toast.makeText(mContext, "JavaScriptInterface onActivityResult", Toast.LENGTH_SHORT).show();

        if (requestCode == RC_SIGN_IN) {
            // The Task returned from this call is always completed, no need to attach
            // a listener.
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            _handleSignInResult(task);
        }
    }


    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void updateTaskData(String str) {
        Intent intent = new Intent(mContext.getApplicationContext(), TaskListWidget.class);
        intent.setAction(TaskListWidget.LIST_CHANGED);
        intent.putExtra("taskJson", str);

        TaskListDataService.getInstance().setData(str);
        mContext.sendBroadcast(intent);
    }


    @SuppressWarnings("unused")
    @JavascriptInterface
    public void triggerGetGoogleToken() {
        Google g = new Google();
        g.load(mContext);
        g.signIn(mContext);
    }

//    @JavascriptInterface
//    public void setWebViewTextCallback(){
//        String script = WebViewUtils.formatScript("setText","This is a text from Android which is set " +
//                "in the html page.");
//        WebViewUtils.callJavaScriptFunction(webView,script);
//    }


    private void _handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            Log.v("TaskListWidget", "signInSUCCESS " + account.toString());
            Log.v("TaskListWidget", "TOKEN " + account.getIdToken());
            Toast.makeText(mContext, "Google Login Success", Toast.LENGTH_SHORT).show();
            String token = account.getIdToken();
            _callJavaScriptFunction("window.googleGetTokenSuccessCallback(\'" + token + "\')");
            // Signed in successfully, show authenticated UI.
        } catch (ApiException e) {
            // The ApiException status code indicates the detailed failure reason.
            // Please refer to the GoogleSignInStatusCodes class reference for more information.
            Log.w("TaskListWidget", "signInResult:failed code=" + e.getStatusCode());
            _callJavaScriptFunction("window.googleGetTokenErrorCallback(\'" + e.getStatusCode() + "\')");
        }
    }

    private void _callJavaScriptFunction(final String script) {
        if (webView == null) {
            return;
        }
        webView.post(new Runnable() {
            @Override
            public void run() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    webView.evaluateJavascript(script, new ValueCallback<String>() {
                        @Override
                        public void onReceiveValue(String value) {

                        }
                    });
                } else {
                    webView.loadUrl("javascript:" + script);
                }
            }
        });
    }
}
