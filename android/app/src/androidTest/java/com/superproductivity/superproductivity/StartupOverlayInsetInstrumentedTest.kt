package com.superproductivity.superproductivity

import android.graphics.Rect
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.webkit.WebView
import android.widget.EditText
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.AndroidJUnit4
import com.superproductivity.superproductivity.widget.StartupOverlayManager
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.abs
import kotlin.math.roundToInt
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Pins where the native startup overlay (FAB, then the quick-add input bar) sits
 * relative to the system bars and the keyboard, on the real Capacitor shell.
 *
 * The overlay lives on `android.R.id.content`, inside the window's DecorView.
 * Whether that container is already inset is decided by Capacitor's `SystemBars`,
 * and that changed under us: up to 8.5.1 it padded the WebView's parent, so the
 * overlay's container stayed full-window and the overlay lifted itself above the
 * navigation bar and the keyboard. From 8.5.2 it pads the DecorView itself, so
 * the container is already lifted and any inset the overlay adds on top is
 * counted twice (docs/android-edge-to-edge-keyboard.md, "Capacitor 8.5.2+").
 *
 * So this asserts the outcome rather than the mechanism, against the one
 * reference that does not depend on who padded what: the window's visible display
 * frame, whose bottom is the top of the navigation bar or the keyboard. The FAB
 * must end [StartupOverlayManager.FAB_GAP_DP] above it and the expanded bar
 * [StartupOverlayManager.BAR_GAP_DP] above it — with the keyboard closed, open,
 * and closed again. A double-counted inset misses by a whole nav-bar or keyboard
 * height, far outside [TOLERANCE_PX].
 *
 * Runs in the full suite on API 35 (android/run-android-checks.sh) and on the
 * API 34 / WebView < 140 emulator (android/run-android-ime-check.sh), which sit
 * in different `SystemBars` branches. Geometry only is logged, never user content.
 */
@RunWith(AndroidJUnit4::class)
class StartupOverlayInsetInstrumentedTest {

    private data class Geometry(
        val rootHeight: Int,
        /** Visible display frame — nav bar and keyboard top, in screen coordinates. */
        val rectTop: Int,
        val rectBottom: Int,
        /** Padding `SystemBars` put on the DecorView — diagnostic only. */
        val decorPadding: String,
        val contentBottom: Int,
        val fabVisible: Boolean,
        val fabBottom: Int,
        val barVisible: Boolean,
        val barTop: Int,
        val barBottom: Int,
        val barTranslationY: Float,
        val imeVisible: Boolean,
    ) {
        /** Same criterion as `CapacitorMainActivity`'s keyboard listener. */
        val keyboardOpen: Boolean
            get() = rootHeight - rectBottom > rootHeight * 0.15
    }

