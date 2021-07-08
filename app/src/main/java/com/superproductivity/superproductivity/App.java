package com.superproductivity.superproductivity;

import android.app.Application;
import android.content.Intent;
import android.widget.Toast;

import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleObserver;
import androidx.lifecycle.OnLifecycleEvent;
import androidx.lifecycle.ProcessLifecycleOwner;

public class App extends Application implements LifecycleObserver {
    @Override
    public void onCreate() {
        super.onCreate();
        ProcessLifecycleOwner.get().getLifecycle().addObserver(this);
    }

//    @OnLifecycleEvent(Lifecycle.Event.ON_RESUME)
//    public void appInResumeState() {
//        Toast.makeText(this, "In Foreground", Toast.LENGTH_LONG).show();
//    }

    @OnLifecycleEvent(Lifecycle.Event.ON_PAUSE)
    public void appInPauseState() {
//        Toast.makeText(this, "In Background", Toast.LENGTH_LONG).show();
        // THIS LIKELY ONLY WORKS WITH BACKGROUND STUFF
        //        startActivity(new Intent("custom.actions.intent.TRIGGER_SYNC"));
//        Intent intent = new Intent(getBaseContext(), FullscreenActivity.class);
//        startActivity(intent);
        //        Intent sendIntent = new Intent();
//        sendIntent.setAction(Intent.ACTION_SEND);
//
//        if (sendIntent.resolveActivity(getPackageManager()) != null) {
//            startActivity(sendIntent);
//        }
    }
}
