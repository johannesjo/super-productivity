import { Task } from '../task';

export interface TasksState extends Array<Task> {
}

export interface TaskSharedState {
  currentTaskId: string;
}

export interface TaskModuleState {
  taskSharedState: TaskSharedState;
  tasks: TasksState;
}
