package com.superproductivity.superproductivity;

import android.content.Intent;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class JavaScriptInterface {
    AppCompatActivity mContext;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(AppCompatActivity c) {
        mContext = c;
    }

    void onActivityResult(int requestCode, int resultCode, Intent data) {
        Toast.makeText(mContext, "JavaScriptInterface onActivityResult", Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void updateTaskData(String str) {
        Intent intent = new Intent(mContext.getApplicationContext(), TaskListWidget.class);
        intent.setAction(TaskListWidget.LIST_CHANGED);
        intent.putExtra("taskJson", str);

        TaskListDataService.getInstance().setData(str);
        mContext.sendBroadcast(intent);
    }


    @SuppressWarnings("unused")
    @JavascriptInterface
    public void getGoogleToken() {
        Google g = new Google();
        g.load(mContext);
        g.signIn(mContext);
    }

}
