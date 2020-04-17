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

import static android.R.id.text1;
import static android.R.layout.simple_list_item_1;

public class TaskListWidgetDataProvider implements RemoteViewsService.RemoteViewsFactory {

    List<String> myList = new ArrayList<>();
    Context mContext = null;

    public TaskListWidgetDataProvider(Context context, Intent intent) {
        mContext = context;
    }

    @Override
    public void onCreate() {
        initListData();
    }

    @Override
    public void onDataSetChanged() {
        initListData();
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
        RemoteViews view = new RemoteViews(mContext.getPackageName(),
                simple_list_item_1);
        view.setTextViewText(text1, myList.get(position));
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

    private void initListData() {
        Log.v("TaskListWidget", "initListData");
        String jsonStr = TaskListDataService.getInstance().getData();
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
    }
}