package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;


/**
 * Implementation of App Widget functionality.
 */
public class TaskListWidget extends AppWidgetProvider {
    public static final String LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED";
    public static String tag = "TW";
    public static int WIDGET_WRAPPER = R.layout.task_list_widget;
    public static int WIDGET_LIST = R.id.task_list;

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


    void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.v(tag, "updateAppWidget");

        // Construct the RemoteViews object
        RemoteViews rvs = createAppWidgetRemoteViews(context, appWidgetId);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, rvs);
        // Both views need to be notified for whatever reason
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, WIDGET_LIST);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, WIDGET_WRAPPER);
    }


    private RemoteViews createAppWidgetRemoteViews(Context context, int appWidgetId) {
        RemoteViews remoteViews = new RemoteViews(context.getPackageName(), WIDGET_WRAPPER);

        // Specify the service to provide data for the collection widget.  Note that we need to
        // embed the appWidgetId via the data otherwise it will be ignored.
        Intent intent = new Intent(context, TaskListWidget.class);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);

        // Set the empty view to be displayed if the collection is empty.  It must be a sibling
        // view of the collection view.
        remoteViews.setEmptyView(WIDGET_LIST, R.id.empty_view);

        Log.v(tag, "setRemoteAdapter");
        remoteViews.setRemoteAdapter(WIDGET_LIST, new Intent(context, TaskListWidgetViewsService.class));

        return remoteViews;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.v(tag, "onUpdate " + appWidgetIds.length + appWidgetIds.toString());
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}

