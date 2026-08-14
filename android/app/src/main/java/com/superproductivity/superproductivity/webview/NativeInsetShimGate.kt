package com.superproductivity.superproductivity.webview

/**
 * Decides whether our native inset shims in `CapacitorMainActivity` must run, or
 * whether Capacitor's built-in `SystemBars` already owns the insets.
 *
 * `SystemBars` installs an `OnApplyWindowInsetsListener` on the WebView's parent
 * (the activity content root) on **every** API level, so it — not the framework —
 * is the inset owner. But it only ever applies IME padding / real safe-area px on
 * two paths (`SystemBars.initWindowInsetsListener`):
 *
 * 1. the passthrough branch, gated `webViewMajor >= 140 && viewport-fit=cover`
 * 2. an `SDK_INT >= 35` branch
 *
 * Outside those two, it applies nothing at all — the keyboard and the status bar
 * are nobody's job. That intersection is what this gate names, so the shims run
 * exactly where `SystemBars` is absent and are a strict no-op everywhere it acts.
 *
 * Widened from the original `SDK_INT < 30` gate for #9316: two users on **API 34
 * with WebView 124 / 126** had the add-task bar sit behind the keyboard, and one
 * of them confirmed the fix by side-loading WebView 151 with no app change. The
 * old gate assumed API >= 30 implies a current WebView because it auto-updates —
 * false on a custom ROM that ships its own `com.android.webview` and disables the
 * Play-updated Google package.
 *
 * @param webViewMajor the **active** provider's major version
 *   (`WebView.getCurrentWebViewPackage()`, the same source `SystemBars` reads), or
 *   `null` when it could not be read.
 */
object NativeInsetShimGate {
    /** `SystemBars` passthrough threshold — `WEBVIEW_VERSION_WITH_SAFE_AREA_FIX`. */
    const val WEBVIEW_VERSION_WITH_INSET_SUPPORT = 140

    /** `SystemBars` pads the WebView for the IME unconditionally from Android 15. */
    const val SDK_WITH_SYSTEM_BARS_IME_PADDING = 35

    fun shouldRunShim(sdkInt: Int, webViewMajor: Int?): Boolean {
        if (sdkInt >= SDK_WITH_SYSTEM_BARS_IME_PADDING) return false
        // Unknown version -> run the shim. SystemBars reads the same provider and
        // treats an unreadable version as 0, so it skips its passthrough branch
        // too; leaving both off would strand the device with no inset owner.
        if (webViewMajor == null) return true
        return webViewMajor < WEBVIEW_VERSION_WITH_INSET_SUPPORT
    }
}
