package com.superproductivity.superproductivity

import android.content.Context
import android.os.SystemClock
import android.webkit.WebView
import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.runner.AndroidJUnit4
import com.capacitorjs.plugins.app.AppPlugin
import com.getcapacitor.Plugin
import com.getcapacitor.annotation.CapacitorPlugin
import com.superproductivity.plugins.webdavhttp.WebDavHttpPlugin
import com.superproductivity.superproductivity.plugins.NavigationBarPlugin
import com.superproductivity.superproductivity.plugins.SafBridgePlugin
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Native smoke for the Capacitor shell.
 *
 * Two angles, both on the minified r8Test variant. [everyRegisteredPluginResolvesItsPermissionStates]
 * checks natively that every plugin the app registers survives R8 intact.
 * [capacitorPluginsSurviveMinificationAndBackgroundResume] serves controlled
 * HTML through Capacitor's real local server so the production JavaScript
 * injection, plugin bridge, activity lifecycle and WebDavHttp transport all
 * participate. Both stop at the native boundary; configured-provider background
 * sync is covered separately by #9152.
 */
@RunWith(AndroidJUnit4::class)
class CapacitorLifecycleBridgeInstrumentedTest {

    /**
     * The suite claims to cover minification, so refuse to report green from an
     * unminified variant. Without this, changing `testBuildType` in build.gradle
     * would silently disarm every assertion below.
     */
    @Before
    fun requireMinifiedVariant() {
        assertEquals(
            "These tests only mean anything on the minified r8Test variant",
            "r8Test",
            BuildConfig.BUILD_TYPE,
        )
    }

    /**
     * Every registered Capacitor plugin must resolve its permission state.
     *
     * Regression for #9785/#9793. R8 sees nothing in the program constructing a
     * `@CapacitorPlugin` — annotation instances are runtime-generated proxies —
     * so it concludes `PluginHandle.pluginAnnotation` can only hold null, drops
     * the field and folds every read, compiling `Plugin.getPermissionStates()`
     * down to a literal `throw null`. On device that killed the process on the
     * first JS call touching permissions. Fails without the PluginHandle keep
     * rule in proguard-rules.pro.
     *
     * Native and on the test thread on purpose: the same defect reached through
     * JS lands on Capacitor's own handler thread, where it kills the process
     * instead of failing a test. Here it names the plugin that broke.
     */
    @Test
    fun everyRegisteredPluginResolvesItsPermissionStates() {
        val scenario = ActivityScenario.launch(CapacitorMainActivity::class.java)
        try {
            scenario.onActivity { activity ->
                val bridge = activity.bridge
                registeredPluginClasses(activity).forEach { pluginClass ->
                    val annotation = requireNotNull(
                        pluginClass.getAnnotation(CapacitorPlugin::class.java),
                    ) { "@CapacitorPlugin missing on ${pluginClass.name}" }
                    val id = annotation.name.ifEmpty { pluginClass.simpleName }

                    val handle = bridge.getPlugin(id)
                    assertNotNull("Plugin '$id' is not registered on the bridge", handle)
                    val instance = handle.instance
                    assertNotNull("Plugin '$id' registered but never loaded", instance)
                    // The assertion is that this does not throw: on a minified
                    // build without the PluginHandle keep rule it is a literal
                    // `throw null`. The map itself is never null.
                    assertNotNull(
                        "Plugin '$id' cannot resolve its permission states",
                        instance.permissionStates,
                    )
                }
            }
        } finally {
            scenario.close()
        }
    }

    /**
     * The plugins Capacitor loads from `capacitor.plugins.json` — the same asset
     * it reads itself, so `npx cap update` keeps this current — plus the three
     * registered by hand in [CapacitorMainActivity.onCreate], named as classes
     * so removing one breaks the build rather than shrinking the coverage.
     */
    private fun registeredPluginClasses(context: Context): List<Class<out Plugin>> {
        val registry = context.assets.open(CAPACITOR_PLUGINS_ASSET).use {
            JSONTokener(it.readBytes().decodeToString()).nextValue() as JSONArray
        }
        val fromAssets = (0 until registry.length()).map { i ->
            @Suppress("UNCHECKED_CAST")
            Class.forName(registry.getJSONObject(i).getString("classpath")) as Class<out Plugin>
        }
        // Guards against a silently empty registry making the whole test vacuous.
        assertTrue("$CAPACITOR_PLUGINS_ASSET listed no plugins", fromAssets.isNotEmpty())
        return fromAssets + listOf(
            SafBridgePlugin::class.java,
            WebDavHttpPlugin::class.java,
            NavigationBarPlugin::class.java,
        )
    }

