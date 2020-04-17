package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class JavaScriptInterface {
    Context mContext;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(Context c) {
        mContext = c;
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void updateTaskData(String str) {
        Intent intent = new Intent(mContext.getApplicationContext(), TaskListWidget.class);
        intent.setAction(TaskListWidget.LIST_CHANGED);
        intent.putExtra("taskJson", str);
        mContext.sendBroadcast(intent);
    }
}
