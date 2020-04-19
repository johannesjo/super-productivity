package com.superproductivity.superproductivity;

import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViewsService;

public class TaskListWidgetViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        Log.v("TW", "onGetViewFactory");
        return new TaskListWidgetViewsFactory(this, intent);
    }
}
