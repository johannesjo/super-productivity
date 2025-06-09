package com.superproductivity.superproductivity.app

import android.content.ContentValues
import android.content.Context
import android.database.DatabaseUtils
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log
import com.superproductivity.superproductivity.App
import org.json.JSONArray

class KeyValStore(private val context: Context) :
    SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

//    private static final String CREATE_TABLE = "CREATE TABLE supKeyValStore(TEXT PRIMARY KEY,VALUE TEXT,KEY_CREATED_AT DATETIME)"

    override fun onCreate(db: SQLiteDatabase?) {
        Log.v(TAG, "onCreate")
        db?.execSQL(CREATE_TABLE)
    }

    override fun onUpgrade(db: SQLiteDatabase?, p1: Int, p2: Int) {
        Log.v(TAG, "onUpgrade")
        db?.execSQL("DROP TABLE IF EXISTS $DATABASE_TABLE")
        onCreate(db)
    }

    /**
     * Setter method. Sets a (key, value) pair in sqlite3 db.
     *
     * @param key     The URL or some other unique id for data can be used
     * @param value   String data to be saved
     * @return rowid of the insertion row
     */
    @Synchronized
    fun set(key: String, value: String?): Long {
        val newKey = DatabaseUtils.sqlEscapeString(key)
        Log.v(TAG, "setting db value: $newKey")
        val dbHelper = (context.applicationContext as App).keyValStore
        val db = dbHelper.writableDatabase
        var row = 0L
        if (db != null) {
            val values = ContentValues()
            values.put(KEY, newKey)
            values.put(VALUE, value)
            values.put(KEY_CREATED_AT, "time('now')")
            row = db.replace(DATABASE_TABLE, null, values)
            Log.v(TAG, "save db value size: " + value?.length)
            db.close()
        }
        return row
    }

    /**
     * @param key          The URL or some other unique id for data can be used
     * @param defaultValue value to be returned in case something goes wrong or no data is found
     * @return value stored in DB if present, defaultValue otherwise.
     */
    @Synchronized
    fun get(key: String, defaultValue: String): String {
        val newKey = DatabaseUtils.sqlEscapeString(key)
        Log.v(TAG, "getting db value: $newKey")
        val dbHelper = (context.applicationContext as App).keyValStore
        var value = defaultValue
        dbHelper.readableDatabase?.let { database ->
            database.query(
                DATABASE_TABLE, arrayOf(VALUE), "$KEY=?", arrayOf(newKey), null, null, null
            )?.let { cursor ->
                if (cursor.moveToNext()) {
                    value = cursor.getString(cursor.getColumnIndexOrThrow(VALUE))
                }
                Log.v(TAG, "get db value size:" + value.length)
                cursor.close()
            }
            database.close()
        }
        return value
    }

    fun clearAll(context: Context) {
        val dbHelper = (context.applicationContext as App).keyValStore
        val db = dbHelper.writableDatabase
        if (db != null) {
            db.delete(DATABASE_TABLE, null, null)
            Log.v(TAG, "cleared db ")
            db.close()
        }
    }

    fun getTodayTasks(): List<SpTask> {
        val taskList = mutableListOf<SpTask>()
        val stringValue = get("dailyTasks", "")
        Log.d("KeyValStore", "DailyTask JSON: $stringValue")

        if (stringValue.isNotEmpty()) {
            try {
                val tasksArray = JSONArray(stringValue)

                for (i in 0 until tasksArray.length()) {
                    val task = tasksArray.getJSONObject(i)

                    val id = task.optString("id", "")
                    val title = task.optString("title", "No Title")
                    val isDone = task.optBoolean("isDone", false)
                    val category = task.optString("projectId", "No Category")
                    val categoryHtml = ""

                    if (id.isNotBlank()) {
                        taskList.add(
                            SpTask(
                                id = id,
                                title = title,
                                category = category,
                                categoryHtml = categoryHtml,
                                isDone = isDone
                            )
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e("KeyValStore", "Error processing JSON: ${e.message}")
            }
        }

        Log.d("KeyValStore", "Found tasks: ${taskList.size}")
        Log.d("taskList", "Task List: $taskList")
        return taskList
    }


    companion object {
        private const val DATABASE_TABLE: String = "supKeyValStore"
        private const val DATABASE_VERSION: Int = 1
        private const val KEY: String = "KEY"
        private const val DATABASE_NAME: String = "SupKeyValStore"
        private const val VALUE: String = "VALUE"
        private const val KEY_CREATED_AT: String = "KEY_CREATED_AT"
        private const val TAG: String = "SupKeyValStore"
        private const val CREATE_TABLE =
            ("CREATE TABLE $DATABASE_TABLE($KEY TEXT PRIMARY KEY,$VALUE TEXT,$KEY_CREATED_AT DATETIME)")
    }
}
