package com.superproductivity.superproductivity;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class JavaScriptInterface {
    Context mContext;

    /**
     * Instantiate the interface and set the context
     */
    JavaScriptInterface(Context c) {
        mContext = c;
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("unused")
    @JavascriptInterface
    public void testData(String str) {
        Intent intent = new Intent(TaskListWidget.LIST_CHANGED);
        intent.putExtra("NewString", str);
        Log.v("jsInterface", str);
        mContext.getApplicationContext().sendBroadcast(intent);
    }
}
