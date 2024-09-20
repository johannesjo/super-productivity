package com.superproductivity.superproductivity

import android.graphics.Rect
import android.os.Bundle
import android.util.Log
import android.view.View
import com.anggrayudi.storage.SimpleStorageHelper
import com.getcapacitor.BridgeActivity

class CapacitorFullscreenActivity : BridgeActivity() {
    private lateinit var javaScriptInterface: JavaScriptInterface

    val storageHelper =
        SimpleStorageHelper(this) // for scoped storage permission management on Android 10+

    override fun onCreate(savedInstanceState: Bundle?) {
      super.onCreate(savedInstanceState)

      // Register Plugin
      // TODO:

      // Hide the action bar
      supportActionBar?.hide()

      // Initialize JavaScriptInterface
      javaScriptInterface = JavaScriptInterface(this, bridge.webView, storageHelper)

      // Inject JavaScriptInterface into Capacitor's WebView
      bridge.webView.addJavascriptInterface(javaScriptInterface,
        WINDOW_INTERFACE_PROPERTY
      )
      if (BuildConfig.FLAVOR.equals("fdroid")) {
        bridge.webView.addJavascriptInterface(javaScriptInterface,
          WINDOW_PROPERTY_F_DROID
        )
        // not ready in time, that's why we create a second JS interface just to fill the prop
        // callJavaScriptFunction("window.$WINDOW_PROPERTY_F_DROID=true")
      }

      // Handle keyboard visibility changes
      val rootView = findViewById<View>(android.R.id.content)
      rootView.viewTreeObserver.addOnGlobalLayoutListener {
        val rect = Rect()
        rootView.getWindowVisibleDisplayFrame(rect)
        val screenHeight = rootView.rootView.height

        val keypadHeight = screenHeight - rect.bottom
        if (keypadHeight > screenHeight * 0.15) {
          // Keyboard is opened
          callJavaScriptFunction("window.SUPAndroid.next.isKeyboardShown$('true')")
        } else {
          // Keyboard is closed
          callJavaScriptFunction("window.SUPAndroid.next.isKeyboardShown$('false')")
        }
      }
    }

    override fun onPause() {
      super.onPause()
      Log.v("TW", "CapacitorFullscreenActivity: onPause")
      callJavaScriptFunction("window.SUPAndroid.next.onPause$()")
    }

    override fun onResume() {
      super.onResume()
      Log.v("TW", "CapacitorFullscreenActivity: onResume")
      callJavaScriptFunction("window.SUPAndroid.next.onResume$()")
    }

//    override fun onBackPressed() {
//      if (!bridge.handleBackPressed()) {
//        super.onBackPressed()
//      }
//    }

    private fun callJavaScriptFunction(script: String) {
      bridge?.webView?.post {
        bridge?.webView?.evaluateJavascript(script, null)
      }
    }

  companion object {
    const val WINDOW_INTERFACE_PROPERTY: String = "SUPAndroid"
    const val WINDOW_PROPERTY_F_DROID: String = "SUPFDroid"
  }
}
