package com.superproductivity.superproductivity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import static android.provider.Settings.System.getString;

public class Google {
    static final int RC_SIGN_IN = 1337;

    private String CLIENT_ID_WEB = "37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com";
    private GoogleSignInClient googleSignInClient;

    GoogleSignInClient load(AppCompatActivity ctxIn) {

        GoogleSignInOptions.Builder googleSignInBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(CLIENT_ID)
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


    private String mAccessToken;
    private long mTokenExpired;


    String requestAccessToken(GoogleSignInAccount googleAccount) {
        if (mAccessToken != null && SystemClock.elapsedRealtime() < mTokenExpired)
            return mAccessToken;
        mTokenExpired = 0;
        mAccessToken = null;

        HttpURLConnection conn = null;
        OutputStream os = null;
        InputStream is = null;
        InputStreamReader isr = null;
        BufferedReader br = null;

        try {
            final URL url = new URL("https://www.googleapis.com/oauth2/v4/token");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setUseCaches(false);
            conn.setDoInput(true);
            conn.setDoOutput(true);
            conn.setConnectTimeout(3000);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

            String SECRET_WEB = "XXXX";
            final StringBuilder b = new StringBuilder();
            b
                    .append("?grant_type=").append("authorization_code").append('&')
                    .append("client_id=").append(CLIENT_ID_WEB).append('&')
                    .append("client_secret=").append(SECRET_WEB).append('&')
                    .append("id_token=").append(googleAccount.getIdToken()).append('&')
                    .append("redirect_uri=").append("").append('&');
//                    .append("code=").append("4/4-alphabetic-string-here").append('&');

//                    .append("client_id=").append(CLIENT_ID_WEB).append('&')
//                    .append("client_secret=").append("S36BCrLhs0TAiQmlViS_88TQ").append('&')
//                    .append("redirect_uri=").append("").append('&')
//                    .append("id_token=").append(googleAccount.getIdToken()).append('&')
//                    .append("grant_type=").append("authorization_code");

            final byte[] postData = b.toString().getBytes("UTF-8");

            os = conn.getOutputStream();
            os.write(postData);

            final int responseCode = conn.getResponseCode();
            if (200 <= responseCode && responseCode <= 299) {
                is = conn.getInputStream();
                isr = new InputStreamReader(is);
                br = new BufferedReader(isr);
            } else {
                Log.d("Error:", conn.getResponseMessage());
                return null;
            }

            b.setLength(0);
            String output;
            while ((output = br.readLine()) != null) {
                b.append(output);
            }

            final JSONObject jsonResponse = new JSONObject(b.toString());
            mAccessToken = jsonResponse.getString("access_token");
            mTokenExpired = SystemClock.elapsedRealtime() + jsonResponse.getLong("expires_in") * 1000;

            return mAccessToken;
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (os != null) {
                try {
                    os.close();
                } catch (IOException e) {
                }
            }
            if (is != null) {
                try {
                    is.close();
                } catch (IOException e) {
                }
            }
            if (isr != null) {
                try {
                    isr.close();
                } catch (IOException e) {
                }
            }
            if (br != null) {
                try {
                    br.close();
                } catch (IOException e) {
                }
            }
            if (conn != null) {
                conn.disconnect();
            }
        }
        return null;
    }
}
