package com.superproductivity.superproductivity.widget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.superproductivity.superproductivity.R
import com.superproductivity.superproductivity.app.KeyValStore
import com.superproductivity.superproductivity.app.SpTask

class TaskRemoteViewsFactory(
    private val context: Context,
    intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private var tasks: List<SpTask> = emptyList()
    private val keyValStore: KeyValStore = KeyValStore(context)

    override fun onCreate() {

        tasks = keyValStore.getTodayTasks()
    }

    override fun onDataSetChanged() {
        tasks = keyValStore.getTodayTasks()
    }

    override fun onDestroy() {
        tasks = emptyList()
    }

    override fun getCount(): Int = tasks.size

    override fun getViewAt(position: Int): RemoteViews {
        val task = tasks[position]
        val views = RemoteViews(context.packageName, R.layout.widget_task_item)
        views.setTextViewText(R.id.widget_item_title, task.title)
        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = true
}
