import { Task } from '../task.model';

export interface AddTaskReminderInterface {
  task: Task;
  initialDateTime?: number;
}
