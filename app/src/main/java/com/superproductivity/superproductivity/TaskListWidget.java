package com.superproductivity.superproductivity;

import android.app.PendingIntent;
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
    public static String tag = "TW";
    public static int WIDGET_WRAPPER = R.layout.task_list_widget;
    public static int WIDGET_LIST = R.id.task_list;
    public static int WIDGET_ADD_TASK_BUTTON = R.id.add_task_btn;
    public static int WIDGET_EMPTY_VIEW = R.id.empty_view;

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        Log.v(tag, "onReceive");

        if (intent.getAction().equals(LIST_CHANGED)) {
            Log.v(tag, "onReceive: LIST_CHANGED triggered");

            // Trigger Standard Update
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisAppWidget = new ComponentName(context.getPackageName(), TaskListWidget.class.getName());
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget);

            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }


    void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.v(tag, "updateAppWidget");

        // Construct the RemoteViews object
        RemoteViews remoteViews = createAppWidgetRemoteViews(context, appWidgetId);

        // Click stuff, needs to be set here too ;/
        // tap on list & on empty view
        // -----------
        Intent clickIntent = new Intent(context, FullscreenActivity.class);
        clickIntent.putExtra("action", "");
        PendingIntent clickPI = PendingIntent.getActivity(context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        // NOTE we use setPendingIntentTemplate as preferred for list items
        remoteViews.setPendingIntentTemplate(WIDGET_LIST, clickPI);
        // also attach same intent for empty view
        remoteViews.setOnClickPendingIntent(WIDGET_EMPTY_VIEW, clickPI);

        // tap button
        // ----------
        Intent addTaskIntent = new Intent(context, FullscreenActivity.class);
        addTaskIntent.putExtra("action", KeepAliveNotificationService.EXTRA_ACTION_ADD_TASK);
        PendingIntent addTaskPI = PendingIntent.getActivity(context, 3, addTaskIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        remoteViews.setOnClickPendingIntent(WIDGET_ADD_TASK_BUTTON, addTaskPI);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, remoteViews);
        // Both views need to be notified for whatever reason
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, WIDGET_LIST);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, WIDGET_WRAPPER);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, WIDGET_ADD_TASK_BUTTON);
    }


    private RemoteViews createAppWidgetRemoteViews(Context context, int appWidgetId) {
        RemoteViews remoteViews = new RemoteViews(context.getPackageName(), WIDGET_WRAPPER);

        // Specify the service to provide data for the collection widget.  Note that we need to
        // embed the appWidgetId via the data otherwise it will be ignored.
        Intent intent = new Intent(context, TaskListWidget.class);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);

        // Set the empty view to be displayed if the collection is empty.  It must be a sibling
        // view of the collection view.
        remoteViews.setEmptyView(WIDGET_LIST, WIDGET_EMPTY_VIEW);

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

