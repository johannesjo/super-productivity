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

    private List<String> myList = new ArrayList<>();
    private Context mContext = null;

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
        Log.v("TW", "loadListData");
        String jsonStr = null;

        try {
            jsonStr = TaskListDataService.getInstance().getData();
        } catch (Exception e) {
            Log.e("TW", e.toString());
        }

        Log.v("TW", "jsonStr...");

        if (jsonStr != null  && !jsonStr.isEmpty()) {
            Log.v("TW", jsonStr.length() + "");
            Log.v("TW", jsonStr);

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
            Log.d("TW", "No jsonStr data (yet)");
        }
    }
}