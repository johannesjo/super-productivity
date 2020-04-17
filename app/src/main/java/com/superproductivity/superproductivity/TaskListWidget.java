package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;

/**
 * Implementation of App Widget functionality.
 */
public class TaskListWidget extends AppWidgetProvider {
    public static final String LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED";
    String taskJsonStr;

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        // Log.v("TaskListWidget", intent.toString());
        if (intent.getAction().equals(LIST_CHANGED)) {
            taskJsonStr = intent.getStringExtra("taskJson");
            updateView(context);
        }
    }

    void updateView(Context context) {
        if (taskJsonStr != null) {
//            Log.v("TaskListWidget", taskJsonStr);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_list_widget);
            views.setTextViewText(R.id.test_text, taskJsonStr);
            AppWidgetManager.getInstance(context).updateAppWidget(new ComponentName(context, TaskListWidget.class), views);
        }
    }

    void parseJSONToList(String jsonStr) {
        try {
            JSONArray tasks = new JSONArray(jsonStr);

            // looping through All Contacts
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject c = tasks.getJSONObject(i);

                String id = c.getString("id");
                String title = c.getString("title");

                // tmp hash map for single contact
                HashMap<String, String> task = new HashMap<>();

                // adding each child node to HashMap key => value
                task.put("id", id);
                task.put("title", title);

                // adding task to task list
//                taskList.add(task);
            }
        } catch (final JSONException e) {
            Log.e("Sup Widget", "Json parsing error: " + e.getMessage());
        }
    }
}

