package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;


/**
 * Implementation of App Widget functionality.
 */
public class TaskListWidget extends AppWidgetProvider {
    public static final String LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED";
    public static String tag = "TaskListWidget";

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        Log.v(tag, "onReceive");

        // Log.v(tag, intent.toString());
        if (intent.getAction().equals(LIST_CHANGED)) {
            Log.v(tag, "onReceive: LIST_CHANGED triggered");

            // Trigger Standard Update
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisAppWidget = new ComponentName(context.getPackageName(), TaskListWidget.class.getName());
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget);
            //            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, AgendaWidgetProvider.class));
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }


    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.v(tag, "updateAppWidget");

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_list_widget);
        setRemoteAdapter(context, views);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);

        // The list needs also to be notified for whatever reason
//        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.task_list);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.layout.task_list_widget);
    }

    private static void setRemoteAdapter(Context context, @NonNull final RemoteViews views) {
        Log.v(tag, "setRemoteAdapter");
        views.setRemoteAdapter(R.id.task_list, new Intent(context, TaskListWidgetViewsService.class));
    }


    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.v(tag, "onUpdate");
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}

