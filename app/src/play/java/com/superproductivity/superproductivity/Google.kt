package com.superproductivity.superproductivity

import android.content.Intent
import android.util.Log
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.Scope
import org.json.JSONArray
import org.json.JSONException

class Google(
    private val activity: FullscreenActivity
) {
    private val token = BuildConfig.CLIENT_ID_WEB

    private lateinit var googleSignInClient: GoogleSignInClient

    fun load(): GoogleSignInClient {
        val googleSignInBuilder = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(token)
            .requestEmail()
        // TODO check if email is needed
        try {
            val scopeArray = JSONArray()
            scopeArray.put("https://www.googleapis.com/auth/drive")
            val firstScope = Scope(scopeArray.getString(0))
            val scopes = arrayOfNulls<Scope>(scopeArray.length())
            for (i in 1 until scopeArray.length()) {
                scopes[i - 1] = Scope(scopeArray.getString(i))
            }
            googleSignInBuilder.requestScopes(firstScope, *scopes)
        } catch (e: JSONException) {
            Log.v("GL_ERR", e.toString())
            e.printStackTrace()
        }
        val googleSignInOptions = googleSignInBuilder.build()
        return GoogleSignIn.getClient(activity, googleSignInOptions)
    }

    fun signIn() {
        val signInIntent: Intent = googleSignInClient.signInIntent
        activity.startActivityForResult(signInIntent, RC_SIGN_IN)
    }

    companion object {
        const val RC_SIGN_IN = 1337
    }
}
