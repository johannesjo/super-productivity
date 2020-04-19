package com.superproductivity.superproductivity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;

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

public class Google {
    static final int RC_SIGN_IN = 1337;

    private String CLIENT_ID_WEB = "37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com";
    private GoogleSignInClient googleSignInClient;

    GoogleSignInClient load(AppCompatActivity ctxIn) {

        GoogleSignInOptions.Builder googleSignInBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(CLIENT_ID)
                .requestEmail();

        GoogleSignInOptions googleSignInOptions = googleSignInBuilder.build();
        googleSignInClient = GoogleSignIn.getClient((Context) ctxIn, googleSignInOptions);
        return googleSignInClient;
    }

    void signIn(AppCompatActivity act) {
        Intent signInIntent = googleSignInClient.getSignInIntent();
        act.startActivityForResult(signInIntent, RC_SIGN_IN);
    }
}
