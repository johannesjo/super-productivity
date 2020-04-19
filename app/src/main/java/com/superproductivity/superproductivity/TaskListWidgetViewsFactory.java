package com.superproductivity.superproductivity;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TaskListWidgetViewsFactory implements RemoteViewsService.RemoteViewsFactory {

    List<String> myList = new ArrayList<>();
    Context mContext = null;

    public TaskListWidgetViewsFactory(Context context, Intent intent) {
        mContext = context;
    }

    @Override
    public void onCreate() {
        Log.v("TaskListWidget", "onCreate");
        loadListData();
    }

    @Override
    public void onDataSetChanged() {
        Log.v("TaskListWidget", "onDataSetChanged");
        loadListData();
    }

    @Override
    public void onDestroy() {
    }

    @Override
    public int getCount() {
        return myList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews view = new RemoteViews(mContext.getPackageName(), R.layout.row_layout);

        view.setTextViewText(R.id.firstLine, myList.get(position));

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
        return true;
    }

    private void loadListData() {
        Log.v("TaskListWidget", "loadListData");
        String jsonStr = null;

        try {
            jsonStr = TaskListDataService.getInstance().getData();
        } catch (Exception e) {
            Log.e("TaskListWidget", e.toString());
        }

        Log.v("TaskListWidget", "jsonStr");

        if (jsonStr != null  || !jsonStr.isEmpty()) {
            Log.v("TaskListWidget", jsonStr.length() + "");
            Log.v("TaskListWidget", jsonStr);

            try {
                JSONArray tasks = new JSONArray(jsonStr);
                // looping through All Contacts
                myList.clear();

                for (int i = 0; i < tasks.length(); i++) {
                    JSONObject c = tasks.getJSONObject(i);
                    String title = c.getString("title");
                    myList.add(title);
                }
            } catch (final JSONException e) {
                Log.e("Sup Widget", "Json parsing error: " + e.getMessage());
            }
        } else {
            Log.d("TaskListWidget", "No jsonStr data (yet)");
        }
    }
}