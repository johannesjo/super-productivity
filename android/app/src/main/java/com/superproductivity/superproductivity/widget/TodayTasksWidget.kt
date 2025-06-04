package com.superproductivity.superproductivity.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.superproductivity.superproductivity.CapacitorMainActivity
import com.superproductivity.superproductivity.R

class TodayTasksWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val intent = Intent(context, TaskWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }

            val views = RemoteViews(context.packageName, R.layout.today_tasks_widget_list)
            views.setRemoteAdapter(R.id.today_tasks_widget_list_view, intent)
            views.setEmptyView(R.id.today_tasks_widget_list_view, android.R.id.empty)

            val clickIntent = Intent(context, CapacitorMainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_layout_root, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onEnabled(context: Context) {
        // When first widget is created
    }

    override fun onDisabled(context: Context) {
        // When last widget is removed
    }

    companion object {
        fun update(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetComponent = ComponentName(context, TodayTasksWidget::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent)
            TodayTasksWidget().onUpdate(context, appWidgetManager, appWidgetIds)
        }
    }
}

