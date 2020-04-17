package com.superproductivity.superproductivity;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.annotation.NonNull;

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

            parseJSONToList(taskJsonStr);
            views.setTextViewText(R.id.test_text, taskJsonStr);

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


    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
                                int appWidgetId) {

        // Construct the RemoteViews object
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.task_list_widget);
        setRemoteAdapter(context, views);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void setRemoteAdapter(Context context, @NonNull final RemoteViews views) {
        views.setRemoteAdapter(R.id.task_list, new Intent(context, TaskListWidgetService.class));
    }


    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}

