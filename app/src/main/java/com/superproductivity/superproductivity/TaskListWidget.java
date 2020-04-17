package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;

/**
 * Implementation of App Widget functionality.
 */
public class TaskListWidget extends AppWidgetProvider {
    public static final String LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED";
    String taskJsonStr;

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        // Log.v("TaskListWidget", intent.toString());
        if (intent.getAction().equals(LIST_CHANGED)) {
            taskJsonStr = intent.getStringExtra("taskJson");
            updateView(context);
        }
    }

    void updateView(Context context) {
        if (taskJsonStr != null) {
//            Log.v("TaskListWidget", taskJsonStr);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_list_widget);
            views.setTextViewText(R.id.test_text, taskJsonStr);
            AppWidgetManager.getInstance(context).updateAppWidget(new ComponentName(context, TaskListWidget.class), views);
        }
    }
}