    @Test
    fun capacitorPluginsSurviveMinificationAndBackgroundResume() {
        val responseGate = CountDownLatch(1)
        val requestStarted = CountDownLatch(1)
        val recordedRequest = AtomicReference<RecordedRequest>()
        val server = MockWebServer()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                recordedRequest.set(request)
                requestStarted.countDown()
                return if (responseGate.await(20, TimeUnit.SECONDS)) {
                    MockResponse()
                        .setResponseCode(201)
                        .setBody("stored-after-resume")
                } else {
                    MockResponse().setResponseCode(504)
                }
            }
        }
        server.start()

        val scenario = ActivityScenario.launch(CapacitorMainActivity::class.java)
        lateinit var webView: WebView
        var webRoot: File? = null

        try {
            scenario.onActivity { activity ->
                val bridge = activity.bridge
                assertNotNull("Capacitor bridge should be created", bridge)
                assertNotNull("Capacitor WebView should be created", bridge.webView)
                assertEquals(AppPlugin::class.java, bridge.getPlugin("App").pluginClass)
                assertEquals(
                    WebDavHttpPlugin::class.java,
                    bridge.getPlugin("WebDavHttp").pluginClass,
                )

                webView = bridge.webView
                val testWebRoot = File(activity.cacheDir, "capacitor-lifecycle-bridge-smoke")
                check(testWebRoot.mkdirs() || testWebRoot.isDirectory)
                File(testWebRoot, "index.html").writeText(TEST_PAGE)
                webRoot = testWebRoot
                bridge.setServerBasePath(testWebRoot.absolutePath)
            }

            awaitJavaScript(webView, "window.__capacitorSmoke?.ready === true")
            val readyState = readSmokeState(webView)
            assertEquals("android", readyState.getString("platform"))
            assertTrue(readyState.getBoolean("hasAndroidBridge"))
            assertTrue(readyState.getBoolean("hasSupAndroid"))
            assertTrue(readyState.getBoolean("hasAppPlugin"))
            assertTrue(readyState.getBoolean("hasLocalNotificationsPlugin"))
            assertTrue(readyState.getBoolean("hasWebDavPlugin"))
            assertTrue(
                "Capacitor plugin initialization should not reject: ${readyState.optString("readyError")}",
                !readyState.has("readyError"),
            )

            evaluateJavaScript(
                webView,
                "window.startWebDavPut(${JSONObject.quote(server.url("/native-smoke.txt").toString())})",
            )
            assertTrue(
                "WebDavHttp should start the PUT before backgrounding",
                requestStarted.await(10, TimeUnit.SECONDS),
            )
            assertEquals("pending", readSmokeState(webView).getString("putState"))

            scenario.moveToState(Lifecycle.State.CREATED)
            assertEquals(Lifecycle.State.CREATED, scenario.state)
            assertEquals(
                "The server response must still be held while the activity is backgrounded",
                1L,
                responseGate.count,
            )

            scenario.moveToState(Lifecycle.State.RESUMED)
            assertEquals(Lifecycle.State.RESUMED, scenario.state)
            awaitJavaScript(
                webView,
                """
                    window.__capacitorSmoke?.supPause >= 1 &&
                    window.__capacitorSmoke?.supResume >= 1 &&
                    window.__capacitorSmoke?.appStates.includes(false) &&
                    window.__capacitorSmoke?.appStates.includes(true)
                """.trimIndent(),
            )

            val resumedState = readSmokeState(webView)
            assertEquals("pending", resumedState.getString("putState"))
            assertTrue(resumedState.getInt("supPause") >= 1)
            assertTrue(resumedState.getInt("supResume") >= 1)
            assertInactiveThenActive(resumedState.getJSONArray("appStates"))

            responseGate.countDown()
            awaitJavaScript(webView, "window.__capacitorSmoke?.putState === 'resolved'")

            val completedState = readSmokeState(webView)
            assertEquals(201, completedState.getInt("putStatus"))
            assertEquals("stored-after-resume", completedState.getString("putData"))

            val request = recordedRequest.get()
            assertNotNull("Mock server should record the WebDavHttp request", request)
            assertEquals("PUT", request.method)
            assertEquals("/native-smoke.txt", request.path)
            assertEquals("Basic native-smoke-token", request.getHeader("Authorization"))
            assertEquals("lifecycle-body", request.body.readUtf8())
        } finally {
            responseGate.countDown()
            scenario.close()
            server.shutdown()
            webRoot?.deleteRecursively()
        }
    }

    private fun awaitJavaScript(
        webView: WebView,
        predicate: String,
        timeoutSeconds: Long = 10,
    ) {
        val deadline = SystemClock.elapsedRealtime() + TimeUnit.SECONDS.toMillis(timeoutSeconds)
        var lastResult = "not evaluated"
        while (SystemClock.elapsedRealtime() < deadline) {
            lastResult = evaluateJavaScript(webView, "Boolean($predicate)")
            if (lastResult == "true") {
                return
            }
            SystemClock.sleep(50)
        }
        fail("Timed out waiting for JavaScript predicate `$predicate`; last result: $lastResult")
    }

    private fun evaluateJavaScript(webView: WebView, script: String): String {
        val completed = CountDownLatch(1)
        val result = AtomicReference<String>()
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            webView.evaluateJavascript(script) {
                result.set(it)
                completed.countDown()
            }
        }
        assertTrue(
            "JavaScript evaluation should complete",
            completed.await(10, TimeUnit.SECONDS),
        )
        return requireNotNull(result.get())
    }

    private fun readSmokeState(webView: WebView): JSONObject {
        val encoded = evaluateJavaScript(
            webView,
            "JSON.stringify(window.__capacitorSmoke)",
        )
        val json = JSONTokener(encoded).nextValue() as String
        return JSONObject(json)
    }

    private fun assertInactiveThenActive(appStates: JSONArray) {
        val values = (0 until appStates.length()).map(appStates::getBoolean)
        val inactiveIndex = values.indexOf(false)
        assertTrue("Capacitor App should report the background state", inactiveIndex >= 0)
        assertTrue(
            "Capacitor App should report active after the background state",
            values.drop(inactiveIndex + 1).contains(true),
        )
    }

    private companion object {
        /** Generated by `npx cap update`; the same asset Capacitor itself reads. */
        const val CAPACITOR_PLUGINS_ASSET = "capacitor.plugins.json"

        val TEST_PAGE = """
            <!doctype html>
            <html>
              <head><meta charset="utf-8"></head>
              <body>
                <script>
                  const smoke = window.__capacitorSmoke = {
                    ready: false,
                    platform: window.Capacitor?.getPlatform?.(),
                    hasAndroidBridge: typeof window.androidBridge !== 'undefined',
                    hasSupAndroid:
                      typeof window.SUPAndroid !== 'undefined' &&
                      typeof window.SUPAndroid.getVersion === 'function',
                    hasAppPlugin:
                      typeof window.Capacitor?.Plugins?.App?.addListener === 'function',
                    hasLocalNotificationsPlugin:
                      typeof window.Capacitor?.Plugins?.LocalNotifications?.checkPermissions ===
                      'function',
                    hasWebDavPlugin:
                      typeof window.Capacitor?.Plugins?.WebDavHttp?.request === 'function',
                    supPause: 0,
                    supResume: 0,
                    appStates: [],
                    putState: 'not-started',
                  };

                  window.SUPAndroid['onPause$'] = {
                    next: () => smoke.supPause++,
                  };
                  window.SUPAndroid['onResume$'] = {
                    next: () => smoke.supResume++,
                  };
                  window.Capacitor.Plugins.App.addListener(
                    'appStateChange',
                    ({ isActive }) => smoke.appStates.push(isActive),
                  );

                  window.startWebDavPut = (url) => {
                    smoke.putState = 'pending';
                    window.Capacitor.Plugins.WebDavHttp.request({
                      url,
                      method: 'PUT',
                      headers: {
                        Authorization: 'Basic native-smoke-token',
                        'Content-Type': 'text/plain; charset=utf-8',
                      },
                      data: 'lifecycle-body',
                    }).then((response) => {
                      smoke.putStatus = response.status;
                      smoke.putData = response.data;
                      smoke.putState = 'resolved';
                    }).catch((error) => {
                      smoke.putError = String(error?.message || error);
                      smoke.putState = 'rejected';
                    });
                  };

                  window.Capacitor.Plugins.App.getState()
                    .then(() => smoke.ready = true)
                    .catch((error) => {
                      // Still ready: a rejection has to reach the assertions as
                      // readyError, not as an opaque predicate timeout.
                      smoke.readyError = String(error?.message || error);
                      smoke.ready = true;
                    });
                </script>
              </body>
            </html>
        """.trimIndent()
    }
}
