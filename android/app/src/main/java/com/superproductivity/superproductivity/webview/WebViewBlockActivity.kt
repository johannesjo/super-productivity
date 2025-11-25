package com.superproductivity.superproductivity.webview

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.superproductivity.superproductivity.R

class WebViewBlockActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_webview_block)

        val minVersion = intent.getIntExtra(EXTRA_MIN_VERSION, WebViewCompatibilityChecker.MIN_CHROMIUM_VERSION)
        val detectedVersion = intent.getIntExtra(EXTRA_VERSION_MAJOR, -1)
        val versionName = intent.getStringExtra(EXTRA_VERSION_NAME)
        val provider = intent.getStringExtra(EXTRA_PROVIDER_PACKAGE)

        val message = getString(R.string.webview_block_message, minVersion)
        findViewById<TextView>(R.id.webview_block_title).text = message

        val details = buildString {
            if (detectedVersion > 0) {
                append(getString(R.string.webview_block_detected_major, detectedVersion))
                append("\n")
            }
            if (!versionName.isNullOrBlank()) {
                append(getString(R.string.webview_block_detected_full, versionName))
                append("\n")
            }
            if (!provider.isNullOrBlank()) {
                append(getString(R.string.webview_block_provider, provider))
            }
        }.trim()
        findViewById<TextView>(R.id.webview_block_details).text = details

        findViewById<Button>(R.id.webview_block_update).setOnClickListener {
            WebViewCompatibilityChecker.openWebViewUpdatePage(this)
        }

        findViewById<Button>(R.id.webview_block_close).setOnClickListener {
            finishAffinity()
        }
    }

    companion object {
        private const val EXTRA_VERSION_MAJOR = "extra_version_major"
        private const val EXTRA_VERSION_NAME = "extra_version_name"
        private const val EXTRA_PROVIDER_PACKAGE = "extra_provider_package"
        private const val EXTRA_MIN_VERSION = "extra_min_version"

        fun present(host: Activity, result: WebViewCompatibilityChecker.Result) {
            val intent =
                Intent(host, WebViewBlockActivity::class.java)
                    .putExtra(EXTRA_VERSION_MAJOR, result.majorVersion ?: -1)
                    .putExtra(EXTRA_VERSION_NAME, result.providerVersionName)
                    .putExtra(EXTRA_PROVIDER_PACKAGE, result.providerPackage)
                    .putExtra(EXTRA_MIN_VERSION, WebViewCompatibilityChecker.MIN_CHROMIUM_VERSION)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)

            host.startActivity(intent)
        }
    }
}
