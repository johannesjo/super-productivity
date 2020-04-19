package com.superproductivity.superproductivity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class Google extends Activity {
    static final int RC_SIGN_IN = 1337;

    private String CLIENT_ID_WEB = "37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com";
    private GoogleSignInClient googleSignInClient;
    private Context ctx;

    public GoogleSignInClient load(Context ctxIn) {
        ctx = ctxIn;

        GoogleSignInOptions.Builder googleSignInBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(CLIENT_ID)
//                .requestServerAuthCode(CLIENT_ID)
                .requestEmail();

//        try {
//            JSONArray scopeArray = new JSONArray();
////            scopeArray.put("https://www.googleapis.com/auth/drive");
//
//            Scope[] scopes = new Scope[scopeArray.length() - 1];
//            Scope firstScope = new Scope(scopeArray.getString(0));
//            for (int i = 1; i < scopeArray.length(); i++) {
//                scopes[i - 1] = new Scope(scopeArray.getString(i));
//            }
//            googleSignInBuilder.requestScopes(firstScope, scopes);
//        } catch (JSONException e) {
//            e.printStackTrace();
//        }

        GoogleSignInOptions googleSignInOptions = googleSignInBuilder.build();
        googleSignInClient = GoogleSignIn.getClient(ctx, googleSignInOptions);
        return googleSignInClient;
    }

    public void signIn() {
        Intent signInIntent = googleSignInClient.getSignInIntent();
//         startActivityForResult();
        startActivityForResult(signInIntent, RC_SIGN_IN);
//        ctx.startActivity();
        /*
        1.
        call context.startActivityForResult()

         */
    }

    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
//        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            handleSignInResult(task);
        }
    }

    private void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
//        if (signInCall == null) return;

        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);

            JSONObject authentication = new JSONObject();
            //            user.put("idToken", account.getIdToken());
//            authentication.put("idToken", account.getIdToken());

            JSONObject user = new JSONObject();
//            user.put("serverAuthCode", account.getServerAuthCode());
//            user.put("idToken", account.getIdToken());
//            user.put("authentication", authentication);
//
//            user.put("displayName", account.getDisplayName());
//            user.put("email", account.getEmail());
//            user.put("familyName", account.getFamilyName());
//            user.put("givenName", account.getGivenName());
//            user.put("id", account.getId());
//            user.put("imageUrl", account.getPhotoUrl());

//            signInCall.success(user);

        } catch (ApiException e) {
//            signInCall.error("Something went wrong", e);
        }
    }
}