    @Test
    fun overlaySitsAboveTheSystemBarsAndTheKeyboardExactlyOnce() {
        val scenario = ActivityScenario.launch(CapacitorMainActivity::class.java)
        lateinit var activity: CapacitorMainActivity
        lateinit var webView: WebView
        var webRoot: File? = null

        try {
            scenario.onActivity { a ->
                activity = a
                webView = a.bridge.webView
                val root = File(a.cacheDir, "startup-overlay-inset-test")
                check(root.mkdirs() || root.isDirectory)
                File(root, "index.html").writeText(TEST_PAGE)
                webRoot = root
                a.bridge.setServerBasePath(root.absolutePath)
            }
            // A committed page is what flips SystemBars into its final branch
            // (it reads viewport-fit back at onPageCommitVisible), so the resting
            // reading below is taken after that switch, not before it.
            awaitJavaScript(webView, "document.readyState === 'complete' && !!document.getElementById('ready')")

            val density = onMainSync { activity.resources.displayMetrics.density }
            val fabGapPx = (StartupOverlayManager.FAB_GAP_DP * density).toInt()
            val barGapPx = (StartupOverlayManager.BAR_GAP_DP * density).toInt()
            val current =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WebView.getCurrentWebViewPackage() else null
            Log.i(
                TAG,
                "sdk=${Build.VERSION.SDK_INT} webView=${current?.packageName}/${current?.versionName} " +
                    "density=$density fabGapPx=$fabGapPx barGapPx=$barGapPx",
            )

            val resting = awaitStable(activity, "the FAB to settle with the keyboard closed") {
                it.fabVisible && !it.keyboardOpen
            }
            Log.i(TAG, "resting: $resting")
            assertBottomAt("FAB, keyboard closed", resting.fabBottom, resting.rectBottom - fabGapPx, resting)

            onMainSync { activity.findViewById<View>(R.id.startup_fab).performClick() }
            val open = awaitImeOpen(activity)
            Log.i(TAG, "open: $open")
            assertBottomAt("input bar, keyboard open", open.barBottom, open.rectBottom - barGapPx, open)
            assertTrue("input bar must be on screen with the keyboard open: $open", open.barTop >= open.rectTop)

            onMainSync {
                val editText = activity.findViewById<EditText>(R.id.startup_task_input)
                activity.getSystemService(InputMethodManager::class.java)
                    .hideSoftInputFromWindow(editText.windowToken, 0)
            }
            val closed = awaitStable(activity, "the input bar to settle with the keyboard closed again") {
                it.barVisible && !it.keyboardOpen
            }
            Log.i(TAG, "closed: $closed")
            assertBottomAt("input bar, keyboard closed", closed.barBottom, closed.rectBottom - barGapPx, closed)
        } finally {
            scenario.close()
            webRoot?.deleteRecursively()
        }
    }

    private fun assertBottomAt(what: String, actual: Int, expected: Int, geometry: Geometry) {
        assertTrue(
            "$what: bottom edge at $actual, expected $expected (visible-frame bottom minus its gap) " +
                "within ${TOLERANCE_PX}px — off by ${actual - expected}px. A miss by a whole nav-bar or " +
                "keyboard height means the inset was counted twice. $geometry",
            abs(actual - expected) <= TOLERANCE_PX,
        )
    }

    /**
     * The overlay asks for the IME itself (implicitly, 200ms after the tap). One
     * explicit request as a fallback if that did nothing on the emulator, then a
     * hard failure — never a silent pass.
     */
    private fun awaitImeOpen(activity: CapacitorMainActivity): Geometry {
        val settled: (Geometry) -> Boolean = { it.barVisible && it.keyboardOpen }
        pollStable(activity, SHOW_IME_FIRST_TRY_SECONDS, settled)?.let { return it }
        Log.i(TAG, "IME not open after the overlay's own request; asking explicitly")
        onMainSync {
            val editText = activity.findViewById<EditText>(R.id.startup_task_input)
            editText.requestFocus()
            WindowInsetsControllerCompat(activity.window, editText).show(WindowInsetsCompat.Type.ime())
            activity.getSystemService(InputMethodManager::class.java)
                .showSoftInput(editText, InputMethodManager.SHOW_IMPLICIT)
        }
        return awaitStable(
            activity,
            "the IME to open under the expanded input bar (on an emulator make sure " +
                "`settings put secure show_ime_with_hard_keyboard 1` ran)",
            predicate = settled,
        )
    }

    private fun measure(activity: CapacitorMainActivity): Geometry = onMainSync {
        val content = activity.findViewById<View>(android.R.id.content)
        val decor = activity.window.decorView
        val fab = activity.findViewById<View>(R.id.startup_fab)
        val bar = activity.findViewById<View>(R.id.startup_overlay_bar)
        val rect = Rect()
        content.getWindowVisibleDisplayFrame(rect)
        val location = IntArray(2)
        content.getLocationOnScreen(location)
        val contentBottom = location[1] + content.height
        var fabBottom = -1
        if (fab != null) {
            fab.getLocationOnScreen(location)
            fabBottom = location[1] + fab.height
        }
        var barTop = -1
        var barBottom = -1
        if (bar != null) {
            bar.getLocationOnScreen(location)
            barTop = location[1]
            barBottom = location[1] + bar.height
        }
        Geometry(
            rootHeight = content.rootView.height,
            rectTop = rect.top,
            rectBottom = rect.bottom,
            decorPadding = "${decor.paddingLeft},${decor.paddingTop},${decor.paddingRight},${decor.paddingBottom}",
            contentBottom = contentBottom,
            fabVisible = fab != null && fab.isShown && fab.height > 0,
            fabBottom = fabBottom,
            barVisible = bar != null && bar.isShown && bar.height > 0,
            barTop = barTop,
            barBottom = barBottom,
            barTranslationY = bar?.translationY ?: 0f,
            imeVisible = ViewCompat.getRootWindowInsets(content)
                ?.isVisible(WindowInsetsCompat.Type.ime()) == true,
        )
    }

