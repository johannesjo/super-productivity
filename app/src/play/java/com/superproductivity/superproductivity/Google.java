package com.superproductivity.superproductivity;

import android.content.Context;
import android.content.Intent;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.Scope;

import org.json.JSONArray;
import org.json.JSONException;
import android.util.Log;

public class Google {
    static final int RC_SIGN_IN = 1337;
    private final String TOKEN;


    Google(boolean isDebug) {
        if (isDebug) {
            TOKEN = GoogleClientId.CLIENT_ID_DEBUG;
        } else {
            TOKEN = GoogleClientId.CLIENT_ID_PROD;
        }
    }

    private GoogleSignInClient googleSignInClient;

    GoogleSignInClient load(AppCompatActivity ctxIn) {
        GoogleSignInOptions.Builder googleSignInBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(TOKEN)
                .requestEmail();

        try {
            JSONArray scopeArray = new JSONArray();
            scopeArray.put("https://www.googleapis.com/auth/drive");

            Scope[] scopes = new Scope[scopeArray.length() - 1];
            Scope firstScope = new Scope(scopeArray.getString(0));
            for (int i = 1; i < scopeArray.length(); i++) {
                scopes[i - 1] = new Scope(scopeArray.getString(i));
            }
            googleSignInBuilder.requestScopes(firstScope, scopes);
        } catch (JSONException e) {
            Log.v("GL_ERR", e.toString());
            e.printStackTrace();
        }

        GoogleSignInOptions googleSignInOptions = googleSignInBuilder.build();
        googleSignInClient = GoogleSignIn.getClient((Context) ctxIn, googleSignInOptions);
        return googleSignInClient;
    }

    void signIn(AppCompatActivity act) {
        Intent signInIntent = googleSignInClient.getSignInIntent();
        act.startActivityForResult(signInIntent, RC_SIGN_IN);
    }
}
