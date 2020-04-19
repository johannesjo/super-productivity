package com.superproductivity.superproductivity;

import android.content.Intent;
import android.os.AsyncTask;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.io.IOException;
import java.lang.ref.WeakReference;

import static com.superproductivity.superproductivity.Google.RC_SIGN_IN;

public class JavaScriptInterface {
    private FullscreenActivity mContext;
    private WebView webView;
    private Google g;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(FullscreenActivity c, WebView wv) {
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
        g = new Google();
        g.load(mContext);
        g.signIn(mContext);
    }


    private void _handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            new GetAccessToken(mContext, account).execute();
            // Signed in successfully, show authenticated UI.
        } catch (ApiException e) {
            // The ApiException status code indicates the detailed failure reason.
            // Please refer to the GoogleSignInStatusCodes class reference for more information.
            Log.w("TaskListWidget", "signInResult:failed code=" + e.getStatusCode());
            _callJavaScriptFunction("window.googleGetTokenErrorCallback(\'" + e.getStatusCode() + "\')");
        }
    }

    private static class GetAccessToken extends AsyncTask<Void, Void, String> {
        private WeakReference<FullscreenActivity> activityReference;
        private GoogleSignInAccount account;

        // only retain a weak reference to the activity
        GetAccessToken(FullscreenActivity context, GoogleSignInAccount accountIn) {
            activityReference = new WeakReference<>(context);
            account = accountIn;
        }

        @Override
        protected String doInBackground(Void... params) {
            FullscreenActivity activity = activityReference.get();
            String accessToken = null;
            try {
                accessToken = GoogleAuthUtil.getToken(activity, account.getEmail(), "oauth2:profile email");
                activity.callJavaScriptFunction("window.googleGetTokenSuccessCallback(\'" + accessToken + "\')");
                Log.d("TaskListWidget", "accessToken " + accessToken);
            } catch (IOException | GoogleAuthException e) {
                e.printStackTrace();
            }
            return accessToken;

        }

        @Override
        protected void onPostExecute(String result) {
            // get a reference to the activity if it is still there
            FullscreenActivity activity = activityReference.get();
        }
    }


    private void _callJavaScriptFunction(final String script) {
        mContext.callJavaScriptFunction(script);
    }
}
