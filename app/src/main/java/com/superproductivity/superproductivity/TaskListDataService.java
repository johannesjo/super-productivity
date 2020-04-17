package com.superproductivity.superproductivity;

public class TaskListDataService {
    private String data;

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    private static final TaskListDataService holder = new TaskListDataService();

    public static TaskListDataService getInstance() {
        return holder;
    }
}
