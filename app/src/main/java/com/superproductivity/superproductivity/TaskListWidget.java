package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.ListView;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Implementation of App Widget functionality.
 */
public class TaskListWidget extends AppWidgetProvider {
    public static final String LIST_CHANGED = "com.superproductivity.superproductivity.LIST_CHANGED";
    String taskJsonStr;
    ArrayList<String> taskList;


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
//            views.setTextViewText(R.id.test_text, taskJsonStr);
//            views.setRemoteAdapter(R.id., new Intent(context, TaskListWidgetService.class));

            parseJSONToList(taskJsonStr);
            views.setTextViewText(R.id.test_text, taskJsonStr);

//            views.setTextViewText(R.id.task_list, taskJsonStr);

//
//            ArrayAdapter<String> adapter = new ArrayAdapter<String>(this,
//                    android.R.layout.simple_list_item_1, android.R.id.text1, taskList);
//
//            // Initialise a listview adapter with the project titles and use it
//            // in the listview to show the list of project.
//            mListView = (ListView) findViewById(R.id.list);
//            ArrayAdapter<String> adapter = new ArrayAdapter<String>(this,
//                    android.R.layout.simple_list_item_1, android.R.id.text1,
//                    taskList.toArray(new String[taskList.size()]));
//
//            mListView.setAdapter(adapter);
//            lv = (ListView) findViewById(R.id.list);

            AppWidgetManager.getInstance(context).updateAppWidget(new ComponentName(context, TaskListWidget.class), views);
        }
    }

    void parseJSONToList(String jsonStr) {
        try {
            JSONArray tasks = new JSONArray(jsonStr);

            // looping through All Contacts
            taskList = new ArrayList<>();
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject c = tasks.getJSONObject(i);
                String title = c.getString("title");
                taskList.add(title);
            }
        } catch (final JSONException e) {
            Log.e("Sup Widget", "Json parsing error: " + e.getMessage());
        }
    }
}

