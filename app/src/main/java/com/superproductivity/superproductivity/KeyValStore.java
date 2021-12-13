package com.superproductivity.superproductivity;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.DatabaseUtils;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

public class KeyValStore extends SQLiteOpenHelper {
    private static final String TAG = "SupKeyValStore";
    private static KeyValStore sInstance;
    private static final String DATABASE_NAME = "SupKeyValStore";
    private static final String DATABASE_TABLE = "supKeyValStore";
    private static final int DATABASE_VERSION = 1;
    private static final String KEY = "KEY";
    private static final String VALUE = "VALUE";
    private static final String KEY_CREATED_AT = "KEY_CREATED_AT";


    private static final String CREATE_TABLE = "CREATE TABLE "
            + DATABASE_TABLE + "(" + KEY + " TEXT PRIMARY KEY," + VALUE
            + " TEXT," + KEY_CREATED_AT
            + " DATETIME" + ")";


//    private static final String CREATE_TABLE = "CREATE TABLE supKeyValStore(TEXT PRIMARY KEY,VALUE TEXT,KEY_CREATED_AT DATETIME)";

    private static synchronized KeyValStore getInstance(Context context) {
        // Use the application context, which will ensure that you
        // don't accidentally leak an Activity's context.
        // See this article for more information: http://bit.ly/6LRzfx
        if (sInstance == null) {
            synchronized (KeyValStore.class) {
                if (sInstance == null)
                    sInstance = new KeyValStore(context.getApplicationContext());
            }
        }
        return sInstance;
    }

    /**
     * Constructor should be private to prevent direct instantiation.
     * make call to static method "getInstance()" instead.
     *
     * @param context Any context object.
     */
    protected KeyValStore(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        Log.v(TAG, "onCreate");
        db.execSQL(CREATE_TABLE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        Log.v(TAG, "onUpgrade");
        db.execSQL("DROP TABLE IF EXISTS " + DATABASE_TABLE);
        onCreate(db);
    }

    /**
     * Setter method. Sets a (key, value) pair in sqlite3 db.
     *
     * @param context Any context object.
     * @param key     The URL or some other unique id for data can be used
     * @param value   String data to be saved
     * @return rowid of the insertion row
     */
    public static synchronized long set(Context context, String key, String value) {
        key = DatabaseUtils.sqlEscapeString(key);
        Log.v(TAG, "setting db value: " + key);
        KeyValStore dbHelper = getInstance(context);
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        long row = 0;
        if (db != null) {
            ContentValues values = new ContentValues();
            values.put(KEY, key);
            values.put(VALUE, value);
            values.put(KEY_CREATED_AT, "time('now')");
            row = db.replace(DATABASE_TABLE, null, values);
            Log.v(TAG, "save db value size: " + String.valueOf(value.length()));
            db.close();
        }
        return row;
    }

    /**
     * @param context      Any context object.
     * @param key          The URL or some other unique id for data can be used
     * @param defaultValue value to be returned in case something goes wrong or no data is found
     * @return value stored in DB if present, defaultValue otherwise.
     */
    public static synchronized String get(Context context, String key, String defaultValue) {
        key = DatabaseUtils.sqlEscapeString(key);
        Log.v(TAG, "getting db value: " + key);
        KeyValStore dbHelper = getInstance(context);
        SQLiteDatabase db = dbHelper.getReadableDatabase();
        String value = defaultValue;
        if (db != null) {
            Cursor c = db.query(DATABASE_TABLE, new String[]{VALUE}, KEY + "=?", new String[]{key}, null, null, null);
            if (c != null) {
                if (c.moveToNext()) {
                    value = c.getString(c.getColumnIndex(VALUE));
                }
                Log.v(TAG, "get db value size:" + String.valueOf(value.length()));
                c.close();
            }
            db.close();
        }
        return value;
    }


    public static synchronized void clearAll(Context context) {
        KeyValStore dbHelper = getInstance(context);
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        if (db != null) {
            db.delete(DATABASE_TABLE, null, null);
            Log.v(TAG, "cleared db ");
            db.close();
        }
    }
}
