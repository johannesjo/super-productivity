package com.superproductivity.superproductivity

import android.content.Intent
import android.util.Log
import android.widget.RemoteViewsService

class TaskListWidgetViewsService : RemoteViewsService() {

    override fun onGetViewFactory(intent: Intent?): RemoteViewsFactory {
        Log.v("TW", "onGetViewFactory")
        return TaskListWidgetViewsFactory(this)
    }
}