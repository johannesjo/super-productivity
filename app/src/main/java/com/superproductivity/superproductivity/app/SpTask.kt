package com.superproductivity.superproductivity.app

data class SpTask(
    val id: String,
    val title: String,
    val category: String,
    val categoryHtml: String,
    val isDone: Boolean
)
