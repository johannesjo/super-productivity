package com.superproductivity.superproductivity

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews

/**
 * Implementation of App Widget functionality.
 */
class TaskListWidget : AppWidgetProvider() {
    private val tag = "TW"
    private val widgetWrapper = R.layout.task_list_widget
    private val widgetList = R.id.task_list
    private val widgetAddTaskButton = R.id.add_task_btn
    private val widgetEmptyView = R.id.empty_view

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        Log.v(tag, "onReceive")
        if (intent.action.equals(LIST_CHANGED)) {
            Log.v(tag, "onReceive: LIST_CHANGED triggered")
            // Trigger Standard Update
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisAppWidget = ComponentName(context.packageName, TaskListWidget::class.java.name)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget)
            onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }


    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        Log.v(tag, "updateAppWidget")
        // Construct the RemoteViews object
        val remoteViews = createAppWidgetRemoteViews(context, appWidgetId)

        // Click stuff, needs to be set here too /
        // tap on list & on empty view
        // -----------
        val clickIntent = Intent(context, FullscreenActivity::class.java)
        clickIntent.putExtra("action", "")
        val clickPI = PendingIntent.getActivity(
            context,
            0,
            clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        // NOTE we use setPendingIntentTemplate as preferred for list items
        remoteViews.setPendingIntentTemplate(widgetList, clickPI)
        // also attach same intent for empty view
        remoteViews.setOnClickPendingIntent(widgetEmptyView, clickPI)

        // tap button
        // ----------
        val addTaskIntent = Intent(context, FullscreenActivity::class.java)
        addTaskIntent.putExtra("action", KeepAliveNotificationService.EXTRA_ACTION_ADD_TASK)
        val addTaskPI = PendingIntent.getActivity(
            context,
            3,
            addTaskIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        remoteViews.setOnClickPendingIntent(widgetAddTaskButton, addTaskPI)
        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, remoteViews)
        // Both views need to be notified for whatever reason
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, widgetList)
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, widgetWrapper)
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, widgetAddTaskButton)
    }


    private fun createAppWidgetRemoteViews(context: Context, appWidgetId: Int): RemoteViews {
        val remoteViews = RemoteViews(context.packageName, widgetWrapper)

        // Specify the service to provide data for the collection widget.  Note that we need to
        // embed the appWidgetId via the data otherwise it will be ignored.
        val intent = Intent(context, TaskListWidget::class.java)
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        // Set the empty view to be displayed if the collection is empty.  It must be a sibling
        // view of the collection view.
        remoteViews.setEmptyView(widgetList, widgetEmptyView)
        Log.v(tag, "setRemoteAdapter")
        remoteViews.setRemoteAdapter(
            widgetList,
            Intent(context, TaskListWidgetViewsService::class.java)
        )
        return remoteViews
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.v(tag, "onUpdate " + appWidgetIds.size + appWidgetIds.toString())
        // There may be multiple widgets active, so update all of them
        appWidgetIds.forEach { appWidgetId ->
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        const val LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED"
    }
}

