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
        Intent intent = new Intent(TaskListWidget.LIST_CHANGED);
//        intent.putExtra("taskJson", str);
        Log.v("jsInterface", str);
//        mContext.getApplicationContext().sendBroadcast(intent);
        updateWidgets(str);
    }


    private void updateWidgets(String s) {
        Intent intent = new Intent(mContext.getApplicationContext(), TaskListWidget.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        // Use an array and EXTRA_APPWIDGET_IDS instead of AppWidgetManager.EXTRA_APPWIDGET_ID,
        // since it seems the onUpdate() is only fired on that:
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(mContext);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(mContext, TaskListWidget.class));

//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB)
        widgetManager.notifyAppWidgetViewDataChanged(ids, android.R.id.list);

        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        intent.putExtra("taskJson", s);

        mContext.sendBroadcast(intent);
    }
}
