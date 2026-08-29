# R8 rules for the release build.
#
# Release builds still run with minifyEnabled false (see build.gradle for why —
# enabling it shipped a startup crash to the Play internal track), so these rules
# do not affect anything that ships today. They are NOT inert, though: the
# r8Test build type is minified and is what instrumentation tests run against, so
# every rule here is exercised on every Android PR.
#
# That is also the only validation they have. Treat them as a starting point for
# the re-land ahead of Google Play's February 2027 DEX shrinking/obfuscation
# requirement, and re-land minification only once CI launches the shipped
# variant, not just the test one.
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

# --- Capacitor plugin permissions -------------------------------------------
# Load-bearing, and the cause of #9785 / #9793: nothing in the program ever
# constructs a @CapacitorPlugin — annotation instances are runtime-generated
# proxies — so R8 concludes PluginHandle.pluginAnnotation can only ever hold
# null. It deletes the field and constant-folds every read, which compiles
# Plugin.getPermissionStates(), requestPermissions(), requestPermissionForAliases()
# and pluginRequestAllPermissions() down to a literal `throw null`. On device the
# first JS call that touched permissions (LocalNotifications.checkPermissions)
# killed the process ~3s after launch.
#
# Not fixed by keeping the annotation: dexdump confirms @CapacitorPlugin survives
# intact on the plugin classes. Not caused by R8 full mode either — compat mode
# (android.enableR8.fullMode=false) emits the same `throw null`. Keeping the
# field's owner is what stops the fold.
#
# Capacitor's own consumer rules keep the plugin classes but say nothing about
# PluginHandle, so this has to live here.
# Enforced by CapacitorLifecycleBridgeInstrumentedTest on the r8Test variant.
-keep class com.getcapacitor.PluginHandle { *; }

# --- Instrumented-test seams ------------------------------------------------
# `testBuildType "r8Test"` runs the instrumented suite against a minified APK,
# so an app member that only androidTest sources call is unreachable as far as
# R8 is concerned: it gets shrunk out of the app APK and the test dies on
# NoSuchMethodError. Any future test-only seam needs a line here — check
# build/outputs/mapping/<variant>/usage.txt if a test suddenly cannot find one.
-keepclassmembers class com.superproductivity.superproductivity.service.BackgroundSyncCredentialStore {
    public void forgetCachedPrefsForTest();
}

# --- Tink (via androidx.security-crypto) ------------------------------------
# Tink is annotated with Error Prone annotations that are compile-only and are
# deliberately absent at runtime, so R8 reports them as missing classes. They
# carry no runtime behaviour — suppressing the warning is the documented fix.
-dontwarn com.google.errorprone.annotations.**
