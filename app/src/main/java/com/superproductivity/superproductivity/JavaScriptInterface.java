package com.superproductivity.superproductivity;

import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import static com.superproductivity.superproductivity.Google.RC_SIGN_IN;

public class JavaScriptInterface {
    AppCompatActivity mContext;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(AppCompatActivity c) {
        mContext = c;
    }

    void onActivityResult(int requestCode, int resultCode, Intent data) {
        Toast.makeText(mContext, "JavaScriptInterface onActivityResult", Toast.LENGTH_SHORT).show();

        if (requestCode == RC_SIGN_IN) {
            // The Task returned from this call is always completed, no need to attach
            // a listener.
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            handleSignInResult(task);
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
    public void getGoogleToken() {
        Google g = new Google();
        g.load(mContext);
        g.signIn(mContext);
    }


    private void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            Log.v("TaskListWidget", "signInSUCCESS " + account.toString());
            Log.v("TaskListWidget", "TOKEN " + account.getIdToken());
            Toast.makeText(mContext, "Google Login Success", Toast.LENGTH_SHORT).show();
            // Signed in successfully, show authenticated UI.
        } catch (ApiException e) {
            // The ApiException status code indicates the detailed failure reason.
            // Please refer to the GoogleSignInStatusCodes class reference for more information.
            Log.w("TaskListWidget", "signInResult:failed code=" + e.getStatusCode());
        }
    }
}
