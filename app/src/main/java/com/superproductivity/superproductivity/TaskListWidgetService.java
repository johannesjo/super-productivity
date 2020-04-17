package com.superproductivity.superproductivity;

import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViewsService;

public class TaskListWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        Log.v("TaskListWidget", "onGetViewFactory");
        return new TaskListWidgetDataProvider(this, intent);
    }
}