    /**
     * Polls until [predicate] holds and the reading is unchanged for
     * [STABLE_READINGS] consecutive polls (animations and inset passes done).
     */
    private fun pollStable(
        activity: CapacitorMainActivity,
        timeoutSeconds: Long,
        predicate: (Geometry) -> Boolean,
    ): Geometry? {
        val deadline = SystemClock.elapsedRealtime() + TimeUnit.SECONDS.toMillis(timeoutSeconds)
        var previous: Geometry? = null
        var sameCount = 0
        do {
            val current = measure(activity)
            lastGeometry = current
            if (predicate(current) && current.barTranslationY.roundToInt() == 0) {
                sameCount = if (current == previous) sameCount + 1 else 1
                if (sameCount >= STABLE_READINGS) return current
            } else {
                sameCount = 0
            }
            previous = current
            SystemClock.sleep(POLL_MS)
        } while (SystemClock.elapsedRealtime() < deadline)
        return null
    }

    private fun awaitStable(
        activity: CapacitorMainActivity,
        waitingFor: String,
        timeoutSeconds: Long = DEFAULT_TIMEOUT_SECONDS,
        predicate: (Geometry) -> Boolean,
    ): Geometry =
        pollStable(activity, timeoutSeconds, predicate)
            ?: run {
                fail("Timed out waiting for $waitingFor; last geometry: $lastGeometry")
                error("unreachable")
            }

    private var lastGeometry: Geometry? = null

    private fun <T> onMainSync(block: () -> T): T {
        val result = AtomicReference<T>()
        InstrumentationRegistry.getInstrumentation().runOnMainSync { result.set(block()) }
        return result.get()
    }

    private fun awaitJavaScript(webView: WebView, predicate: String) {
        val deadline = SystemClock.elapsedRealtime() + TimeUnit.SECONDS.toMillis(DEFAULT_TIMEOUT_SECONDS)
        var lastResult = "not evaluated"
        while (SystemClock.elapsedRealtime() < deadline) {
            val completed = CountDownLatch(1)
            val result = AtomicReference<String>()
            InstrumentationRegistry.getInstrumentation().runOnMainSync {
                webView.evaluateJavascript("Boolean($predicate)") {
                    result.set(it)
                    completed.countDown()
                }
            }
            assertTrue(
                "JavaScript evaluation should complete",
                completed.await(DEFAULT_TIMEOUT_SECONDS, TimeUnit.SECONDS),
            )
            lastResult = result.get()
            if (lastResult == "true") return
            SystemClock.sleep(POLL_MS)
        }
        fail("Timed out waiting for JavaScript predicate `$predicate`; last result: $lastResult")
    }

    private companion object {
        const val TAG = "SUPOverlayTest"
        const val DEFAULT_TIMEOUT_SECONDS = 15L
        const val SHOW_IME_FIRST_TRY_SECONDS = 6L
        const val POLL_MS = 150L
        const val STABLE_READINGS = 3
        // Sub-pixel rounding between dp margins and the visible frame.
        const val TOLERANCE_PX = 2

        // Mirrors src/index.html's viewport meta: SystemBars reads viewport-fit
        // back from it and branches on it, so the overlay must be measured under
        // the same branch production runs in.
        val TEST_PAGE = """
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <meta
                  name="viewport"
                  content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
                />
              </head>
              <body style="margin: 0"><div id="ready"></div></body>
            </html>
        """.trimIndent()
    }
}
