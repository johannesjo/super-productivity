package com.superproductivity.superproductivity;

import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViewsService;

public class TaskListWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TaskListWidgetDataProvider(this, intent);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.v("AAA", "AAAAAAAAAAAAA");
        return START_STICKY;
    }
}
