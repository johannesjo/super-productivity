package com.superproductivity.superproductivity;

import android.content.Context;
import android.content.Intent;
import android.graphics.Paint;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import androidx.annotation.Nullable;

import com.google.gson.Gson;

public class TaskListWidgetViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    private SpTask[] tasks;
    private Context mContext = null;
    private Gson gson = new Gson();

    TaskListWidgetViewsFactory(Context context, Intent intent) {
        mContext = context;
    }

    @Override
    public void onCreate() {
        Log.v("TW", "onCreate");
        loadListData();
    }

    @Override
    public void onDataSetChanged() {
        Log.v("TW", "onDataSetChanged");
        loadListData();
    }


    @Override
    public void onDestroy() {
    }

    @Override
    public int getCount() {
        if (tasks != null) {
            return tasks.length;
        } else {
            return 0;
        }
    }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews view = new RemoteViews(mContext.getPackageName(), R.layout.row_layout);
        SpTask task = tasks[position];
        view.setTextViewText(R.id.firstLine, task.title);
        if (task.isDone) {
            view.setInt(R.id.firstLine, "setPaintFlags", Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG);
            view.setTextColor(R.id.firstLine, mContext.getResources().getColor(R.color.mutedText));
            view.setTextViewText(R.id.button, "✓");
        } else {
            view.setInt(R.id.firstLine, "setPaintFlags", Paint.ANTI_ALIAS_FLAG);
            view.setTextColor(R.id.firstLine, mContext.getResources().getColor(R.color.emphasizedText));
            view.setTextViewText(R.id.button, "");
        }


        view.setOnClickFillInIntent(R.id.firstLine, this.getPendingSelfIntent(null));
        view.setOnClickFillInIntent(R.id.button, this.getPendingSelfIntent(null));

        return view;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
//        return true;
        return false;
    }

    private void loadListData() {
        Log.v("TW", "loadListData");
        String jsonStr = null;

        try {
            jsonStr = TaskListDataService.getInstance().getData();
        } catch (Exception e) {
            Log.e("TW", e.toString());
        }

        Log.v("TW", "jsonStr...");

        if (jsonStr != null && !jsonStr.isEmpty()) {
            Log.v("TW", jsonStr.length() + "");
            tasks = gson.fromJson(jsonStr, SpTask[].class);
//            Log.v("TW", jsonStr);
            Log.v("TW", "______________________");
            Log.v("TW", gson.toJson(tasks));

        } else {
            Log.d("TW", "No jsonStr data (yet)");
        }
    }


    private Intent getPendingSelfIntent(@Nullable String action) {
        Intent intent = new Intent(mContext, FullscreenActivity.class);
//        intent.setAction(action);
//        Bundle extras = new Bundle();
//        Intent fillInIntent = new Intent();
//        intent.putExtra("xxx", "xxxxxx");

        return intent;
    }
}