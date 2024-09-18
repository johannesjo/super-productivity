package com.superproductivity.superproductivity

import android.graphics.Rect
import android.os.Bundle
import android.util.Log
import android.view.View
import com.getcapacitor.BridgeActivity

class CapacitorFullscreenActivity : BridgeActivity() {
    var isInForeground: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
      super.onCreate(savedInstanceState)

      // Register Plugin
      // TODO:

      // Hide the action bar
      supportActionBar?.hide()

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
      isInForeground = false
      Log.v("TW", "CapacitorFullscreenActivity: onPause")
      callJavaScriptFunction("window.SUPAndroid.next.onPause$()")
    }

    override fun onResume() {
      super.onResume()
      isInForeground = true
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
}
