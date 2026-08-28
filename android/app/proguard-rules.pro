# R8 rules for the release build.
#
# INERT RIGHT NOW: release builds run with minifyEnabled false (see build.gradle
# for why — enabling it shipped a startup crash to the Play internal track). This
# file is kept staged for re-enabling minification ahead of Google Play's
# February 2027 DEX shrinking/obfuscation requirement.
#
# It is NOT known to be sufficient: it was only ever validated by grepping
# mapping.txt, never by starting a minified build. Treat the rules below as a
# starting point, and re-land minification only behind CI that actually launches
# the minified APK.
#
# Everything R8 cannot see statically has to be kept here — reflection and the
# WebView bridge both look like dead code to it.

# --- WebView JS bridge ------------------------------------------------------
# The Angular app calls these methods by name off the injected window property,
# so R8 must neither rename nor drop them. Redundant today: the AGP default
# proguard file keeps @JavascriptInterface members globally.
# Kept because it names the one class we actually depend on, and because the
# failure is silent — a stripped bridge method builds and installs fine, the JS
# call just goes nowhere. tools/verify-r8-mapping.mjs is what enforces it.
-keepclassmembers class com.superproductivity.superproductivity.webview.JavaScriptInterface {
    @android.webkit.JavascriptInterface <methods>;
}

# --- WorkManager ------------------------------------------------------------
# Workers are instantiated reflectively from the class name persisted in the
# WorkManager database. Redundant today, and measurably so — dropping this rule
# still leaves SyncReminderWorker un-renamed, because SyncReminderScheduler
# names the class through PeriodicWorkRequestBuilder<SyncReminderWorker>, so R8
# keeps it and work-runtime's own -keepnames preserves the name. It stops being
# redundant as soon as a worker is only ever referenced as a string: -keepnames
# permits shrinking, so R8 would drop it. Same silent failure as above.
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}

# --- Tink (via androidx.security-crypto) ------------------------------------
# Tink is annotated with Error Prone annotations that are compile-only and are
# deliberately absent at runtime, so R8 reports them as missing classes. They
# carry no runtime behaviour — suppressing the warning is the documented fix.
-dontwarn com.google.errorprone.annotations.**
