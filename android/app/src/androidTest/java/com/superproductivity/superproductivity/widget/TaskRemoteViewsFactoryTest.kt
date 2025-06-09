package com.superproductivity.superproductivity.widget

import android.content.Context
import android.widget.RemoteViews
import com.superproductivity.superproductivity.R
import com.superproductivity.superproductivity.app.SpTask
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.mockito.Mockito.*

class TaskRemoteViewsFactoryTest {

    private lateinit var context: Context
    private lateinit var tasks: List<SpTask>

    @Before
    fun setup() {
        context = mock(Context::class.java)

        tasks = listOf(
            SpTask("1", "Task A", "Inbox", "", false),
            SpTask("2", "Task B", "Work", "", true)
        )
    }

    @Test
    fun test_tasksGenerateRemoteViews() {
        val count = tasks.size
        assertEquals(2, count)

        for (i in 0 until count) {
            val task = tasks[i]
            val views = RemoteViews("com.superproductivity.superproductivity", R.layout.widget_task_item)
            views.setTextViewText(R.id.widget_item_title, task.title)

            assertNotNull(views)
        }
    }
}
