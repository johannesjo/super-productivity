package com.superproductivity.superproductivity.app

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner

// AppLifecycleObserver as a Singleton
class AppLifecycleObserver private constructor() : DefaultLifecycleObserver {

    private var _isInForeground: Boolean = false

    val isInForeground: Boolean
        get() = _isInForeground

    override fun onStart(owner: LifecycleOwner) {
        _isInForeground = true
    }

    override fun onStop(owner: LifecycleOwner) {
        _isInForeground = false
    }

    companion object {
        private var instance: AppLifecycleObserver? = null

        fun getInstance(): AppLifecycleObserver {
            if (instance == null) {
                instance = AppLifecycleObserver()
                ProcessLifecycleOwner.get().lifecycle.addObserver(instance!!)
            }
            return instance!!
        }
    }
}

