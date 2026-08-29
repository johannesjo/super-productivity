# R8 rules that exist ONLY because instrumentation runs against the minified
# APK. Applied to the r8Test build type, never to release — each rule here is a
# concession to the test harness, not something the shipped app needs.
#
# Why this file has to exist at all: `testBuildType "r8Test"` makes AGP minify
# the androidTest APK too, with `-applymapping` from the app. kotlin-stdlib
# ships inside the app APK and is not duplicated into the test APK, so Kotlin
# test-side code calls into the app's copy under its mapped name. Anything R8
# removed from the app because the *app* never called it is then a
# NoSuchMethodError at runtime.

# --- Kotlin null-check intrinsics -------------------------------------------
# R8 strips Intrinsics.checkNotNullParameter() from the app as a no-op, but the
# androidTest APK still calls it under its mapped name. androidx.test's
# AppComponentFactoryRegistry is Kotlin, and its instantiateApplication(
# ClassLoader, String) emits that call as its first instruction — so the app
# process died in handleBindApplication, before Application even existed:
#
#   java.lang.NoSuchMethodError: No static method f(Ljava/lang/Object;Ljava/lang/String;)V
#     in class Lr6/h;   (= kotlin.jvm.internal.Intrinsics.checkNotNullParameter)
#       at androidx.test.platform.app.AppComponentFactoryRegistry.instantiateApplication
#       at androidx.test.runner.MonitoringInstrumentation.newApplication
#       at android.app.ActivityThread.handleBindApplication
#
# Every test crashed at process start, and UTP's am_instrument_timeout defaults
# to 31536000 seconds, so the run hung rather than failing. The 15-minute bound
# in android/run-instrumentation-tests.sh is what turns that into a report.
#
# Release must keep stripping these — that is why the rule lives here and not
# in proguard-rules.pro.
-keep class kotlin.jvm.internal.Intrinsics { *; }
