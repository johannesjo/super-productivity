package com.superproductivity.superproductivity;

import android.content.Intent;
import android.widget.RemoteViewsService;

public class TaskListWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new ListDataProvider(this, intent);
    }
}
