package com.superproductivity.superproductivity.webview

import android.Manifest
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import com.anggrayudi.storage.SimpleStorageHelper
import com.anggrayudi.storage.file.*
import com.superproductivity.superproductivity.App
import com.superproductivity.superproductivity.BuildConfig
import com.superproductivity.superproductivity.app.AppLifecycleObserver
import com.superproductivity.superproductivity.FullscreenActivity
import com.superproductivity.superproductivity.FullscreenActivity.Companion.WINDOW_INTERFACE_PROPERTY
import com.superproductivity.superproductivity.R
import com.superproductivity.superproductivity.app.LaunchDecider
import org.json.JSONException
import org.json.JSONObject
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileReader
import java.io.IOException
import java.io.InputStream
import java.io.Writer
import java.net.HttpURLConnection
import java.net.MalformedURLException
import java.net.URL
import java.nio.charset.StandardCharsets
import java.security.cert.CertPathValidatorException
import java.util.Locale
import javax.net.ssl.SSLHandshakeException

class JavaScriptInterface(
    private val activity: Activity,
    private val webView: WebView,
    private val storageHelper: SimpleStorageHelper
) {

    /**
     * Instantiate the interface and set the context
     */
    open fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent) {
        // Additional callback for scoped storage permission management on Android 10+
        // Mandatory for Activity, but not for Fragment & ComponentActivity
        Log.d("SuperProductivity", "onActivityResult")

        if (resultCode == -1 && requestCode == -1) {
            val takeFlags: Int = (Intent.FLAG_GRANT_READ_URI_PERMISSION
                or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            data.data?.let { uri ->
                activity.contentResolver.takePersistableUriPermission(uri, takeFlags)
            }
        }

        storageHelper.storage.onActivityResult(requestCode, resultCode, data)
    }

    @Suppress("unused")
    @JavascriptInterface
    fun getVersion(): String {
        val versionName = BuildConfig.VERSION_NAME
        val launchDecider = LaunchDecider(activity)
        val launchMode = launchDecider.getLaunchMode()
        return "${versionName}_L$launchMode"
    }

    @Suppress("unused")
    @JavascriptInterface
    fun showToast(toast: String) {
        Toast.makeText(activity, toast, Toast.LENGTH_SHORT).show()
    }

    @Suppress("unused")
    @JavascriptInterface
    fun updateTaskData(str: String) {
        Log.w("TW", "JavascriptInterface: updateTaskData")
//        val intent = Intent(activity.applicationContext, TaskListWidget::class.java)
//        intent.action = TaskListWidget.LIST_CHANGED
//        intent.putExtra("taskJson", str)
//        (activity.application as App).dataHolder.data = str
//        activity.sendBroadcast(intent)
    }

    // TODO remove for good after a while
    @Suppress("unused")
    @JavascriptInterface
    fun updatePermanentNotification(title: String, message: String, progress: Int) {
        Log.w("TW", "JavascriptInterface: REMOVED updateNotificationWidget")
    }

    @Suppress("unused")
    @JavascriptInterface
    open fun triggerGetGoogleToken() {
        // NOTE: empty here, and only filled for google build flavor
    }

    @Suppress("unused")
    @JavascriptInterface
    // LEGACY
    fun saveToDbNew(requestId: String, key: String, value: String) {
        (activity.application as App).keyValStore.set(key, value)
        callJavaScriptFunction(FN_PREFIX + "saveToDbCallback('" + requestId + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    // LEGACY
    fun loadFromDbNew(requestId: String, key: String) {
        val r = (activity.application as App).keyValStore.get(key, "")
        // NOTE: ' are important as otherwise the json messes up
        callJavaScriptFunction(FN_PREFIX + "loadFromDbCallback('" + requestId + "', '" + key + "', '" + r + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun removeFromDb(requestId: String, key: String) {
        (activity.application as App).keyValStore.set(key, null)
        callJavaScriptFunction(FN_PREFIX + "removeFromDbCallback('" + requestId + "')")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun clearDb(requestId: String) {
        (activity.application as App).keyValStore.clearAll(activity)
        callJavaScriptFunction(FN_PREFIX + "clearDbCallback('" + requestId + "')")
    }


    // TODO: legacy remove in future version, but no the next release
    @Suppress("unused")
    @JavascriptInterface
    fun saveToDb(key: String, value: String) {
        (activity.application as App).keyValStore.set(key, value)
        callJavaScriptFunction("window.saveToDbCallback()")
    }

    // TODO: legacy remove in future version, but no the next release
    @Suppress("unused")
    @JavascriptInterface
    fun loadFromDb(key: String) {
        val r = (activity.application as App).keyValStore.get(key, "")
        // NOTE: ' are important as otherwise the json messes up
        callJavaScriptFunction("window.loadFromDbCallback('$key', '$r')")
    }


    @Suppress("unused")
    @JavascriptInterface
    fun showNotificationIfAppIsNotOpen(title: String, body: String) {
        if (!AppLifecycleObserver.getInstance().isInForeground) {
            showNotification(title, body)
        }
    }

    @Suppress("unused")
    @JavascriptInterface
    fun showNotification(title: String, body: String) {
        Log.d("TW", "title $title")
        Log.d("TW", "body $body")

        val mBuilder: NotificationCompat.Builder = NotificationCompat.Builder(
            activity.applicationContext, "SUP_CHANNEL_ID"
        )
        mBuilder.build().flags = mBuilder.build().flags or Notification.FLAG_AUTO_CANCEL

        val ii = Intent(activity.applicationContext, FullscreenActivity::class.java)
        val pendingIntentFlags: Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }
        val pendingIntent = PendingIntent.getActivity(activity, 0, ii, pendingIntentFlags)

        // Title
        mBuilder.setContentTitle(title)
        val bigText: NotificationCompat.BigTextStyle = NotificationCompat.BigTextStyle()
        bigText.setBigContentTitle(title)

        // Body
        if (body.isNotEmpty() && body.trim() != "undefined") {
            mBuilder.setContentText(body)
            bigText.bigText(body)
        }

        mBuilder.setStyle(bigText)
        mBuilder.setContentIntent(pendingIntent)
        mBuilder.setSmallIcon(R.mipmap.ic_launcher)
        mBuilder.setLargeIcon(
            BitmapFactory.decodeResource(
                activity.resources, R.mipmap.ic_launcher
            )
        )
        mBuilder.setSmallIcon(R.drawable.ic_stat_sp)
        mBuilder.priority = Notification.PRIORITY_MAX
        mBuilder.setAutoCancel(true)

        val mNotificationManager =
            activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "SUP_CHANNEL_ID"
            val channel = NotificationChannel(
                channelId, "Super Productivity", NotificationManager.IMPORTANCE_HIGH
            )
            mNotificationManager.createNotificationChannel(channel)
            mBuilder.setChannelId(channelId)
        }
        mNotificationManager.notify(0, mBuilder.build())
    }

    private fun readFully(inputStream: InputStream): ByteArray {
        val buffer = ByteArrayOutputStream()
        var nRead: Int
        val data = ByteArray(16384)
        nRead = inputStream.read(data, 0, data.size)
        while (nRead != -1) {
            buffer.write(data, 0, nRead)
            nRead = inputStream.read(data, 0, data.size)
        }
        return buffer.toByteArray()
    }

    @Suppress("unused")
    @JavascriptInterface
    fun makeHttpRequest(
        requestId: String,
        urlString: String,
        method: String,
        data: String,
        username: String,
        password: String,
        readResponse: String
    ) {
        Log.d("TW", "$requestId $urlString $method $data $username $readResponse")
        var status: Int
        var statusText: String
        var resultData = ""
        val headers = JSONObject()
        val doInput = readResponse.toBoolean()
        try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            if (username.isNotEmpty() && password.isNotEmpty()) {
                val auth = "$username:$password"
                val encodedAuth = Base64.encodeToString(auth.toByteArray(), Base64.NO_WRAP)
                connection.setRequestProperty(/* key = */ "Authorization", /* value = */
                    "Basic $encodedAuth"
                )
            }
            connection.requestMethod = method
            connection.setRequestProperty("Content-Type", "application/octet-stream")
            connection.doInput = doInput
            if (data.isNotEmpty()) {
                connection.doOutput = true
                val bytes = data.toByteArray()
                connection.setFixedLengthStreamingMode(bytes.size)
                val out = BufferedOutputStream(connection.outputStream)
                out.write(bytes)
                out.flush()
                out.close()
            }
            connection.headerFields.entries.forEach { entry ->
                val output = entry.value.joinToString(separator = ", ")

                // https://datatracker.ietf.org/doc/html/rfc7230#section-3.2.2
                try {
                    if (entry.key != null)
                        headers.put(entry.key.lowercase(Locale.ROOT), output)
                } catch (e: JSONException) {
                    e.printStackTrace()
                }
            }
            status = connection.responseCode
            statusText = connection.responseMessage
            val out: ByteArray
            if (status in 200..299 && doInput) {
                val inputStream = connection.inputStream
                out = readFully(inputStream)
                inputStream.close()
            } else {
                out = ByteArray(0)
            }
            connection.disconnect()
            resultData = String(out, StandardCharsets.UTF_8)
        } catch (e: MalformedURLException) {
            e.printStackTrace()
            status = -1
            statusText = "Malformed URL"
        } catch (e: SSLHandshakeException) {
            e.printStackTrace()
            var cause = e.cause
            while (cause != null && cause !is CertPathValidatorException) {
                cause = cause.cause
            }
            if (cause != null) {
                val validationException = cause as CertPathValidatorException
                val message = StringBuilder("Failed trust path:")
                validationException.certPath.certificates.forEach { certificate ->
                    message.append("\n")
                    message.append(certificate.toString())
                }
                Log.e("TW", message.toString())
            }
            status = -2
            statusText = "SSL Handshake Error"
        } catch (e: IOException) {
            e.printStackTrace()
            status = -3
            statusText = "Network Error"
        } catch (e: ClassCastException) {
            e.printStackTrace()
            status = -4
            statusText = "Unsupported Protocol"
        }
        val result = JSONObject()
        try {
            result.put("data", resultData)
            result.put("status", status)
            result.put("headers", headers)
            result.put("statusText", statusText)
        } catch (e: JSONException) {
            e.printStackTrace()
        }
        Log.d("TW", "$requestId: $result")
        callJavaScriptFunction(FN_PREFIX + "makeHttpRequestCallback('" + requestId + "', " + result + ")")
    }

    @Suppress("unused")
    @JavascriptInterface
    fun getFileRev(filePath: String): String {
        Log.d("SuperProductivity", "getFileRev")
        // Get folder path
        val sp = activity.getPreferences(Context.MODE_PRIVATE)
        val folderPath = sp.getString("filesyncFolder", "") ?: ""
        // Build fullFilePath from folder path and filepath
        val fullFilePath = "$folderPath/$filePath"
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Scoped storage permission management for Android 10+
            // Load file
            val file = DocumentFile.fromSingleUri(activity, Uri.parse(fullFilePath))
            // Get last modified date
            val lastModif = file?.lastModified().toString()
            Log.d("SuperProductivity", "getFileRev lastModified: $lastModif")
            lastModif
        } else {
            val file = File(fullFilePath)
            // Get last modified date
            val lastModif = file.lastModified().toString()
            Log.d("SuperProductivity", "getFileRev lastModified: $lastModif")
            lastModif
        }
    }

    @Suppress("unused")
    @JavascriptInterface
    fun readFile(filePath: String): String {
        // Read a file, most likely the filesync database
        Log.d("SuperProductivity", "readFile")

        // Get folder path
        val sp = activity.getPreferences(Context.MODE_PRIVATE)
        val folderPath = sp.getString("filesyncFolder", "") ?: ""
        // Build fullFilePath from folder path and filepath
        val fullFilePath = "$folderPath/$filePath"
        Log.d(
            "SuperProductivity",
            "readFile: trying to read from fullFilePath: " + fullFilePath
        )
        // Open file in read only mode and an InputStream
        // Make a reader pointing to the input file
        val reader =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Scoped storage permission management for Android 10+
                val folder = DocumentFile.fromTreeUri(
                    activity,
                    Uri.parse(fullFilePath),
                )
                val file: DocumentFile? = folder?.findFile(filePath)
                if (file != null) {
                    activity.contentResolver.openInputStream(file.uri)?.reader()
                } else {
                    null
                }
            } else {
                // Older versions of Android <= 9 don't need scoped storage management
                try {
                    BufferedReader(FileReader(fullFilePath))
                } catch (e: Exception) {
                    // File does not exist, that's normal if it's the first time, we simply return null
                    null
                }
            }

        // Use a StringBuilder to rebuild the input file's content but replace the line returns with current OS's line returns
        val sb: String =
            if (reader == null) {
                Log.d(
                    "SuperProductivity",
                    "readFile warning: tried to open file, but file does not exist or we do not have permission! This may be normal if file does not exist yet, it will be created when some tasks will be added."
                )
                ""
            } else {
                // Read input file
                try {
                    reader.readText()
                } catch (e: Exception) {
                    Log.d("SuperProductivity", "readFile error: " + e.stackTraceToString())
                    // Return an empty string if there is an error (maybe file does not exist yet)
                    ""
                } finally {
                    reader.close()
                }
            }
        // Return file's content
        return sb
    }

    @Suppress("unused")
    @JavascriptInterface
    fun writeFile(filePath: String, data: String) {
        Log.d("SuperProductivity", "writeFile: trying to save to filePath: $filePath")
        // Get folder path
        val sp = activity.getPreferences(Context.MODE_PRIVATE)
        val folderPath = sp.getString("filesyncFolder", "") ?: ""

        // Scoped storage permission management for Android 10+, but also works for Android < 10
        // Open file with write access, using DocumentFile URI
        val folder = DocumentFile.fromTreeUri(activity, Uri.parse(folderPath))
        var file = folder?.findFile(filePath)
        Log.d("SuperProductivity", "writeFile: trying to save to: $file")

        if (file != null && file.exists()) {
            // File exists, attempt to delete it
            val deleted = file.delete()

            if (!deleted) {
                Log.e("SuperProductivity", "Failed to delete the existing file: $filePath")
                return
            } else {
                Log.d("SuperProductivity", "File deleted: $filePath")
            }
        }

        // File doesn't exist or was deleted successfully, so create it
        file = folder?.createFile("application/json", filePath)

        if (file != null) {
            Log.d("SuperProductivity", "File created successfully: ${file.uri}")
        } else {
            Log.e("SuperProductivity", "Failed to create the file: $filePath")
        }
        // file = file?.recreateFile(activity)  // erase content first by recreating file. For some reason, DocumentFileCompat.fromFullPath(requiresWriteAccess=true) and openOutputStream(append=false) only open the file in append mode, so we need to recreate the file to truncate its content first
        // Open a writer to an OutputStream to the file without append mode (so we write from the start of the file)
        Log.d("SuperProductivity", "writeFile: try to openOutputStream")
        val writer: Writer = file?.openOutputStream(activity, append = false)!!.writer()
        try {
            Log.d("SuperProductivity", "writeFile: try to write data into file: $data")
            writer.write(data)
            Log.d("SuperProductivity", "writeFile: write apparently successful!")
        } catch (e: Exception) {
            Log.d("SuperProductivity", "writeFile error: " + e.stackTraceToString())
        } finally {
            writer.close()
        }
    }

    @Suppress("unused")
    @JavascriptInterface
    fun allowedFolderPath(): String {
        val grantedUris = activity.contentResolver.persistedUriPermissions.map { it.uri }
        Log.d("SuperProductivity", "allowedFolderPath grantedUris: " + grantedUris.toString())
        val sp = activity.getPreferences(Context.MODE_PRIVATE)
        val folderPath = sp.getString("filesyncFolder", "") ?: ""
        Log.d("SuperProductivity", "allowedFolderPath filesyncFolder: $folderPath")

        val pathGranted: Boolean =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // If scoped storage, check if stored path is in the list of granted path, if true, then return it, else return an empty string
                if (grantedUris.isEmpty() or folderPath.isEmpty()) {
                    // list of granted paths is empty, then we have no permission
                    false
                } else {
                    // otherwise we loop through each path in the granted paths list, and check if the currently selected folderPath is a subfolder of a granted path
                    val vpaths: List<String> = grantedUris.map { it.toString() }
                    Log.d("SuperProductivity", "allowedFolderPath flattened values: $vpaths")
                    var innerCond: Boolean = false
                    for (p in vpaths) {
                        if (folderPath.contains(p)) { // granted path is always a root path and hence a parent path to a user selected folderPath
                            innerCond = true
                            break
                        }
                    }
                    innerCond
                }
            } else {
                // For older versions of Android, check if we have access to any folder
                val permissionRead = ContextCompat.checkSelfPermission(
                    activity,
                    Manifest.permission.READ_EXTERNAL_STORAGE
                )
                val permissionWrite = ContextCompat.checkSelfPermission(
                    activity,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                )

                (permissionRead == PackageManager.PERMISSION_GRANTED) && (permissionWrite == PackageManager.PERMISSION_GRANTED)
            }
        Log.d(
            "SuperProductivity",
            "allowedFolderPath folderPath.isNotEmpty(): ${folderPath.isNotEmpty()} pathGranted: ${pathGranted.toString()}"
        )
        return if (folderPath.isNotEmpty() && pathGranted) {
            folderPath
        } else {
            ""
        }
    }

    @Suppress("unused")
    @JavascriptInterface
    fun isGrantedFilePermission(): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        val grantedPaths = activity.contentResolver.persistedUriPermissions.map { it.uri }
        Log.d(
            "SuperProductivity",
            "isGrantedFilePermission grantedPaths: " + grantedPaths.toString()
        )
        /*
        val sp = activity.getPreferences(Context.MODE_PRIVATE)
        val folderPath = sp.getString("filesyncFolder", "") ?: ""
        Log.d("SuperProductivity", "isGrantedFilePermission filesyncFolder: $folderPath")
        */
        grantedPaths.isNotEmpty()
    } else {
        val result = ContextCompat.checkSelfPermission(
            activity, Manifest.permission.READ_EXTERNAL_STORAGE
        )
        val result1 = ContextCompat.checkSelfPermission(
            activity, Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
        result == PackageManager.PERMISSION_GRANTED && result1 == PackageManager.PERMISSION_GRANTED
    }

    @Suppress("unused")
    @JavascriptInterface
    fun grantFilePermission(requestId: String) {
        // For Android < 10, ask for permission to access the whole storage
        /* DEPRECATED: if we use this to get the permissions, then we need to use another folder picker than SimpleStorage, because otherwise SimpleStorage also asks for permissions, but Android does not accept asking for two different set of permissions in a single call: "Can reqeust only one set of permissions at a time"
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            ActivityCompat.requestPermissions(
                activity, arrayOf(
                    Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_EXTERNAL_STORAGE
                ), 1
            )
        }
        */
        // For Android >= 10, use scoped storage via SimpleStorage library to get the permission to write files in a folder
        // For Android < 10, SimpleStorage serves as a simple folder path picker, so that we still save where the user want look for a database file
        // Note that SimpleStorage takes care of all the gritty technical details, including whether the user must pick a root path BEFORE selecting the folder they want to store in, everything is explained to the user
        Log.d("SuperProductivity", "Before SimpleStorageHelper callback func def")
        // Register a callback with SimpleStorage when a folder is picked
        storageHelper.onFolderSelected =
            { requestCode, root -> // could also use simpleStorageHelper.onStorageAccessGranted()
                Log.d("SuperProductivity", "Success Folder Pick! Now saving...")
                // Get absolute path to folder
                val fpath = root.uri.toString()

                // Open preferences to save folder to path
                val sp = activity.getPreferences(Context.MODE_PRIVATE)
                sp.edit().putString("filesyncFolder", fpath).apply()
                // Once permissions are granted, callback web application to continue execution
                callJavaScriptFunction(
                    FN_PREFIX + "grantFilePermissionCallBack('" + requestId + "')"
                )
            }
        // Open folder picker via SimpleStorage, this will request the necessary scoped storage permission
        // Note that even though we get permissions, we need to only write DocumentFile files, not MediaStore files, because the latter are not meant to be reopened in the future so we can lose permission at anytime once they are written once, see: https://github.com/anggrayudi/SimpleStorage/issues/103
        Log.d("SuperProductivity", "Get Storage Access permission")
        storageHelper.openFolderPicker(
            // We could also use simpleStorageHelper.requestStorageAccess()
            initialPath = FileFullPath(
                activity,
                StorageId.PRIMARY,
                "SupProd"
            ), // SimpleStorage.externalStoragePath if we want to default to sdcard
            // to force pick a specific folder and none others, use these arguments for simpleStorageHelper.requestStorageAccess():
            //expectedStorageType = StorageType.EXTERNAL,
            //expectedBasePath = "SupProd"
        )
    }

    fun callJavaScriptFunction(script: String) {
        webView.post { webView.evaluateJavascript(script) { } }
    }

    companion object {
        // TODO rename to WINDOW_PROPERTY
        const val FN_PREFIX: String = "window.$WINDOW_INTERFACE_PROPERTY."
    }
}
