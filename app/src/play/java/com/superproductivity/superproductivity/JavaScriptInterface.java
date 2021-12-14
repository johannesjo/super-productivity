package com.superproductivity.superproductivity;

import android.content.Intent;
import android.os.AsyncTask;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.google.android.gms.auth.GoogleAuthException;
import com.google.android.gms.auth.GoogleAuthUtil;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.io.IOException;
import java.lang.ref.WeakReference;

import static com.superproductivity.superproductivity.Google.RC_SIGN_IN;

public class JavaScriptInterface extends CommonJavaScriptInterface {
    private final boolean IS_DEBUG;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(FullscreenActivity c, WebView wv, boolean isDebug) {
        super(c, wv);
        IS_DEBUG = isDebug;
        _callJavaScriptFunction("window.SUP_ANDROID_VERSION=" + BuildConfig.VERSION_CODE + ";");
    }

    @Override
    void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_SIGN_IN) {
            // The Task returned from this call is always completed, no need to attach
            // a listener.
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            _handleSignInResult(task);
        }
    }

    @SuppressWarnings("unused")
    @Override
    @JavascriptInterface
    public void triggerGetGoogleToken() {
        Google g = new Google(IS_DEBUG);
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
            Log.w("TW", "signInResult:failed code=" + e.getStatusCode());
            _callJavaScriptFunction("window.googleGetTokenErrorCallback('" + e.getStatusCode() + "')");
        }
    }

    private static class GetAccessToken extends AsyncTask<Void, Void, String> {
        private final WeakReference<FullscreenActivity> activityReference;
        private final GoogleSignInAccount account;

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
                activity.callJavaScriptFunction("window.googleGetTokenSuccessCallback('" + accessToken + "')");
                Log.d("TW", "accessToken " + accessToken);
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
