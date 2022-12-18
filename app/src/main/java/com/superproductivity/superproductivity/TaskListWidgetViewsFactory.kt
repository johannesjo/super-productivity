package com.superproductivity.superproductivity

import android.content.Context
import android.content.Intent
import android.graphics.Paint
import android.text.Html
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.google.gson.Gson

class TaskListWidgetViewsFactory(private val context: Context) :
    RemoteViewsService.RemoteViewsFactory {

    private lateinit var tasks: Array<SpTask>
    private val gson = Gson()
    private var lastJsonStr = "NOTHING"

    override fun onCreate() {
        Log.v("TW", "TaskListWidgetViewsFactory: onCreate")
        loadListData()
    }

    override fun onDataSetChanged() {
        Log.v("TW", "TaskListWidgetViewsFactory: onDataSetChanged")
        loadListData()
    }

    override fun onDestroy() {}

    override fun getCount(): Int = tasks.size


    override fun getViewAt(position: Int): RemoteViews {
        val view = RemoteViews(context.packageName, R.layout.row_layout)
        val task = tasks[position]
        view.setTextViewText(R.id.firstLine, task.title)
        if (task.isDone) {
            view.setInt(
                R.id.firstLine,
                "setPaintFlags",
                Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG
            )
            view.setTextColor(R.id.firstLine, context.resources.getColor(R.color.mutedText))
            view.setTextViewText(R.id.button, "✓")
        } else {
            view.setInt(R.id.firstLine, "setPaintFlags", Paint.ANTI_ALIAS_FLAG)
            view.setTextColor(
                R.id.firstLine,
                context.resources.getColor(R.color.emphasizedText)
            )
            view.setTextViewText(R.id.button, "")
        }

        if (task.category.isNotEmpty()) {
            view.setViewVisibility(R.id.secondLine, View.VISIBLE)
            if (task.categoryHtml.isNotEmpty()) {
                view.setTextViewText(R.id.secondLine, Html.fromHtml(task.categoryHtml))
            } else {
                view.setTextViewText(R.id.secondLine, task.category)
            }
        } else {
            view.setViewVisibility(R.id.secondLine, View.GONE)
            view.setTextViewText(R.id.secondLine, "")
        }


        view.setOnClickFillInIntent(R.id.firstLine, this.getPendingSelfIntent())
        view.setOnClickFillInIntent(R.id.button, this.getPendingSelfIntent())

        return view
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()


    override fun hasStableIds(): Boolean = false

    private fun loadListData() {
        Log.v("TW", "TaskListWidgetViewsFactory: loadListData")
        var jsonStr = ""
        try {
            jsonStr = (context.applicationContext as App).dataHolder.data
        } catch (e: Exception) {
            Log.e("TW", "TaskListWidgetViewsFactory:$e")
        }
        Log.v("TW", "TaskListWidgetViewsFactory: jsonStr...")

        if (jsonStr.isNotEmpty()) {
            Log.v("TW", "TaskListWidgetViewsFactory:" + jsonStr.length + "")
            Log.v("TW", "TaskListWidgetViewsFactory: $jsonStr")

            if (jsonStr != lastJsonStr) {
                val newTasks = gson.fromJson(jsonStr, tasks::class.java)
                Log.v("TW", "TaskListWidgetViewsFactory: $newTasks")
                tasks = newTasks
                Log.v("TW", "TaskListWidgetViewsFactory: update tasks")
                lastJsonStr = jsonStr
            }

        } else {
            Log.d("TW", "TaskListWidgetViewsFactory: No jsonStr data (yet)")
        }
    }

    private fun getPendingSelfIntent(): Intent {
        return Intent(context, FullscreenActivity::class.java)
    }
}