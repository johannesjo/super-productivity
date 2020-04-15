package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.Toast;

import androidx.annotation.NonNull;

/**
 * Implementation of App Widget functionality.
 * App Widget Configuration implemented in {@link TaskListWidgetConfigureActivity TaskListWidgetConfigureActivity}
 */
public class TaskListWidget extends AppWidgetProvider {
    public static final String LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED";

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_list_widget);
        setRemoteAdapter(context, views);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void setRemoteAdapter(Context context, @NonNull final RemoteViews views) {
        views.setRemoteAdapter(R.id.widget_list, new Intent(context, TaskListWidgetService.class));
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        Log.v("XXXXXXXXXXXXXXXXXX", "yeeees");
        Log.v("XXXXXXXXXXXXXXXXXX", intent.getAction());
        if (intent.getAction().equals(LIST_CHANGED)) {
            // handle intent here
            String s = intent.getStringExtra("NewString");
            Log.v("XXXXXXXYY", s);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        // When the user deletes the widget, delete the preference associated with it.
        for (int appWidgetId : appWidgetIds) {
            TaskListWidgetConfigureActivity.deleteTitlePref(context, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        Toast.makeText(context, "onEnabled called", Toast.LENGTH_LONG).show();
        // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
        Toast.makeText(context, "onDisabled called", Toast.LENGTH_LONG).show();
        // Enter relevant functionality for when the last widget is disabled
    }
}

