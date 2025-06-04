package com.superproductivity.superproductivity.widget

import com.superproductivity.superproductivity.app.SpTask
import org.json.JSONArray
import org.junit.Assert.*
import org.junit.Test

class GetTodayTasksTest {

    private val json = """
        [
          {
            "id": "1",
            "title": "Task 1",
            "projectId": "INBOX",
            "isDone": false
          },
          {
            "id": "2",
            "title": "Task 2",
            "projectId": "WORK",
            "isDone": true
          }
        ]
    """.trimIndent()

    @Test
    fun test_parseTasks_parsesJsonCorrectly() {
        val tasks = parseTasks(json)

        assertEquals(2, tasks.size)

        val task1 = tasks[0]
        assertEquals("1", task1.id)
        assertEquals("Task 1", task1.title)
        assertEquals("INBOX", task1.category)
        assertFalse(task1.isDone)

        val task2 = tasks[1]
        assertEquals("2", task2.id)
        assertEquals("Task 2", task2.title)
        assertEquals("WORK", task2.category)
        assertTrue(task2.isDone)
    }

    private fun parseTasks(jsonValue: String): List<SpTask> {
        val array = JSONArray(jsonValue)
        return (0 until array.length()).map { i ->
            val obj = array.getJSONObject(i)
            SpTask(
                id = obj.getString("id"),
                title = obj.getString("title"),
                category = obj.optString("projectId", ""),
                categoryHtml = "",
                isDone = obj.optBoolean("isDone", false)
            )
        }
    }
}
