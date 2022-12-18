package com.superproductivity.superproductivity

import android.content.Intent
import android.os.AsyncTask
import android.util.Log
import android.webkit.JavascriptInterface
import com.google.android.gms.auth.GoogleAuthException
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import java.io.IOException
import java.lang.ref.WeakReference

class JavaScriptInterface(private val fullscreenActivity: FullscreenActivity) : CommonJavaScriptInterface(fullscreenActivity) {

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == Google.RC_SIGN_IN) {
            // The Task returned from this call is always completed, no need to attach
            // a listener.
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            handleSignInResult(task)
        }
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    override fun triggerGetGoogleToken() {
        val google =  Google(fullscreenActivity)
        google.load()
        google.signIn()
    }

    private fun handleSignInResult(completedTask: Task<GoogleSignInAccount>) {
        try {
            val account = completedTask.getResult(ApiException::class.java)
            GetAccessToken(fullscreenActivity, account).execute()
            // Signed in successfully, show authenticated UI.
        } catch (e: ApiException ) {
            // The ApiException status code indicates the detailed failure reason.
            // Please refer to the GoogleSignInStatusCodes class reference for more information.
            Log.w("TW", "signInResult:failed code=" + e.statusCode)
            callJavaScriptFunction("window.googleGetTokenErrorCallback('" + e.statusCode + "')")
        }
    }

    class GetAccessToken(
        fullscreenActivity: FullscreenActivity, private val account: GoogleSignInAccount
    ) : AsyncTask<Void, Void, String>() {

        private val activityReference = WeakReference(fullscreenActivity)

        @Deprecated("Deprecated in Java")
        override fun doInBackground(vararg params: Void): String? {
            val activity: FullscreenActivity = activityReference.get()!!
            var accessToken: String? = null
            try {
                accessToken =
                    GoogleAuthUtil.getToken(activity, account.account!!, "oauth2:profile email")
                activity.callJavaScriptFunction("window.googleGetTokenSuccessCallback('$accessToken')")
                Log.d("TW", "accessToken $accessToken")
            } catch (e: IOException) {
                e.printStackTrace()
            } catch (e: GoogleAuthException) {
                e.printStackTrace()
            }
            return accessToken
        }

        @Deprecated("Deprecated in Java")
        override fun onPostExecute(result: String) {
            // get a reference to the activity if it is still there
            activityReference.get()
        }
    }
}
