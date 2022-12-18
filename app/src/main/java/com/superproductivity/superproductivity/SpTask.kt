package com.superproductivity.superproductivity

data class SpTask(
    val id: String,
    val title: String,
    val category: String,
    val categoryHtml: String,
    val isDone: Boolean
)
